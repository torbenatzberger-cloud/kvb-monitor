// app/api/muenchen/departures/[stationId]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { stationId } = await params;
  
  try {
    // MVG API v3 - Erhöhtes Limit für mehr Ergebnisse
    const url = `https://www.mvg.de/api/bgw-pt/v3/departures?globalId=${encodeURIComponent(stationId)}&limit=200&offsetInMinutes=0`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MVGMonitor/1.0)',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`MVG API error: ${response.status}`);
    }

    const data = await response.json();

    // Transformiere MVG-Daten in unser Format (wie KVB)
    const departures = data
      .map(dep => {
        // Zeiten parsen
        const plannedTime = new Date(dep.plannedDepartureTime);
        const realtimeTime = dep.realtimeDepartureTime 
          ? new Date(dep.realtimeDepartureTime) 
          : plannedTime;
        
        // Verspätung in Minuten
        const delay = dep.delayInMinutes || 0;
        
        // Linie formatieren
        let line = dep.label;
        if (dep.transportType === 'UBAHN') {
          line = `U${dep.label.replace('U', '')}`;
        } else if (dep.transportType === 'SBAHN') {
          line = `S${dep.label.replace('S', '')}`;
        }
        
        return {
          line,
          direction: dep.destination,
          plannedHour: plannedTime.getHours(),
          plannedMinute: plannedTime.getMinutes(),
          plannedTimeFormatted: plannedTime.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          realtimeHour: realtimeTime.getHours(),
          realtimeMinute: realtimeTime.getMinutes(),
          realtimeTimeFormatted: realtimeTime.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          delay,
          platform: dep.platform || null,
          cancelled: dep.cancelled || false,
          transportType: dep.transportType,
        };
      });
    
    return NextResponse.json({
      success: true,
      station: stationId,
      departures,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('MVG API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        departures: [] 
      },
      { status: 500 }
    );
  }
}
