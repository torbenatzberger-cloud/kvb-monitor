'use client';

/**
 * Direction Filter Component
 * Multi-Select Checkbox-Liste für Richtungsauswahl
 *
 * @param {Array} availableDirections - Verfügbare Richtungen (Strings)
 * @param {Array} selectedDirections - Aktuell ausgewählte Richtungen
 * @param {function} onChange - Callback mit neuen selectedDirections
 * @param {Array} departures - Abfahrten für Anzahl-Anzeige
 * @param {string} accentColor - Accent Color
 */
export default function DirectionFilter({
  availableDirections = [],
  selectedDirections = [],
  onChange,
  departures = [],
  accentColor = '#e30613',
}) {
  const allSelected = selectedDirections.length === 0;

  // Toggle "Alle Richtungen"
  const toggleAll = () => {
    onChange([]);
  };

  // Toggle einzelne Richtung
  const toggleDirection = (direction) => {
    if (selectedDirections.includes(direction)) {
      // Deselect
      onChange(selectedDirections.filter(d => d !== direction));
    } else {
      // Select
      onChange([...selectedDirections, direction]);
    }
  };

  // Zähle Abfahrten pro Richtung
  const countForDirection = (direction) => {
    return departures.filter(dep => {
      if (!dep.direction) return false;
      const depDir = dep.direction.toLowerCase();
      const searchDir = direction.toLowerCase();
      return depDir.includes(searchDir);
    }).length;
  };

  return (
    <div>
      {/* "Alle Richtungen" Button */}
      <button
        onClick={toggleAll}
        style={{
          padding: '10px 16px',
          border: '2px solid',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '8px',
          width: '100%',
          background: allSelected ? accentColor : 'rgba(255,255,255,0.1)',
          borderColor: allSelected ? accentColor : 'rgba(255,255,255,0.2)',
          color: '#fff',
          transition: 'all 0.2s ease',
        }}
      >
        ✓ Alle Richtungen
      </button>

      {/* Individual Direction Checkboxes */}
      {availableDirections.length > 0 && (
        <div style={{
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '8px',
        }}>
          {availableDirections.map(direction => {
            const isSelected = selectedDirections.includes(direction);
            const count = countForDirection(direction);

            return (
              <label
                key={direction}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  background: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleDirection(direction)}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '12px',
                    cursor: 'pointer',
                    accentColor: accentColor,
                  }}
                />

                {/* Direction Name */}
                <span style={{
                  flex: 1,
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 400,
                }}>
                  {direction}
                </span>

                {/* Count Badge */}
                {count > 0 && (
                  <span style={{
                    fontSize: '11px',
                    opacity: 0.6,
                    background: 'rgba(255,255,255,0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    marginLeft: '8px',
                  }}>
                    {count} Bahn{count !== 1 ? 'en' : ''}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Info wenn keine Richtungen verfügbar */}
      {availableDirections.length === 0 && (
        <div style={{
          padding: '12px',
          textAlign: 'center',
          fontSize: '13px',
          opacity: 0.6,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
        }}>
          Keine Richtungen verfügbar. Wähle zuerst eine Haltestelle und Linien.
        </div>
      )}

      {/* Selected Count Badge */}
      {selectedDirections.length > 0 && availableDirections.length > 0 && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          textAlign: 'center',
          opacity: 0.6,
        }}>
          {selectedDirections.length} von {availableDirections.length} Richtung{availableDirections.length !== 1 ? 'en' : ''} ausgewählt
        </div>
      )}
    </div>
  );
}
