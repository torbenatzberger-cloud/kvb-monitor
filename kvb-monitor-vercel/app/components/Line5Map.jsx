'use client';

import { useMemo, useState, useEffect } from 'react';
import { LINE_5_STOPS, LINE_5_COLOR, getStopIndex } from '../config/line5';
import { useLineVehicles } from './hooks/useLineVehicles';

/**
 * Responsive Streckenkarte für Linie 5
 * - Desktop: Horizontale Darstellung
 * - Mobile: Vertikale Liste mit Scroll
 */
export default function Line5Map({ selectedStop, departures }) {
  const selectedStopId = selectedStop?.id;
  const { vehicles, incomingVehicles, currentTime } = useLineVehicles(departures, selectedStopId);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Finde Index der ausgewählten Station
  const selectedStopIndex = useMemo(() => {
    if (!selectedStopId) return -1;
    return getStopIndex(selectedStopId);
  }, [selectedStopId]);

  // Prüfe ob die Station auf Linie 5 liegt
  const isOnLine5 = selectedStopIndex !== -1;

  // Finde Bahnen die sich zwischen Stationen befinden
  const getTrainsNearStop = (stopIndex) => {
    return vehicles.filter(train => {
      const trainStopIndex = Math.floor((train.position / 100) * (LINE_5_STOPS.length - 1));
      const nextStopIndex = Math.ceil((train.position / 100) * (LINE_5_STOPS.length - 1));
      return trainStopIndex === stopIndex || nextStopIndex === stopIndex;
    });
  };

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

      {/* CSS für Pulse-Animation */}
      <style>{`
        @keyframes trainPulse {
          0%, 100% { box-shadow: 0 0 8px ${LINE_5_COLOR}, 0 0 16px ${LINE_5_COLOR}60; }
          50% { box-shadow: 0 0 12px ${LINE_5_COLOR}, 0 0 24px ${LINE_5_COLOR}80; }
        }
      `}</style>

      {/* Mobile: Vertikale Liste mit 3 Spalten */}
      {isMobile ? (
        <div style={styles.mobileCard}>
          <div style={styles.stationList}>
            {LINE_5_STOPS.map((stop, index) => {
              const isSelected = stop.id === selectedStopId;
              const trainsHere = getTrainsNearStop(index);
              const isFirst = index === 0;
              const isLast = index === LINE_5_STOPS.length - 1;

              // Bahnen nach Richtung aufteilen
              const trainsToOssendorf = trainsHere.filter(t => t.direction !== 'heumarkt');
              const trainsToHeumarkt = trainsHere.filter(t => t.direction === 'heumarkt');

              return (
                <div key={stop.id} style={styles.stationRow}>
                  {/* Linke Spalte: Bahnen Richtung Butzweilerhof (↑) */}
                  <div style={styles.trainColumn}>
                    {trainsToOssendorf.map(train => (
                      <div key={train.id} style={styles.mobileTrainContainer}>
                        <div style={styles.trainDot} />
                        <span style={styles.trainDirectionArrow}>↑</span>
                      </div>
                    ))}
                  </div>

                  {/* Mittlere Spalte: Linie mit Stationspunkt */}
                  <div style={styles.lineColumn}>
                    {!isFirst && <div style={styles.lineSegmentTop} />}
                    <div style={{
                      ...styles.stationDot,
                      ...(isSelected && styles.stationDotSelected),
                      ...(isFirst || isLast ? styles.stationDotTerminal : {}),
                    }} />
                    {!isLast && <div style={styles.lineSegmentBottom} />}
                  </div>

                  {/* Stationsinfo */}
                  <div style={{
                    ...styles.stationInfo,
                    ...(isSelected && styles.stationInfoSelected),
                  }}>
                    <div style={styles.stationName}>
                      {isSelected && <span style={styles.youAreHereIcon}>📍</span>}
                      {stop.name}
                    </div>
                    {isSelected && (
                      <div style={styles.youAreHereLabel}>Du bist hier</div>
                    )}
                    {(isFirst || isLast) && (
                      <div style={styles.terminalLabel}>
                        {isFirst ? 'Startstation' : 'Endstation'}
                      </div>
                    )}
                  </div>

                  {/* Rechte Spalte: Bahnen Richtung Heumarkt (↓) */}
                  <div style={styles.trainColumn}>
                    {trainsToHeumarkt.map(train => (
                      <div key={train.id} style={styles.mobileTrainContainer}>
                        <div style={styles.trainDot} />
                        <span style={styles.trainDirectionArrow}>↓</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Desktop: Horizontale Karte */
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
                      ...styles.stopNameDesktop,
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
                    top: isToHeumarkt ? 'calc(50% - 20px)' : 'calc(50% + 20px)',
                  }}
                >
                  <div style={styles.trainBadge}>
                    <div style={styles.trainDot} />
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
      )}

      {/* Ankommende Bahnen */}
      {isOnLine5 && (
        <div style={styles.incomingCard}>
          <h3 style={styles.incomingTitle}>
            Ankommende Bahnen
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
                        {train.destination}
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
                </div>
              );
            })
          ) : (
            <div style={styles.noTrains}>
              Keine ankommenden Bahnen
            </div>
          )}
        </div>
      )}

      {/* Hinweis wenn Station nicht auf Linie 5 */}
      {!isOnLine5 && selectedStop && (
        <div style={styles.notOnLineCard}>
          <div style={styles.notOnLineIcon}>🚋</div>
          <p style={styles.notOnLineText}>
            <strong>{selectedStop.name}</strong> liegt nicht auf Linie 5
          </p>
          <p style={styles.notOnLineSubtext}>
            Wähle eine Station der Linie 5 für die Live-Karte
          </p>
        </div>
      )}
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
    marginBottom: '16px',
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
    fontSize: '18px',
    fontWeight: 600,
  },
  lineSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
  },
  time: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 300,
    fontVariantNumeric: 'tabular-nums',
  },

  // === MOBILE STYLES ===
  mobileCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  stationList: {
    position: 'relative',
  },
  stationRow: {
    display: 'grid',
    gridTemplateColumns: '36px 28px 1fr 36px',
    alignItems: 'stretch',
    minHeight: '50px',
  },
  trainColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  mobileTrainContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  trainDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: LINE_5_COLOR,
    boxShadow: `0 0 8px ${LINE_5_COLOR}, 0 0 16px ${LINE_5_COLOR}60`,
    animation: 'trainPulse 2s ease-in-out infinite',
    flexShrink: 0,
  },
  trainDirectionArrow: {
    fontSize: '10px',
    color: LINE_5_COLOR,
    fontWeight: 700,
  },
  lineColumn: {
    width: '28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  },
  lineSegmentTop: {
    width: '4px',
    flex: 1,
    background: LINE_5_COLOR,
  },
  lineSegmentBottom: {
    width: '4px',
    flex: 1,
    background: LINE_5_COLOR,
  },
  stationDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: LINE_5_COLOR,
    border: `3px solid ${LINE_5_COLOR}`,
    zIndex: 1,
    flexShrink: 0,
  },
  stationDotSelected: {
    width: '20px',
    height: '20px',
    background: '#fff',
    border: `4px solid ${LINE_5_COLOR}`,
    boxShadow: `0 0 12px ${LINE_5_COLOR}`,
  },
  stationDotTerminal: {
    width: '18px',
    height: '18px',
  },
  stationInfo: {
    flex: 1,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  stationInfoSelected: {
    background: `${LINE_5_COLOR}20`,
    borderRadius: '8px',
  },
  stationName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  youAreHereIcon: {
    fontSize: '14px',
  },
  youAreHereLabel: {
    color: LINE_5_COLOR,
    fontSize: '11px',
    fontWeight: 600,
    marginTop: '2px',
  },
  terminalLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    marginTop: '2px',
  },

  // === DESKTOP STYLES ===
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
  stopNameDesktop: {
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
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  trainArrow: {
    fontSize: '11px',
    color: LINE_5_COLOR,
    fontWeight: 700,
  },
  endpoints: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '60px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },

  // === INCOMING TRAINS ===
  incomingCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '16px',
  },
  incomingTitle: {
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '12px',
    marginTop: 0,
  },
  incomingItem: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '8px',
  },
  incomingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  incomingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    overflow: 'hidden',
    minWidth: 0,
  },
  lineBadgeSmall: {
    background: LINE_5_COLOR,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 700,
    fontSize: '12px',
  },
  incomingDirection: {
    color: 'white',
    fontWeight: 500,
    fontSize: '13px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  incomingRight: {
    textAlign: 'right',
  },
  incomingMinutes: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 600,
  },
  progressBar: {
    height: '5px',
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
  noTrains: {
    textAlign: 'center',
    padding: '16px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
  },

  // === NOT ON LINE ===
  notOnLineCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
  },
  notOnLineIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  notOnLineText: {
    color: 'white',
    fontSize: '14px',
    marginBottom: '6px',
    margin: 0,
  },
  notOnLineSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    margin: 0,
    marginTop: '6px',
  },
};
