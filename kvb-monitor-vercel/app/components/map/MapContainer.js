'use client';

import { useState } from 'react';
import CityMapView from './CityMapView';
import LineMapView from './LineMapView';
import MapModeToggle from './MapModeToggle';
import { useGTFSData } from '../hooks/useGTFSData';
import { useVehicleTracking } from '../hooks/useVehicleTracking';

/**
 * Map Container Component
 *
 * Main orchestrator for the live map feature
 * Manages:
 * - View mode (city vs line)
 * - GTFS data loading
 * - Vehicle tracking
 * - User interactions
 */
export default function MapContainer({
  selectedStation,
  selectedLines,
  city,
  accentColor
}) {
  const [viewMode, setViewMode] = useState('city');
  const [selectedLine, setSelectedLine] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Load GTFS data
  const { gtfsData, loading: gtfsLoading, error: gtfsError } = useGTFSData(city);

  // Track vehicles
  const { vehicles, loading: vehiclesLoading } = useVehicleTracking({
    station: selectedStation,
    lines: selectedLines,
    gtfsData,
    enabled: isVisible && !!gtfsData
  });

  // Filter vehicles for line view
  const lineVehicles = selectedLine
    ? vehicles.filter(v => v.line === selectedLine)
    : vehicles;

  // Handle line selection (switch to line view)
  const handleLineSelect = (lineId) => {
    setSelectedLine(lineId);
    setViewMode('line');
  };

  // Handle back to city view
  const handleBackToCity = () => {
    setSelectedLine(null);
    setViewMode('city');
  };

  // Show button if map is not visible
  if (!isVisible) {
    return (
      <div style={styles.buttonContainer}>
        <button
          onClick={() => setIsVisible(true)}
          style={{
            ...styles.showButton,
            background: accentColor
          }}
        >
          🗺️ Live-Karte anzeigen
        </button>
      </div>
    );
  }

  // Show loading state
  if (gtfsLoading) {
    return (
      <div style={styles.mapContainer}>
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Lade Kartendaten...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (gtfsError) {
    return (
      <div style={styles.mapContainer}>
        <div style={styles.error}>
          <p style={styles.errorTitle}>⚠️ Fehler beim Laden</p>
          <p style={styles.errorMessage}>{gtfsError}</p>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              ...styles.errorButton,
              background: accentColor
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.mapContainer}>
      {/* Map Mode Toggle / Close Button */}
      <MapModeToggle
        mode={viewMode}
        onModeChange={setViewMode}
        onClose={() => setIsVisible(false)}
        selectedLine={selectedLine}
        accentColor={accentColor}
      />

      {/* Render appropriate view */}
      {viewMode === 'city' ? (
        <CityMapView
          vehicles={vehicles}
          gtfsData={gtfsData}
          selectedLines={selectedLines}
          onLineSelect={handleLineSelect}
          accentColor={accentColor}
          centerStation={selectedStation}
        />
      ) : (
        <LineMapView
          line={selectedLine}
          vehicles={lineVehicles}
          gtfsData={gtfsData}
          onBack={handleBackToCity}
          accentColor={accentColor}
        />
      )}

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        ⚠️ Positionen sind Schätzwerte basierend auf Fahrplandaten – keine GPS-Daten
      </div>
    </div>
  );
}

const styles = {
  buttonContainer: {
    width: '100%',
    marginBottom: '16px'
  },
  showButton: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: '60vh',
    minHeight: '400px',
    maxHeight: '800px',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    background: 'linear-gradient(to bottom, #0a0a0f, #12121a)'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#fff'
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
  loadingText: {
    fontSize: '16px',
    opacity: 0.8
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#fff',
    padding: '32px',
    textAlign: 'center'
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px'
  },
  errorMessage: {
    fontSize: '14px',
    opacity: 0.7,
    marginBottom: '24px'
  },
  errorButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  disclaimer: {
    position: 'absolute',
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '90%',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    color: 'rgba(255,255,255,0.8)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '11px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    pointerEvents: 'none'
  }
};

// Add spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-map-animations]')) {
    style.setAttribute('data-map-animations', 'true');
    document.head.appendChild(style);
  }
}
