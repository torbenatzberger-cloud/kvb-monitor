// API Route: /api/deutschland/departures/[stationId]
// db.transport.rest API für Abfahrten in ganz Deutschland
// Mit In-Memory-Cache um Rate Limits zu vermeiden

import { NextResponse } from 'next/server';

const DB_API_BASE = 'https://v6.db.transport.rest';

// In-Memory Cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 Sekunden Cache
const MAX_CACHE_SIZE = 100; // Maximal 100 Einträge

// Rate Limit Tracking
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 600; // Mindestens 600ms zwischen Anfragen (100/min = 1 pro 600ms)

interface RouteParams {
  params: Promise<{ stationId: string }>;
}

function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL * 2) {
      cache.delete(key);
    }
  }
  // Wenn Cache zu groß, älteste Einträge entfernen
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE + 10);
    toDelete.forEach(([key]) => cache.delete(key));
  }
}

async function fetchWithRateLimit(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }

  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; TransitMonitor/1.0)',
    },
  });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { stationId } = await params;
  const { searchParams } = new URL(request.url);
  const duration = searchParams.get('duration') || '60';

  const cacheKey = `departures-${stationId}-${duration}`;

  // Check Cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
    });
  }

  try {
    // Cleanup alte Cache-Einträge
    cleanupCache();

    const url = `${DB_API_BASE}/stops/${encodeURIComponent(stationId)}/departures?duration=${duration}&results=300`;

    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      // Bei Rate Limit, cached Daten zurückgeben wenn vorhanden
      if (response.status === 429 && cached) {
        console.warn('Rate limited, returning stale cache');
        return NextResponse.json({
          ...cached.data,
          cached: true,
          stale: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
        });
      }
      throw new Error(`DB API error: ${response.status}`);
    }

    const data = await response.json();

    // API kann entweder { departures: [...] } oder direkt [...] zurückgeben
    const rawDepartures = Array.isArray(data) ? data : (data.departures || []);

    // Transformiere db.transport.rest Daten in unser Format
    const departures = rawDepartures
      .filter((dep: any) => dep.when || dep.plannedWhen)
      .map((dep: any) => {
        const plannedTime = new Date(dep.plannedWhen);
        const realtimeTime = dep.when ? new Date(dep.when) : plannedTime;

        // Verspätung in Minuten (API liefert Sekunden)
        const delay = dep.delay ? Math.round(dep.delay / 60) : 0;

        // Linie formatieren
        const line = dep.line?.name || dep.line?.fahrtNr || 'Unbekannt';

        // Transport-Typ bestimmen
        const transportType = mapProductToType(dep.line?.product, dep.line?.productName);

        return {
          line,
          direction: dep.direction || dep.destination?.name || 'Unbekannt',
          // Send ISO timestamps for client-side time calculation
          plannedWhen: dep.plannedWhen,
          realtimeWhen: dep.when || dep.plannedWhen,
          delay,
          platform: dep.platform || null,
          cancelled: dep.cancelled || false,
          transportType,
          product: dep.line?.product,
          operator: dep.line?.operator?.name || null,
        };
      });

    const result = {
      success: true,
      station: stationId,
      departures,
      timestamp: new Date().toISOString(),
    };

    // Cache speichern
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      ...result,
      cached: false,
    });

  } catch (error) {
    console.error('DB API Error:', error);

    // Bei Fehler, cached Daten zurückgeben wenn vorhanden
    if (cached) {
      console.warn('Error occurred, returning stale cache');
      return NextResponse.json({
        ...cached.data,
        cached: true,
        stale: true,
        error: 'Using cached data due to API error',
        cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        departures: []
      },
      { status: 500 }
    );
  }
}

// Mappe db.transport.rest Produkte zu unseren Typen
function mapProductToType(product: string | undefined, productName: string | undefined): string {
  if (!product) return 'UNKNOWN';

  const productLower = product.toLowerCase();

  if (productLower === 'nationalexpress' || productLower === 'national') {
    return 'ICE';
  }
  if (productLower === 'regionalexpress' || productLower === 'regional') {
    return 'REGIONAL';
  }
  if (productLower === 'suburban') {
    return 'SBAHN';
  }
  if (productLower === 'subway') {
    return 'UBAHN';
  }
  if (productLower === 'tram') {
    return 'TRAM';
  }
  if (productLower === 'bus') {
    return 'BUS';
  }
  if (productLower === 'ferry') {
    return 'FERRY';
  }

  return 'OTHER';
}
