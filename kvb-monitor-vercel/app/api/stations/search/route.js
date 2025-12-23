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

    // VRR EFA gibt stopFinder.points.point zurück
    // point kann ein einzelnes Objekt oder ein Array sein
    if (data.stopFinder && data.stopFinder.points && data.stopFinder.points.point) {
      const points = Array.isArray(data.stopFinder.points.point)
        ? data.stopFinder.points.point
        : [data.stopFinder.points.point];

      stations = points
        .filter(point => point.anyType === 'stop')
        .map(point => ({
          id: point.ref?.id || point.stateless || String(Math.random()),
          name: point.name || 'Unbekannt',
          place: point.ref?.place || point.locality || 'Köln',
        }))
        .slice(0, 10); // Max. 10 Ergebnisse
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
