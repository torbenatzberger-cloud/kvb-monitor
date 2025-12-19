'use client';

import { useState, useEffect, useCallback } from 'react';

// === FESTE KONFIGURATION ===
const STOP_ID = '22000238';  // Gutenbergstraße
const STOP_NAME = 'Gutenbergstraße';
const WALK_TIME = 6;         // Minuten
const LINE_FILTER = '5';     // Nur Linie 5

const LINE_COLOR = '#00963f'; // Linie 5 = Grün

// === HELPER FUNCTIONS ===
function calculateSecondsUntil(realtimeHour, realtimeMinute) {
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let departureSeconds = realtimeHour * 3600 + realtimeMinute * 60;
  
  if (departureSeconds < nowSeconds - 3600) {
    departureSeconds += 24 * 3600;
  }
  
  return Math.max(0, departureSeconds - nowSeconds);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getShortDirection(direction) {
  let short = direction.replace(/^Köln\s+/i, '');
  if (short.includes('Sparkasse Am Butzweilerhof')) return 'Butzweilerhof';
  if (short.includes('Ossendorf')) return 'Butzweilerhof';
  return short;
}

// === PROGRESS BAR (wie auf Startseite) ===
function ProgressBar({ secondsUntilLeave, walkTimeSeconds }) {
  const maxBuffer = walkTimeSeconds;
  const timeUsed = maxBuffer - secondsUntilLeave;
  const progress = Math.min(100, Math.max(0, (timeUsed / maxBuffer) * 100));
  
  let barColor = '#00c853';
  if (progress >= 95) {
    barColor = '#e30613';
  } else if (progress >= 80) {
    barColor = '#f39200';
  }
  
  return (
    <div style={{
      width: '100%',
      height: '8px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '4px',
      overflow: 'hidden',
      marginTop: '12px',
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        background: barColor,
        borderRadius: '4px',
        transition: 'width 0.5s linear, background 0.3s ease',
        boxShadow: `0 0 10px ${barColor}66`,
      }} />
    </div>
  );
}

// === LEAVE TIMER CARD (wie auf Startseite) ===
function LeaveTimerCard({ direction, nextDeparture, walkTimeSeconds }) {
  if (!nextDeparture) {
    return (
      <div style={styles.timerCard}>
        <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '4px' }}>Richtung</div>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{direction}</div>
        <div style={{ fontSize: '36px', fontWeight: 800, opacity: 0.4 }}>--:--</div>
        <div style={{ fontSize: '14px', opacity: 0.5, marginTop: '8px' }}>Keine Bahn</div>
      </div>
    );
  }

  const secondsUntilLeave = Math.max(0, nextDeparture.secondsUntil - walkTimeSeconds);
  const isUrgent = secondsUntilLeave <= 30;
  const isSoon = secondsUntilLeave > 30 && secondsUntilLeave <= 120;

  const cardStyle = {
    ...styles.timerCard,
    ...(isUrgent && {
      background: 'linear-gradient(135deg, rgba(227,6,19,0.3) 0%, rgba(180,0,0,0.2) 100%)',
      borderColor: '#e30613',
      animation: 'urgentPulse 1.5s ease-in-out infinite',
    }),
    ...(isSoon && {
      background: 'linear-gradient(135deg, rgba(243,146,0,0.2) 0%, rgba(200,100,0,0.1) 100%)',
      borderColor: '#f39200',
    }),
  };

  const countdownColor = isUrgent ? '#ff6b6b' : isSoon ? '#f39200' : '#00c853';

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '4px' }}>Richtung</div>
      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>{direction}</div>
      <div style={{ 
        fontSize: '36px', 
        fontWeight: 800, 
        lineHeight: 1, 
        marginBottom: '4px',
        color: countdownColor,
        fontVariantNumeric: 'tabular-nums',
        ...(isUrgent && { animation: 'blink 1s infinite' }),
      }}>
        {secondsUntilLeave <= 0 ? 'JETZT!' : formatTime(secondsUntilLeave)}
      </div>
      <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
        {secondsUntilLeave <= 0 ? 'Loslaufen!' : 'bis loslaufen'}
      </div>
      
      <ProgressBar secondsUntilLeave={secondsUntilLeave} walkTimeSeconds={walkTimeSeconds} />
      
      <div style={{
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        marginTop: '12px',
        background: isUrgent ? '#e30613' : isSoon ? '#f39200' : 'rgba(255,255,255,0.1)',
        color: isUrgent || isSoon ? '#fff' : 'rgba(255,255,255,0.7)',
        ...(isUrgent && { animation: 'pulse 1s infinite' }),
      }}>
        {isUrgent ? '🏃 JETZT LOS!' : isSoon ? '👟 Fertig machen!' : '😌 Zeit genug'}
      </div>
      <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '10px' }}>
        Linie {nextDeparture.line} • Abfahrt {nextDeparture.realtimeTimeFormatted}
        {nextDeparture.delay > 0 && ` (+${nextDeparture.delay})`}
      </div>
    </div>
  );
}

