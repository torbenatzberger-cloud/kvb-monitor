'use client';

/**
 * Direction Filter Component
 * Multi-Select Button-Gruppe für Richtungsauswahl
 *
 * @param {Array} availableDirections - Verfügbare Richtungen (Strings)
 * @param {Array} selectedDirections - Aktuell ausgewählte Richtungen
 * @param {function} onChange - Callback mit neuen selectedDirections
 * @param {string} accentColor - Accent Color
 */
export default function DirectionFilter({
  availableDirections = [],
  selectedDirections = [],
  onChange,
  accentColor = '#e30613',
}) {
  const allSelected = selectedDirections.length === 0;

  // Toggle "Alle Richtungen"
  const selectAll = () => {
    onChange([]);
  };

  // Toggle einzelne Richtung
  const toggleDirection = (direction) => {
    if (selectedDirections.includes(direction)) {
      // Deselect
      const newDirections = selectedDirections.filter(d => d !== direction);
      onChange(newDirections);
    } else {
      // Select
      onChange([...selectedDirections, direction]);
    }
  };

  const directionBtnStyle = {
    padding: '8px 14px',
    border: '2px solid',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    marginRight: '8px',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    maxWidth: '200px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div>
      {/* "Alle" Button */}
      <button
        onClick={selectAll}
        style={{
          ...directionBtnStyle,
          background: allSelected ? '#fff' : 'transparent',
          borderColor: allSelected ? '#fff' : 'rgba(255,255,255,0.3)',
          color: allSelected ? '#000' : '#fff',
        }}
      >
        Alle
      </button>

      {/* Individual Direction Buttons */}
      {availableDirections.map(direction => {
        const isSelected = selectedDirections.includes(direction);

        return (
          <button
            key={direction}
            onClick={() => toggleDirection(direction)}
            style={{
              ...directionBtnStyle,
              background: isSelected ? accentColor : 'transparent',
              borderColor: accentColor,
              opacity: isSelected ? 1 : 0.5,
            }}
          >
            {direction}
          </button>
        );
      })}
    </div>
  );
}
