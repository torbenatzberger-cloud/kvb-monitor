'use client';

/**
 * Map Mode Toggle Component
 *
 * Switches between City View and Line View
 */
export default function MapModeToggle({
  mode,
  onModeChange,
  onClose,
  selectedLine,
  accentColor
}) {
  return (
    <div style={styles.container}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={styles.closeButton}
        title="Karte schließen"
      >
        ✕
      </button>

      {/* Mode toggle buttons */}
      {!selectedLine && (
        <div style={styles.modeButtons}>
          <button
            onClick={() => onModeChange('city')}
            style={{
              ...styles.modeButton,
              ...(mode === 'city' ? { ...styles.modeButtonActive, background: accentColor } : {})
            }}
          >
            🗺️ Übersicht
          </button>
        </div>
      )}

      {/* Line indicator (when in line view) */}
      {selectedLine && (
        <div style={{
          ...styles.lineIndicator,
          background: accentColor
        }}>
          Linie {selectedLine}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 1000,
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s, background 0.2s',
  },
  modeButtons: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    padding: '4px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  modeButton: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  modeButtonActive: {
    color: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  lineIndicator: {
    padding: '8px 16px',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  }
};