// === MAIN COMPONENT ===
export default function KioskPage() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tick, setTick] = useState(0);

  const walkTimeSeconds = WALK_TIME * 60;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch departures
  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch(`/api/departures/${STOP_ID}?limit=50`);
      const data = await res.json();
      
      if (data.success) {
        const filtered = data.departures.filter(dep => dep.line === LINE_FILTER);
        setDepartures(filtered);
        setError(null);
      } else {
        setError(data.error || 'Fehler');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + Auto-refresh alle 10 Sekunden
  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 10000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  // Departures mit Zeitberechnung
  const departuresWithTime = departures
    .map(dep => ({
      ...dep,
      secondsUntil: calculateSecondsUntil(dep.realtimeHour, dep.realtimeMinute),
      shortDirection: getShortDirection(dep.direction),
    }))
    .sort((a, b) => a.secondsUntil - b.secondsUntil);

  // Abfahrten nach Richtung filtern
  const heumarktDepartures = departuresWithTime.filter(dep => 
    dep.shortDirection.toLowerCase().includes('heumarkt')
  );
  const butzweilerhofDepartures = departuresWithTime.filter(dep => 
    dep.shortDirection.toLowerCase().includes('butzweilerhof')
  );

  // Nächste erreichbare Bahn pro Richtung
  const nextHeumarkt = heumarktDepartures.find(dep => dep.secondsUntil >= walkTimeSeconds);
  const nextButzweilerhof = butzweilerhofDepartures.find(dep => dep.secondsUntil >= walkTimeSeconds);

  return (
    <div style={styles.container}>
      {/* Header mit Uhrzeit */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>KVB</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{STOP_NAME}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Linie {LINE_FILTER} • {WALK_TIME} min Gehzeit</div>
          </div>
        </div>
        <div style={styles.clock}>
          {currentTime.toLocaleTimeString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Lade...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <div style={styles.twoColumns}>
          {/* LINKE SPALTE: Heumarkt */}
          <div style={styles.column}>
            <LeaveTimerCard 
              direction="Heumarkt"
              nextDeparture={nextHeumarkt}
              walkTimeSeconds={walkTimeSeconds}
            />
            <div style={styles.departuresList}>
              {heumarktDepartures.slice(0, 5).map((dep, idx) => {
                const isReachable = dep.secondsUntil >= walkTimeSeconds;
                return (
                  <div 
                    key={`h-${dep.id}-${idx}`}
                    style={{
                      ...styles.departureItem,
                      opacity: isReachable ? 1 : 0.4,
                    }}
                  >
                    <div style={styles.lineBadge}>{dep.line}</div>
                    <div style={styles.depDirection}>{dep.shortDirection}</div>
                    <div style={styles.depMeta}>
                      <span>{dep.realtimeTimeFormatted}</span>
                      {dep.delay > 0 && <span style={{ color: '#ff6b6b', marginLeft: '4px' }}>+{dep.delay}</span>}
                    </div>
                    <div style={styles.depTime}>
                      {dep.secondsUntil <= 30 ? 'jetzt' : `${Math.floor(dep.secondsUntil / 60)}'`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RECHTE SPALTE: Butzweilerhof */}
          <div style={styles.column}>
            <LeaveTimerCard 
              direction="Butzweilerhof"
              nextDeparture={nextButzweilerhof}
              walkTimeSeconds={walkTimeSeconds}
            />
            <div style={styles.departuresList}>
              {butzweilerhofDepartures.slice(0, 5).map((dep, idx) => {
                const isReachable = dep.secondsUntil >= walkTimeSeconds;
                return (
                  <div 
                    key={`b-${dep.id}-${idx}`}
                    style={{
                      ...styles.departureItem,
                      opacity: isReachable ? 1 : 0.4,
                    }}
                  >
                    <div style={styles.lineBadge}>{dep.line}</div>
                    <div style={styles.depDirection}>{dep.shortDirection}</div>
                    <div style={styles.depMeta}>
                      <span>{dep.realtimeTimeFormatted}</span>
                      {dep.delay > 0 && <span style={{ color: '#ff6b6b', marginLeft: '4px' }}>+{dep.delay}</span>}
                    </div>
                    <div style={styles.depTime}>
                      {dep.secondsUntil <= 30 ? 'jetzt' : `${Math.floor(dep.secondsUntil / 60)}'`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(227, 6, 19, 0.4); }
          50% { box-shadow: 0 0 20px 5px rgba(227, 6, 19, 0.2); }
        }
      `}</style>
    </div>
  );
}

// === STYLES ===
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '8px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(90deg, #e30613 0%, #c10510 100%)',
    padding: '8px 12px',
    borderRadius: '10px',
    marginBottom: '8px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    width: '32px',
    height: '32px',
    background: '#fff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '11px',
    color: '#e30613',
  },
  clock: {
    fontSize: '28px',
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    fontSize: '24px',
    opacity: 0.6,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    fontSize: '20px',
    color: '#ff6b6b',
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    height: 'calc(100vh - 70px)',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  timerCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'center',
    border: '2px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s ease',
  },
  departuresList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  departureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  lineBadge: {
    width: '32px',
    height: '24px',
    borderRadius: '5px',
    background: LINE_COLOR,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '13px',
  },
  depDirection: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 500,
  },
  depMeta: {
    fontSize: '11px',
    opacity: 0.6,
  },
  depTime: {
    fontSize: '16px',
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '36px',
    textAlign: 'right',
  },
};
