export const revalidate = 300; // Cache für 5 Minuten

const STADTBAHN_LINES = ['1', '3', '4', '5', '7', '9', '12', '13', '15', '16', '17', '18'];

export async function GET() {
  const results = {
    tram: [],
    bus: [],
    elevator: [],
    escalator: [],
    timestamp: new Date().toISOString(),
    sources: [],
  };

  // 1. KVB Störungsseite scrapen
  try {
    const kvbResponse = await fetch('https://www.kvb.koeln/app/stoerungen.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 300 },
    });

    if (kvbResponse.ok) {
      // ISO-8859-1 dekodieren für korrekte Umlaute
      const buffer = await kvbResponse.arrayBuffer();
      const html = new TextDecoder('iso-8859-1').decode(buffer);
      
      const linePattern = /Linie\s*(\d+)\s*[:\-–]?\s*([^<\n]{10,300})/gi;
      let match;
      const seen = new Set();
      
      while ((match = linePattern.exec(html)) !== null) {
        const lineNumber = match[1];
        let message = match[2].trim().replace(/<[^>]*>/g, '').trim();
        
        const key = `${lineNumber}-${message.substring(0, 50)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        
        const isTram = STADTBAHN_LINES.includes(lineNumber);
        if (isTram) {
          results.tram.push({ line: lineNumber, message, source: 'kvb-website' });
        } else {
          results.bus.push({ line: lineNumber, message, source: 'kvb-website' });
        }
      }
      results.sources.push('kvb-website');
    }
  } catch (e) {
    console.error('KVB Website error:', e.message);
  }

  // 2. KVB Open Data - Aufzugstörungen
  try {
    const res = await fetch('https://data.webservice-kvb.koeln/service/opendata/aufzugsstoerung/json', { next: { revalidate: 300 } });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const text = new TextDecoder('iso-8859-1').decode(buffer);
      const data = JSON.parse(text);
      for (const feature of (data.features || [])) {
        const props = feature.properties || {};
        const bezeichnung = props.Bezeichnung || '';
        const stationMatch = bezeichnung.match(/\(([^)]+)\)/);
        results.elevator.push({
          id: props.Kennung || 'unknown',
          station: stationMatch ? stationMatch[1] : bezeichnung,
        });
      }
      results.sources.push('kvb-opendata-elevator');
    }
  } catch (e) {
    console.error('Elevator API error:', e.message);
  }

  // 3. KVB Open Data - Fahrtreppenstörungen
  try {
    const res = await fetch('https://data.webservice-kvb.koeln/service/opendata/fahrtreppenstoerung/json', { next: { revalidate: 300 } });
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      const text = new TextDecoder('iso-8859-1').decode(buffer);
      const data = JSON.parse(text);
      for (const feature of (data.features || [])) {
        const props = feature.properties || {};
        const bezeichnung = props.Bezeichnung || '';
        const stationMatch = bezeichnung.match(/\(([^)]+)\)/);
        results.escalator.push({
          id: props.Kennung || 'unknown',
          station: stationMatch ? stationMatch[1] : bezeichnung,
        });
      }
      results.sources.push('kvb-opendata-escalator');
    }
  } catch (e) {
    console.error('Escalator API error:', e.message);
  }

  results.summary = {
    tramDisruptions: results.tram.length,
    busDisruptions: results.bus.length,
    elevatorOutages: results.elevator.length,
    escalatorOutages: results.escalator.length,
    total: results.tram.length + results.bus.length + results.elevator.length + results.escalator.length,
  };

  return Response.json(results);
}
