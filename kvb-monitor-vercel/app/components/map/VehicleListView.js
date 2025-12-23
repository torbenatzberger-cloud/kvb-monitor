'use client';

/**
 * Simple Vehicle List View
 *
 * Shows vehicles as a list/table without map complexity
 */
export default function VehicleListView({
  vehicles,
  gtfsData,
  selectedLines,
  accentColor
}) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>🚊</p>
          <p style={styles.emptyText}>Keine Fahrzeuge gefunden</p>
          <p style={styles.emptyHint}>
            Warte auf Live-Abfahrten oder wähle eine andere Station
          </p>
        </div>
      </div>
    );
  }

  // Group vehicles by line
  const vehiclesByLine = vehicles.reduce((acc, vehicle) => {
    if (!acc[vehicle.line]) {
      acc[vehicle.line] = [];
    }
    acc[vehicle.line].push(vehicle);
    return acc;
  }, {});

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🚊 Live-Fahrzeuge</h3>
        <p style={styles.subtitle}>
          {vehicles.length} Fahrzeug{vehicles.length !== 1 ? 'e' : ''} auf {Object.keys(vehiclesByLine).length} Linie{Object.keys(vehiclesByLine).length !== 1 ? 'n' : ''}
        </p>
      </div>

      {Object.entries(vehiclesByLine).map(([lineId, lineVehicles]) => {
        const route = gtfsData.routes?.[lineId];
        const lineColor = route?.color || accentColor;

        return (
          <div key={lineId} style={styles.lineSection}>
            <div style={{...styles.lineHeader, background: lineColor}}>
              <span style={styles.lineBadge}>Linie {lineId}</span>
              <span style={styles.lineCount}>
                {lineVehicles.length} Fahrzeug{lineVehicles.length !== 1 ? 'e' : ''}
              </span>
            </div>

            <div style={styles.vehicleList}>
              {lineVehicles.map((vehicle, idx) => (
                <div key={idx} style={styles.vehicleCard}>
                  <div style={styles.vehicleIcon}>
                    <div style={{
                      ...styles.iconCircle,
                      background: lineColor,
                      transform: `rotate(${vehicle.bearing || 0}deg)`
                    }}>
                      🚊
                    </div>
                  </div>

                  <div style={styles.vehicleInfo}>
                    <div style={styles.vehicleDirection}>
                      → {vehicle.direction}
                    </div>

                    {vehicle.segment && (
                      <div style={styles.vehicleSegment}>
                        <span style={styles.segmentLabel}>Zwischen:</span>
                        <span style={styles.segmentStops}>
                          {gtfsData.stops?.[vehicle.segment.from]?.name || vehicle.segment.from}
                          {' → '}
                          {gtfsData.stops?.[vehicle.segment.to]?.name || vehicle.segment.to}
                        </span>
                      </div>
                    )}

                    <div style={styles.vehicleStats}>
                      <div style={styles.stat}>
                        <span style={styles.statLabel}>Fortschritt:</span>
                        <div style={styles.progressBar}>
                          <div style={{
                            ...styles.progressFill,
                            width: `${(vehicle.progress || 0) * 100}%`,
                            background: lineColor
                          }} />
                        </div>
                        <span style={styles.statValue}>
                          {Math.round((vehicle.progress || 0) * 100)}%
                        </span>
                      </div>

                      {vehicle.speed && (
                        <div style={styles.stat}>
                          <span style={styles.statLabel}>Geschwindigkeit:</span>
                          <span style={styles.statValue}>
                            ~{Math.round(vehicle.speed)} km/h
                          </span>
                        </div>
                      )}

                      {vehicle.delay !== undefined && vehicle.delay !== 0 && (
                        <div style={styles.stat}>
                          <span style={styles.statLabel}>Verspätung:</span>
                          <span style={{
                            ...styles.statValue,
                            color: vehicle.delay > 0 ? '#e74c3c' : '#27ae60'
                          }}>
                            {vehicle.delay > 0 ? '+' : ''}{vehicle.delay} min
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={styles.vehicleCoords}>
                      📍 {vehicle.lat.toFixed(4)}°N, {vehicle.lng.toFixed(4)}°E
                      {vehicle.bearing && ` • ${Math.round(vehicle.bearing)}° Richtung`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '20px',
    textAlign: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    color: '#2c3e50'
  },
  subtitle: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: 0
  },
  lineSection: {
    marginBottom: '24px',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    background: '#fff'
  },
  lineHeader: {
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff'
  },
  lineBadge: {
    fontSize: '16px',
    fontWeight: 'bold'
  },
  lineCount: {
    fontSize: '14px',
    opacity: 0.9
  },
  vehicleList: {
    padding: '8px'
  },
  vehicleCard: {
    display: 'flex',
    padding: '12px',
    marginBottom: '8px',
    background: '#f8f9fa',
    borderRadius: '8px',
    gap: '12px'
  },
  vehicleIcon: {
    flexShrink: 0
  },
  iconCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    border: '3px solid white'
  },
  vehicleInfo: {
    flex: 1,
    minWidth: 0
  },
  vehicleDirection: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#2c3e50'
  },
  vehicleSegment: {
    fontSize: '13px',
    marginBottom: '8px',
    color: '#555'
  },
  segmentLabel: {
    fontWeight: '500',
    marginRight: '4px'
  },
  segmentStops: {
    color: '#7f8c8d'
  },
  vehicleStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '8px'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px'
  },
  statLabel: {
    color: '#7f8c8d',
    minWidth: '100px'
  },
  statValue: {
    fontWeight: '600',
    color: '#2c3e50'
  },
  progressBar: {
    flex: 1,
    height: '6px',
    background: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease'
  },
  vehicleCoords: {
    fontSize: '11px',
    color: '#95a5a6',
    fontFamily: 'monospace'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#7f8c8d'
  },
  emptyIcon: {
    fontSize: '64px',
    margin: '0 0 16px 0'
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#2c3e50'
  },
  emptyHint: {
    fontSize: '14px',
    margin: 0
  }
};
