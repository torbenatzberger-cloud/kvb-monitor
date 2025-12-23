// API Route: /api/muenchen/disruptions
// MVG Störungsmeldungen

export const revalidate = 300; // Cache für 5 Minuten

const MVG_LINES = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8'];
const TRAM_LINES = ['12', '15', '16', '17', '18', '19', '20', '21', '22', '23', '25', '27', '28', 'N17', 'N19', 'N20', 'N27'];
const SBAHN_LINES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

export async function GET() {
  const results = {
    ubahn: [],
    tram: [],
    sbahn: [],
    bus: [],
    elevator: [],
    timestamp: new Date().toISOString(),
    sources: [],
  };

  try {
    // MVG Notifications API
    const response = await fetch('https://www.mvg.de/api/bgw-pt/v3/notifications', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; MVGMonitor/1.0)',
      },
      next: { revalidate: 300 },
    });

    if (response.ok) {
      const data = await response.json();

      // MVG API liefert Notifications mit verschiedenen Types
      for (const notification of (data || [])) {
        const title = notification.title || '';
        const description = notification.description || '';
        const message = description || title;
        const type = notification.type || '';

        // Check if it's a line disruption
        const lineMatch = message.match(/\b(U\d|S\d{1,2}|Tram\s*\d+|\d{1,3})\b/i);

        if (lineMatch) {
          const line = lineMatch[1].toUpperCase().replace('TRAM ', '');

          // Categorize by line type
          if (MVG_LINES.includes(line)) {
            results.ubahn.push({ line, message, source: 'mvg-api' });
          } else if (TRAM_LINES.includes(line) || TRAM_LINES.includes(line.replace(/^0/, ''))) {
            results.tram.push({ line, message, source: 'mvg-api' });
          } else if (SBAHN_LINES.includes(line)) {
            results.sbahn.push({ line, message, source: 'mvg-api' });
          } else {
            results.bus.push({ line, message, source: 'mvg-api' });
          }
        } else if (type.toLowerCase().includes('elevator') || message.toLowerCase().includes('aufzug')) {
          // Extract station name from elevator disruption
          const stationMatch = message.match(/(?:Station|Bahnhof|Haltestelle)?\s*([A-ZÄÖÜ][a-zäöüß\-\s]+(?:platz|straße|tor|bahnhof)?)/i);
          if (stationMatch) {
            results.elevator.push({
              id: `mvg-${Date.now()}-${Math.random()}`,
              station: stationMatch[1].trim(),
              message,
            });
          }
        }
      }

      results.sources.push('mvg-api');
    }
  } catch (e) {
    console.error('MVG Notifications API error:', e.message);
  }

  results.summary = {
    ubahnDisruptions: results.ubahn.length,
    tramDisruptions: results.tram.length,
    sbahnDisruptions: results.sbahn.length,
    busDisruptions: results.bus.length,
    elevatorOutages: results.elevator.length,
    total: results.ubahn.length + results.tram.length + results.sbahn.length + results.bus.length + results.elevator.length,
  };

  return Response.json(results);
}
