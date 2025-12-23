// API Route: /api/muenchen/stations/search
// MVG Locations API für München

import { NextResponse } from 'next/server';

const MVG_BASE_URL = 'https://www.mvg.de/api/bgw-pt/v3/locations';

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
    // MVG Locations API
    const url = `${MVG_BASE_URL}?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MVGMonitor/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`MVG API returned ${response.status}`);
    }

    const data = await response.json();

    // Transformiere Response
    let stations = [];

    if (Array.isArray(data)) {
      stations = data
        .filter(loc => loc.type === 'STATION')
        .map(loc => ({
          id: loc.globalId,
          name: loc.name || 'Unbekannt',
          place: loc.place || 'München',
          latitude: loc.latitude,
          longitude: loc.longitude,
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
    console.error('MVG station search error:', error);
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
