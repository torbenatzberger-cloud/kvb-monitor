// Utility Functions für Haltestellen und Richtungen

/**
 * Debounce-Funktion für Autocomplete
 * Verzögert die Ausführung einer Funktion bis nach einer bestimmten Wartezeit
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Normalisiert Richtungsnamen
 * Entfernt Stadt-Präfixe und behandelt Sonderfälle
 */
export function normalizeDirection(direction, city = 'Köln') {
  if (!direction) return '';

  let normalized = direction.trim();

  // Entferne Stadt-Präfix (z.B. "Köln " oder "München ")
  normalized = normalized.replace(new RegExp(`^${city}\\s+`, 'i'), '');

  // Spezielle Fälle für Köln
  if (city === 'Köln') {
    if (normalized.includes('Sparkasse Am Butzweilerhof')) {
      return 'Butzweilerhof';
    }
    if (normalized.includes('Ossendorf')) {
      return 'Butzweilerhof';
    }
  }

  return normalized;
}

/**
 * Extrahiert unique Richtungen aus Abfahrten
 * Gruppiert und normalisiert Richtungsnamen
 */
export function extractDirections(departures, city = 'Köln') {
  if (!departures || departures.length === 0) {
    return [];
  }

  const directionSet = new Set();

  departures.forEach(dep => {
    if (dep.direction) {
      const normalized = normalizeDirection(dep.direction, city);
      if (normalized) {
        directionSet.add(normalized);
      }
    }
  });

  return Array.from(directionSet).sort();
}

/**
 * Verkürzt Richtungsnamen für UI-Anzeige
 * (Aus page.js übernommen)
 */
export function getShortDirection(direction) {
  let short = direction.replace(/^Köln\s+/i, '');
  if (short.includes('Sparkasse Am Butzweilerhof')) return 'Butzweilerhof';
  if (short.includes('Ossendorf')) return 'Butzweilerhof';
  return short;
}
