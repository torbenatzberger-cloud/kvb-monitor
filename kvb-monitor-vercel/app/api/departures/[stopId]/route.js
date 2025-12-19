// API Route: /api/departures/[stopId]
// Proxy zur VRR EFA API

const EFA_BASE_URL = 'https://efa.vrr.de/vrrstd/XSLT_DM_REQUEST';

const LINE_COLORS = {
  '1': '#ed1c24', '3': '#009fe3', '4': '#f39200', '5': '#00963f',
  '7': '#e6007e', '9': '#c60c30', '12': '#a05e9e', '13': '#7fb6d9',
  '15': '#95c11f', '16': '#009fe3', '17': '#00963f', '18': '#009fe3',
};

function getLineColor(line) {
  const clean = String(line).replace(/\s+/g, '');
  if (LINE_COLORS[clean]) return LINE_COLORS[clean];
  if (clean.startsWith('S')) return '#00843d';
  if (/^\d+$/.test(clean)) return '#009fe3';
  return '#666666';
}

function fixEncoding(text) {
  if (!text) return text;
  try {
    if (text.includes('Ã¶') || text.includes('Ã¼') || text.includes('Ã¤') || text.includes('Ã')) {
      const bytes = new Uint8Array([...text].map(c => c.charCodeAt(0)));
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch (e) {}
  return text;
}

export async function GET(request, { params }) {
  const stopId = params.stopId;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const efaParams = new URLSearchParams({
      outputFormat: 'JSON',
      language: 'de',
      stateless: '1',
      type_dm: 'stop',
      name_dm: stopId,
      mode: 'direct',
      useRealtime: '1',
      limit: String(limit),
      ptOptionsActive: '1',
      mergeDep: '1',
      maxTimeLoop: '5',
    });

    const response = await fetch(`${EFA_BASE_URL}?${efaParams}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(`EFA API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.departureList || data.departureList.length === 0) {
      return Response.json({
        success: true,
        stopId,
        timestamp: new Date().toISOString(),
        departures: [],
      });
    }

    const departures = [];

    for (let idx = 0; idx < data.departureList.length; idx++) {
      const dep = data.departureList[idx];
      
      try {
        const servingLine = dep.servingLine || {};
        const plannedDt = dep.dateTime || {};
        const realtimeDt = dep.realDateTime || plannedDt;

        const plannedHour = parseInt(plannedDt.hour) || 0;
        const plannedMinute = parseInt(plannedDt.minute) || 0;
        const realtimeHour = parseInt(realtimeDt.hour) || 0;
        const realtimeMinute = parseInt(realtimeDt.minute) || 0;

        const plannedTotal = plannedHour * 60 + plannedMinute;
        const realtimeTotal = realtimeHour * 60 + realtimeMinute;
        const delay = realtimeTotal - plannedTotal;

        const line = servingLine.number || '?';
        const directionRaw = servingLine.direction || servingLine.destStop || 'Unbekannt';
        const direction = fixEncoding(directionRaw);
        
        // MOT-Typ für Frontend-Filterung
        const motType = servingLine.motType;

        departures.push({
          id: `${line}-${idx}-${plannedHour}-${plannedMinute}`,
          line,
          direction,
          plannedTimeFormatted: `${String(plannedHour).padStart(2, '0')}:${String(plannedMinute).padStart(2, '0')}`,
          realtimeTimeFormatted: `${String(realtimeHour).padStart(2, '0')}:${String(realtimeMinute).padStart(2, '0')}`,
          realtimeHour,
          realtimeMinute,
          delay: delay > 0 ? delay : 0,
          platform: dep.platform || dep.pointName || '',
          isRealtime: !!dep.realDateTime,
          color: getLineColor(line),
          motType,
        });
      } catch (e) {
        console.error(`Error parsing departure ${idx}:`, e);
      }
    }

    return Response.json({
      success: true,
      stopId,
      timestamp: new Date().toISOString(),
      departures,
      totalFromApi: data.departureList.length,
    });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
