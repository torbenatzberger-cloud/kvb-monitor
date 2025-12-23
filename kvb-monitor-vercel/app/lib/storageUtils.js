// localStorage Utility Functions mit Migration Support

/**
 * Speichert Settings in localStorage
 */
export function saveSettings(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('localStorage save error:', e);
  }
}

/**
 * Lädt Settings aus localStorage mit Defaults
 */
export function loadSettings(key, defaults = {}) {
  if (typeof window === 'undefined') return defaults;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('localStorage load error:', e);
  }
  return defaults;
}

/**
 * Migriert Settings von einem alten Key zu einem neuen
 * @param {string} oldKey - Alter localStorage Key
 * @param {string} newKey - Neuer localStorage Key
 * @param {function} transformer - Funktion zur Transformation der Daten
 */
export function migrateSettings(oldKey, newKey, transformer) {
  if (typeof window === 'undefined') return null;

  try {
    const oldData = loadSettings(oldKey);

    if (oldData && Object.keys(oldData).length > 0) {
      const newData = transformer(oldData);
      saveSettings(newKey, newData);
      return newData;
    }
  } catch (e) {
    console.error('Settings migration error:', e);
  }

  return null;
}

/**
 * Fügt eine Recent Search hinzu
 * @param {string} key - localStorage Key für Recent Searches
 * @param {object} station - Station Object { id, name, place }
 * @param {number} maxItems - Maximale Anzahl gespeicherter Searches
 */
export function addRecentSearch(key, station, maxItems = 5) {
  if (typeof window === 'undefined') return;

  try {
    const data = loadSettings(key, { searches: [] });
    const searches = Array.isArray(data.searches) ? data.searches : [];

    // Entferne Duplikate (gleiche ID)
    const filtered = searches.filter(s => s.id !== station.id);

    // Füge neuen Search an den Anfang hinzu
    const updated = [
      { ...station, timestamp: Date.now() },
      ...filtered
    ].slice(0, maxItems); // Limitiere auf maxItems

    saveSettings(key, { searches: updated });
  } catch (e) {
    console.error('Add recent search error:', e);
  }
}

/**
 * Holt Recent Searches aus localStorage
 * @param {string} key - localStorage Key
 * @returns {Array} Array von Station Objects
 */
export function getRecentSearches(key) {
  if (typeof window === 'undefined') return [];

  try {
    const data = loadSettings(key, { searches: [] });
    return Array.isArray(data.searches) ? data.searches : [];
  } catch (e) {
    console.error('Get recent searches error:', e);
    return [];
  }
}

/**
 * Löscht alle Recent Searches
 */
export function clearRecentSearches(key) {
  if (typeof window === 'undefined') return;
  saveSettings(key, { searches: [] });
}
