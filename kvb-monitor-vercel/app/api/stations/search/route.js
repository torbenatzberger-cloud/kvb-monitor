// API Route: /api/stations/search
// VRR EFA STOPFINDER für Köln/VRR-Gebiet

import { NextResponse } from 'next/server';

const EFA_BASE_URL = 'https://efa.vrr.de/vrr/XSLT_STOPFINDER_REQUEST';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // Validierung
  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // VRR EFA STOPFINDER API
    const efaParams = new URLSearchParams({
      outputFormat: 'JSON',
      locationServerActive: '1',
      type_sf: 'stop',  // Nur Haltestellen
      name_sf: query,
      coordOutputFormat: 'WGS84[dd.ddddd]',
    });

    const response = await fetch(`${EFA_BASE_URL}?${efaParams}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`EFA API returned ${response.status}`);
    }

    const data = await response.json();

    // Transformiere Response
    let stations = [];

    // VRR EFA gibt unterschiedliche Strukturen zurück:
    // - Mehrere Ergebnisse: stopFinder.points ist Array
    // - Ein Ergebnis: stopFinder.points.point ist Objekt
    if (data.stopFinder && data.stopFinder.points) {
      let points = [];

      if (Array.isArray(data.stopFinder.points)) {
        // Mehrere Ergebnisse: points ist direkt ein Array
        points = data.stopFinder.points;
      } else if (data.stopFinder.points.point) {
        // Ein Ergebnis: points.point ist ein einzelnes Objekt
        points = [data.stopFinder.points.point];
      }

      stations = points
        .filter(point => point.type === 'stop')
        .filter(point => {
          // Erweiterte Filterlogik für Köln-Ergebnisse
          const place = (point.ref?.place || '').toLowerCase();
          const name = (point.name || '').toLowerCase();

          // Akzeptiere wenn:
          // 1. place ist genau "köln"
          // 2. place startet mit "köln" (z.B. "Köln-Nippes")
          // 3. name enthält "köln" (z.B. "Köln Hbf")
          return place === 'köln' ||
                 place.startsWith('köln') ||
                 name.includes('köln');
        })
        .map(point => ({
          id: point.ref?.id || point.stateless || String(Math.random()),
          name: point.name || 'Unbekannt',
          place: point.ref?.place || 'Köln',
        }))
        .slice(0, 15); // Max. 15 Ergebnisse (erhöht von 10)
    }

    // Debug-Logging (nur in Development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Search "${query}": ${stations.length} results`);
    }

    return NextResponse.json({
      success: true,
      query,
      stations,
      count: stations.length,
    });

  } catch (error) {
    console.error('Station search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stations: []
      },
      { status: 500 }
    );
  }
}
