'use client';

import { useMemo } from 'react';
import { LINE_5_STOPS, LINE_5_COLOR, getStopIndex } from '../config/line5';
import { useLineVehicles } from './hooks/useLineVehicles';

/**
 * Horizontale Streckenkarte für Linie 5
 * Zeigt Live-Positionen der Bahnen basierend auf Abfahrtsdaten
 */
export default function Line5Map({ selectedStop, departures }) {
  const selectedStopId = selectedStop?.id;
  const { vehicles, incomingVehicles, currentTime } = useLineVehicles(departures, selectedStopId);

  // Finde Index der ausgewählten Station
  const selectedStopIndex = useMemo(() => {
    if (!selectedStopId) return -1;
    return getStopIndex(selectedStopId);
  }, [selectedStopId]);

  // Prüfe ob die Station auf Linie 5 liegt
  const isOnLine5 = selectedStopIndex !== -1;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.lineBadge}>5</span>
          <div>
            <div style={styles.lineTitle}>Linie 5</div>
            <div style={styles.lineSubtitle}>Butzweilerhof ↔ Heumarkt</div>
          </div>
        </div>
        <div style={styles.time}>
          {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Streckenkarte */}
      <div style={styles.mapCard}>
        <div style={styles.trackContainer}>
          {/* Hauptlinie */}
          <div style={styles.track} />

          {/* Haltestellen */}
          {LINE_5_STOPS.map((stop, index) => {
            const position = (index / (LINE_5_STOPS.length - 1)) * 100;
            const isSelected = stop.id === selectedStopId;

            return (
              <div
                key={stop.id}
                style={{
                  ...styles.stopContainer,
                  left: `${position}%`,
                }}
              >
                {/* "Du bist hier" Marker */}
                {isSelected && (
                  <div style={styles.youAreHere}>
                    📍 Du bist hier
                  </div>
                )}

                {/* Haltestellenpunkt */}
                <div
                  style={{
                    ...styles.stopDot,
                    ...(isSelected && styles.stopDotSelected),
                  }}
                />

                {/* Haltestellenname */}
                <div
                  style={{
                    ...styles.stopName,
                    ...(isSelected && styles.stopNameSelected),
                  }}
                >
                  {stop.short}
                </div>
              </div>
            );
          })}

          {/* Bahnen auf der Strecke */}
          {vehicles.map((train) => {
            const isToHeumarkt = train.direction === 'heumarkt';

            return (
              <div
                key={train.id}
                style={{
                  ...styles.trainContainer,
                  left: `${train.position}%`,
                  top: isToHeumarkt ? 'calc(50% - 24px)' : 'calc(50% + 24px)',
                }}
              >
                <div style={styles.trainBadge}>
                  🚃
                  <span style={styles.trainArrow}>
                    {isToHeumarkt ? '→' : '←'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Endpunkte Labels */}
        <div style={styles.endpoints}>
          <span>← Butzweilerhof</span>
          <span>Heumarkt →</span>
        </div>
      </div>

      {/* Ankommende Bahnen */}
      {isOnLine5 && (
        <div style={styles.incomingCard}>
          <h3 style={styles.incomingTitle}>
            Ankommende Bahnen an {LINE_5_STOPS[selectedStopIndex]?.short}
          </h3>

          {incomingVehicles.length > 0 ? (
            incomingVehicles.map((train) => {
              const minutes = Math.floor(train.secondsUntilDeparture / 60);
              const progress = Math.max(0, Math.min(100, 100 - (train.secondsUntilDeparture / 600) * 100));

              return (
                <div key={train.id} style={styles.incomingItem}>
                  <div style={styles.incomingHeader}>
                    <div style={styles.incomingLeft}>
                      <span style={styles.lineBadgeSmall}>5</span>
                      <span style={styles.incomingDirection}>
                        Richtung {train.destination}
                      </span>
                    </div>
                    <div style={styles.incomingRight}>
                      <span style={styles.incomingMinutes}>
                        {minutes} min
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                  <div style={styles.progressLabels}>
                    <span>Start</span>
                    <span>Hier</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={styles.noTrains}>
              Keine ankommenden Bahnen auf Linie 5
            </div>
          )}
        </div>
      )}

      {/* Hinweis wenn Station nicht auf Linie 5 */}
      {!isOnLine5 && selectedStop && (
        <div style={styles.notOnLineCard}>
          <p style={styles.notOnLineText}>
            Die Station <strong>{selectedStop.name}</strong> liegt nicht auf Linie 5.
          </p>
          <p style={styles.notOnLineSubtext}>
            Wähle eine Station der Linie 5 um die Live-Karte zu sehen.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        Linie 5 · Live-Positionen basierend auf Abfahrtsdaten
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  lineBadge: {
    background: LINE_5_COLOR,
    color: 'white',
    padding: '6px 14px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '18px',
  },
  lineTitle: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 600,
  },
  lineSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
  },
  time: {
    color: 'white',
    fontSize: '28px',
    fontWeight: 300,
    fontVariantNumeric: 'tabular-nums',
  },
  mapCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  },
  trackContainer: {
    position: 'relative',
    height: '100px',
    marginTop: '40px',
    marginLeft: '20px',
    marginRight: '20px',
  },
  track: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: '6px',
    background: LINE_5_COLOR,
    borderRadius: '3px',
    transform: 'translateY(-50%)',
  },
  stopContainer: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  },
  stopDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: LINE_5_COLOR,
    border: `3px solid ${LINE_5_COLOR}`,
    transition: 'all 0.2s ease',
  },
  stopDotSelected: {
    width: '18px',
    height: '18px',
    background: '#fff',
    boxShadow: `0 0 20px ${LINE_5_COLOR}`,
  },
  stopName: {
    position: 'absolute',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%) rotate(-45deg)',
    transformOrigin: 'top left',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '9px',
    whiteSpace: 'nowrap',
  },
  stopNameSelected: {
    color: 'white',
    fontWeight: 600,
    fontSize: '10px',
  },
  youAreHere: {
    position: 'absolute',
    top: '-40px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: LINE_5_COLOR,
    color: 'white',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  trainContainer: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    transition: 'left 1s linear',
  },
  trainBadge: {
    background: LINE_5_COLOR,
    color: 'white',
    padding: '3px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    boxShadow: `0 0 10px ${LINE_5_COLOR}80`,
  },
  trainArrow: {
    fontSize: '10px',
  },
  endpoints: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '60px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  incomingCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  incomingTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    marginTop: 0,
  },
  incomingItem: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '14px',
    marginBottom: '10px',
  },
  incomingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  incomingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  lineBadgeSmall: {
    background: LINE_5_COLOR,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '13px',
  },
  incomingDirection: {
    color: 'white',
    fontWeight: 500,
    fontSize: '14px',
  },
  incomingRight: {
    textAlign: 'right',
  },
  incomingMinutes: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 600,
  },
  progressBar: {
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${LINE_5_COLOR}80, ${LINE_5_COLOR})`,
    borderRadius: '3px',
    transition: 'width 1s ease',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
  },
  noTrains: {
    textAlign: 'center',
    padding: '20px',
    color: 'rgba(255,255,255,0.5)',
  },
  notOnLineCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  notOnLineText: {
    color: 'white',
    fontSize: '14px',
    marginBottom: '8px',
  },
  notOnLineSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '16px',
  },
};
