'use client';

import { useMemo } from 'react';
import { useMapAnimation } from '../hooks/useMapAnimation';

/**
 * SVG Line View Component
 *
 * Displays a single transit line with vehicles animated along the route
 */
export default function LineMapView({
  line,
  vehicles,
  gtfsData,
  onBack,
  accentColor
}) {
  const route = gtfsData?.routes?.[line];

  // Get shape for this line (use first available direction)
  const shapeId = useMemo(() => {
    if (!gtfsData?.shapes) return null;
    return Object.keys(gtfsData.shapes).find(id =>
      gtfsData.shapes[id].routeId === line
    );
  }, [gtfsData, line]);

  const shape = gtfsData?.shapes?.[shapeId];

  // Animate vehicles
  const animatedVehicles = useMapAnimation(vehicles, true);

  // Calculate SVG viewBox from shape bounds
  const viewBox = useMemo(() => {
    if (!shape?.points || shape.points.length === 0) {
      return '0 0 800 600';
    }

    const lats = shape.points.map(p => p.lat);
    const lngs = shape.points.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 0.002; // Add padding around route

    // SVG viewBox: x y width height
    // Note: lat increases upward, so we need to invert
    return `${minLng - padding} ${-maxLat - padding} ${maxLng - minLng + 2 * padding} ${maxLat - minLat + 2 * padding}`;
  }, [shape]);

  // Get stations along the route
  const stations = useMemo(() => {
    if (!gtfsData?.schedule?.[line]?.segments) return [];

    const segments = gtfsData.schedule[line].segments;
    const stationIds = new Set();

    segments.forEach(seg => {
      stationIds.add(seg.from_stop);
      stationIds.add(seg.to_stop);
    });

    return Array.from(stationIds)
      .map(id => gtfsData.stops[id])
      .filter(Boolean);
  }, [gtfsData, line]);

  if (!route || !shape) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p>Lade Linienansicht...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          ...styles.backButton,
          background: accentColor
        }}
      >
        ← Zurück zur Übersicht
      </button>

      {/* Line Info */}
      <div style={styles.lineInfo}>
        <div
          style={{
            ...styles.lineBadge,
            background: route.color
          }}
        >
          {line}
        </div>
        <span style={styles.lineName}>{route.longName || `Linie ${line}`}</span>
        <span style={styles.vehicleCount}>
          {animatedVehicles.length} {animatedVehicles.length === 1 ? 'Fahrzeug' : 'Fahrzeuge'}
        </span>
      </div>

      {/* SVG Map */}
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={styles.svg}
      >
        {/* Route Line */}
        <polyline
          points={shape.points.map(p => `${p.lng},${-p.lat}`).join(' ')}
          stroke={route.color}
          strokeWidth="0.0003"
          fill="none"
          opacity="0.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Stations */}
        {stations.map((station, i) => (
          <g key={station.id}>
            <circle
              cx={station.lng}
              cy={-station.lat}
              r="0.0002"
              fill="white"
              stroke={route.color}
              strokeWidth="0.00005"
              opacity="0.9"
            />
            {/* Station name (show every 3rd station to avoid clutter) */}
            {i % 3 === 0 && (
              <text
                x={station.lng}
                y={-station.lat - 0.0003}
                fontSize="0.0002"
                fill="white"
                textAnchor="middle"
                opacity="0.8"
              >
                {station.name}
              </text>
            )}
          </g>
        ))}

        {/* Vehicles */}
        {animatedVehicles.map((vehicle) => (
          <g key={vehicle.id}>
            {/* Vehicle circle */}
            <circle
              cx={vehicle.lng}
              cy={-vehicle.lat}
              r="0.0003"
              fill={route.color}
              stroke="white"
              strokeWidth="0.0001"
              opacity="1"
              style={{
                transition: 'cx 0.3s ease-out, cy 0.3s ease-out',
                filter: 'drop-shadow(0 0 0.0002 rgba(0,0,0,0.5))'
              }}
            />

            {/* Direction indicator (small triangle) */}
            <polygon
              points={`${vehicle.lng},${-vehicle.lat - 0.0004} ${vehicle.lng - 0.0001},${-vehicle.lat - 0.0002} ${vehicle.lng + 0.0001},${-vehicle.lat - 0.0002}`}
              fill="white"
              opacity="0.9"
              style={{
                transition: 'transform 0.3s ease-out'
              }}
            />

            {/* Delay indicator */}
            {vehicle.delay > 60 && (
              <circle
                cx={vehicle.lng}
                cy={-vehicle.lat}
                r="0.0005"
                fill="none"
                stroke="#f39200"
                strokeWidth="0.00008"
                opacity="0.8"
              />
            )}
          </g>
        ))}
      </svg>

      {/* Vehicle List */}
      {animatedVehicles.length > 0 && (
        <div style={styles.vehicleList}>
          <h4 style={styles.vehicleListTitle}>Aktive Fahrzeuge</h4>
          {animatedVehicles.map(vehicle => (
            <div key={vehicle.id} style={styles.vehicleItem}>
              <span style={styles.vehicleDirection}>→ {vehicle.direction}</span>
              {vehicle.delay > 0 && (
                <span style={styles.vehicleDelay}>+{Math.round(vehicle.delay / 60)} Min</span>
              )}
              {vehicle.delay === 0 && (
                <span style={styles.vehicleOnTime}>Pünktlich</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        ⚠️ Positionen sind Schätzwerte basierend auf Fahrplandaten
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, #0a0a0f, #12121a)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#fff',
    fontSize: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  backButton: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 10,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    transition: 'transform 0.2s',
  },
  lineInfo: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  lineBadge: {
    minWidth: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  lineName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600'
  },
  vehicleCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '12px'
  },
  svg: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '400px'
  },
  vehicleList: {
    position: 'absolute',
    bottom: '60px',
    left: '16px',
    right: '16px',
    maxHeight: '150px',
    overflowY: 'auto',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  vehicleListTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '8px',
    marginTop: 0
  },
  vehicleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  vehicleDirection: {
    color: '#fff',
    fontSize: '13px'
  },
  vehicleDelay: {
    color: '#f39200',
    fontSize: '12px',
    fontWeight: '600'
  },
  vehicleOnTime: {
    color: '#95c11f',
    fontSize: '12px',
    fontWeight: '600'
  },
  disclaimer: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    textAlign: 'center',
    background: 'rgba(0,0,0,0.5)',
    padding: '6px 12px',
    borderRadius: '6px'
  }
};

// Add keyframe animation for spinner
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
