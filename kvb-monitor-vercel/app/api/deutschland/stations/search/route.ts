// API Route: /api/deutschland/stations/search
// db.transport.rest API für ganz Deutschland
// Mit In-Memory-Cache um Rate Limits zu vermeiden

import { NextResponse } from 'next/server';

const DB_API_BASE = 'https://v6.db.transport.rest';

// In-Memory Cache für Suchergebnisse
interface CacheEntry {
  data: any;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten Cache für Suchergebnisse (ändern sich selten)
const MAX_CACHE_SIZE = 200;

// Rate Limit Tracking (geteilt mit departures)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 600; // 600ms zwischen Anfragen

function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(searchCache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL * 2) {
      searchCache.delete(key);
    }
  }
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, searchCache.size - MAX_CACHE_SIZE + 20);
    toDelete.forEach(([key]) => searchCache.delete(key));
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  // Normalisiere Query für Cache-Key
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `search-${normalizedQuery}`;

  // Check Cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      ...cached.data,
      cached: true,
      cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
    });
  }

  try {
    cleanupCache();

    const url = `${DB_API_BASE}/locations?query=${encodeURIComponent(query)}&results=15&stops=true&addresses=false&poi=false`;

    const response = await fetchWithRateLimit(url);

    if (!response.ok) {
      // Bei Rate Limit, cached Daten zurückgeben wenn vorhanden
      if (response.status === 429 && cached) {
        console.warn('Search rate limited, returning stale cache');
        return NextResponse.json({
          ...cached.data,
          cached: true,
          stale: true,
        });
      }
      throw new Error(`DB API returned ${response.status}`);
    }

    const data = await response.json();

    // Transformiere Response - filtere auf Stationen/Stops
    const stations = data
      .filter((loc: any) => loc.type === 'station' || loc.type === 'stop')
      .map((loc: any) => ({
        id: loc.id,
        name: loc.name || 'Unbekannt',
        place: loc.address?.city || extractCity(loc.name) || '',
        latitude: loc.location?.latitude,
        longitude: loc.location?.longitude,
        products: loc.products || {},
      }))
      .slice(0, 10);

    const result = {
      success: true,
      query,
      stations,
      count: stations.length,
    };

    // Cache speichern
    searchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      ...result,
      cached: false,
    });

  } catch (error) {
    console.error('DB station search error:', error);

    // Bei Fehler, cached Daten zurückgeben wenn vorhanden
    if (cached) {
      console.warn('Search error, returning stale cache');
      return NextResponse.json({
        ...cached.data,
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stations: []
      },
      { status: 500 }
    );
  }
}

// Hilfsfunktion: Stadt aus Stationsname extrahieren
function extractCity(name: string): string {
  if (!name) return '';

  // Format: "Stadt Bahnhof" oder "Bahnhof, Stadt"
  if (name.includes(',')) {
    return name.split(',').pop()?.trim() || '';
  }

  // Bekannte Städte-Präfixe
  const cityPrefixes = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover', 'Nürnberg', 'Bremen', 'Essen', 'Dortmund', 'Duisburg'];

  for (const city of cityPrefixes) {
    if (name.startsWith(city)) {
      return city;
    }
  }

  return '';
}
