/**
 * Linie 5 Konfiguration
 * Stationen in korrekter Reihenfolge: Butzweilerhof → Heumarkt
 */

export const LINE_5_COLOR = '#00963f';

export const LINE_5_STOPS = [
  { id: '22000903', name: 'Sparkasse Am Butzweilerhof', short: 'Butzweilerhof' },
  { id: '22000904', name: 'IKEA Am Butzweilerhof', short: 'IKEA' },
  { id: '22000905', name: 'Alter Flughafen Butzweilerhof', short: 'Alter Flughafen' },
  { id: '22000242', name: 'Rektor-Klein-Str.', short: 'Rektor-Klein' },
  { id: '22000241', name: 'Margaretastr.', short: 'Margaretastr.' },
  { id: '22000240', name: 'Iltisstr.', short: 'Iltisstr.' },
  { id: '22000245', name: 'Lenauplatz', short: 'Lenauplatz' },
  { id: '22000244', name: 'Subbelrather Str./Gürtel', short: 'Subbelrather' },
  { id: '22000243', name: 'Nußbaumerstr.', short: 'Nußbaumer' },
  { id: '22000239', name: 'Liebigstr.', short: 'Liebigstr.' },
  { id: '22000238', name: 'Gutenbergstr.', short: 'Gutenberg' },
  { id: '22000024', name: 'Hans-Böckler-Platz/Bf West', short: 'Hans-Böckler' },
  { id: '22000030', name: 'Friesenplatz', short: 'Friesenplatz' },
  { id: '22000029', name: 'Appellhofplatz', short: 'Appellhof' },
  { id: '22000001', name: 'Heumarkt', short: 'Heumarkt' },
];

// Reisezeiten zwischen Stationen in Sekunden (geschätzt)
export const LINE_5_SEGMENTS = [
  { from: 0, to: 1, travelTime: 90 },   // Butzweilerhof → IKEA
  { from: 1, to: 2, travelTime: 90 },   // IKEA → Alter Flughafen
  { from: 2, to: 3, travelTime: 120 },  // Alter Flughafen → Rektor-Klein
  { from: 3, to: 4, travelTime: 90 },   // Rektor-Klein → Margaretastr.
  { from: 4, to: 5, travelTime: 90 },   // Margaretastr. → Iltisstr.
  { from: 5, to: 6, travelTime: 120 },  // Iltisstr. → Lenauplatz
  { from: 6, to: 7, travelTime: 90 },   // Lenauplatz → Subbelrather
  { from: 7, to: 8, travelTime: 60 },   // Subbelrather → Nußbaumer
  { from: 8, to: 9, travelTime: 90 },   // Nußbaumer → Liebigstr.
  { from: 9, to: 10, travelTime: 60 },  // Liebigstr. → Gutenberg
  { from: 10, to: 11, travelTime: 120 }, // Gutenberg → Hans-Böckler
  { from: 11, to: 12, travelTime: 90 },  // Hans-Böckler → Friesenplatz
  { from: 12, to: 13, travelTime: 90 },  // Friesenplatz → Appellhof
  { from: 13, to: 14, travelTime: 120 }, // Appellhof → Heumarkt
];

// Gesamte Fahrzeit in Sekunden
export const LINE_5_TOTAL_TIME = LINE_5_SEGMENTS.reduce((sum, seg) => sum + seg.travelTime, 0);

// Endstationen
export const LINE_5_TERMINALS = {
  ossendorf: { index: 0, name: 'Butzweilerhof', direction: 'Ossendorf' },
  heumarkt: { index: 14, name: 'Heumarkt', direction: 'Heumarkt' },
};

/**
 * Finde den Index einer Station in der Linie 5
 */
export function getStopIndex(stopId) {
  return LINE_5_STOPS.findIndex(s => s.id === stopId);
}

/**
 * Prüfe ob eine Station auf Linie 5 liegt
 */
export function isLine5Stop(stopId) {
  return getStopIndex(stopId) !== -1;
}

/**
 * Berechne kumulative Reisezeit bis zu einer Station
 */
export function getCumulativeTime(stopIndex) {
  let time = 0;
  for (let i = 0; i < stopIndex && i < LINE_5_SEGMENTS.length; i++) {
    time += LINE_5_SEGMENTS[i].travelTime;
  }
  return time;
}
