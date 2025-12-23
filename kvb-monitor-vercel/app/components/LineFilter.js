'use client';

/**
 * Line Filter Component
 * Multi-Select Button-Gruppe für Linienauswahl
 * Extrahiert aus page.js für Wiederverwendbarkeit
 *
 * @param {Array} availableLines - Verfügbare Linien (Strings)
 * @param {Array} selectedLines - Aktuell ausgewählte Linien
 * @param {function} onChange - Callback mit neuen selectedLines
 * @param {function} getLineColor - Funktion zur Farbzuordnung
 */
export default function LineFilter({
  availableLines = [],
  selectedLines = [],
  onChange,
  getLineColor = () => '#666666',
}) {
  const allSelected = selectedLines.length === 0;

  // Toggle "Alle"
  const selectAll = () => {
    onChange([]);
  };

  // Toggle einzelne Linie
  const toggleLine = (line) => {
    if (selectedLines.includes(line)) {
      // Deselect
      const newLines = selectedLines.filter(l => l !== line);
      onChange(newLines);
    } else {
      // Select
      onChange([...selectedLines, line]);
    }
  };

  const lineFilterBtnStyle = {
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
  };

  return (
    <div>
      {/* "Alle" Button */}
      <button
        onClick={selectAll}
        style={{
          ...lineFilterBtnStyle,
          background: allSelected ? '#fff' : 'transparent',
          borderColor: allSelected ? '#fff' : 'rgba(255,255,255,0.3)',
          color: allSelected ? '#000' : '#fff',
        }}
      >
        Alle
      </button>

      {/* Individual Line Buttons */}
      {availableLines.map(line => {
        const isSelected = selectedLines.includes(line);
        const color = getLineColor(line);

        return (
          <button
            key={line}
            onClick={() => toggleLine(line)}
            style={{
              ...lineFilterBtnStyle,
              background: isSelected ? color : 'transparent',
              borderColor: color,
              opacity: isSelected ? 1 : 0.5,
            }}
          >
            {line}
          </button>
        );
      })}
    </div>
  );
}
