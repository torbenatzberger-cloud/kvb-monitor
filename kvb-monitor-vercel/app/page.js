'use client';

import { useState, useEffect, useCallback } from 'react';

// === CONFIG ===
const APP_VERSION = '1.7.1';

// === CHANGELOG ===
const CHANGELOG = [
  {
    version: '1.7.1',
    date: '23.12.2025',
    changes: [
      'Fix: Vergangene Bahnen werden jetzt korrekt als "weg" angezeigt',
      'Fix: Bahnen die länger als 1 Min weg sind werden ausgeblendet',
      'Fix: 12-Stunden-Schwelle für Tag/Nacht-Berechnung',
    ],
  },
  {
    version: '1.7.0',
    date: '19.12.2025',
    changes: [
      'Gehzeit per +/- einstellbar (1-30 min)',
      'München-Version unter /muenchen verfügbar',
    ],
  },
  {
    version: '1.6.0',
    date: '13.12.2025',
    changes: [
      'Störungsmeldungen – Live-Anzeige bei betroffenen Linien',
      'Aufzug- & Rolltreppenstörungen aus KVB Open Data',
      'Störungs-Banner im Header (ausklappbar)',
    ],
  },
  {
    version: '1.5.0',
    date: '12.12.2025',
    changes: [
      'NEU: Feedback-System – Bug melden, Feature wünschen',
      'NEU: E-Mail-Benachrichtigung wenn dein Wunsch umgesetzt wurde',
      'NEU: Eigene Domain kvb-monitor.de 🎉',
    ],
  },
  {
    version: '1.4.1',
    date: '12.12.2025',
    changes: [
      'FIX: Station-IDs korrigiert (Friesenplatz, Dom/Hbf funktionieren jetzt)',
      'FIX: "Nur Stadtbahn" Filter jetzt im Frontend (zuverlässiger)',
      'Stadtbahn-Linien werden anhand der Nummer erkannt (1-18)',
    ],
  },
  {
    version: '1.4.0',
    date: '12.12.2025',
    changes: [
      'NEU: "Nur Stadtbahn" Filter',
      'NEU: Changelog – klickbar über die Versionsnummer',
      'Standardmäßig werden nur Stadtbahn-Linien angezeigt',
    ],
  },
  {
    version: '1.3.0',
    date: '12.12.2025',
    changes: [
      'Mehr Abfahrten laden: 200 statt 50 bei aktivem Filter',
      'Zeithorizont auf 5 Stunden erhöht',
      '"Mehr laden" Button holt weitere 200 Abfahrten',
    ],
  },
  {
    version: '1.2.1',
    date: '12.12.2025',
    changes: [
      'Bug-Fix: Erste Korrektur der Station-IDs',
    ],
  },
  {
    version: '1.2.0',
    date: '12.12.2025',
    changes: [
      '"Mehr anzeigen" Button für zusätzliche Abfahrten',
      'Bei aktivem Linienfilter werden mehr Daten geladen',
    ],
  },
  {
    version: '1.1.0',
    date: '11.12.2025',
    changes: [
      'Versionierung im Footer eingeführt',
      'Linienfilter – Standard: Linie 5',
      'localStorage für alle Einstellungen',
      'Einstellungen bleiben nach Browser-Neustart erhalten',
    ],
  },
  {
    version: '1.0.0',
    date: '11.12.2025',
    changes: [
      'Erste Vercel-Release',
      'VRR EFA API Integration',
      'Kein lokales Backend mehr nötig',
      'KVB-Design mit Live-Countdown',
    ],
  },
  {
    version: '0.3.0',
    date: '11.12.2025',
    changes: [
      'Umstellung auf VRR EFA API',
      'Zuverlässigere Echtzeit-Daten',
    ],
  },
  {
    version: '0.2.0',
    date: '11.12.2025',
    changes: [
      'Python Backend für lokales Hosting',
      'Raspberry Pi Kompatibilität',
    ],
  },
  {
    version: '0.1.0',
    date: '11.12.2025',
    changes: [
      'Erste Version – Proof of Concept',
      'React PWA mit KVB-Styling',
      'Losgeh-Timer und Countdown',
    ],
  },
];

const LINE_COLORS = {
  '1': '#ed1c24', '3': '#009fe3', '4': '#f39200', '5': '#00963f',
  '7': '#e6007e', '9': '#c60c30', '12': '#a05e9e', '13': '#7fb6d9',
  '15': '#95c11f', '16': '#009fe3', '17': '#00963f', '18': '#009fe3',
};

// KVB Stadtbahn-Linien (einstellig und zweistellig bis 18)
const STADTBAHN_LINES = ['1', '3', '4', '5', '7', '9', '12', '13', '15', '16', '17', '18'];
const AVAILABLE_LINES = STADTBAHN_LINES;

// Station-IDs für VRR EFA API
// Format: 22000XXX wobei XXX die KVB-Haltestellen-ID ist
const POPULAR_STOPS = [
  { name: 'Gutenbergstraße', id: '22000238' },
  { name: 'Neumarkt', id: '22000002' },
  { name: 'Dom/Hbf', id: '22000752' },
  { name: 'Heumarkt', id: '22000001' },
  { name: 'Rudolfplatz', id: '22000027' },
  { name: 'Friesenplatz', id: '22000030' },
  { name: 'Hansaring', id: '22000036' },
  { name: 'Barbarossaplatz', id: '22000023' },
];

// === HELPERS ===
function getLineColor(line) {
  const clean = String(line).replace(/\s+/g, '');
  if (LINE_COLORS[clean]) return LINE_COLORS[clean];
  if (clean.startsWith('S')) return '#00843d';
  if (/^\d+$/.test(clean)) return '#009fe3';
  return '#666666';
}

// Prüft ob eine Linie eine Stadtbahn ist (1-18)
function isStadtbahnLine(line) {
  const clean = String(line).replace(/\s+/g, '');
  const num = parseInt(clean);
  // Stadtbahn: Nummern 1-18 (einstellig oder zweistellig bis 18)
  // Bus: Dreistellig (z.B. 172, 173, 212)
  return !isNaN(num) && num >= 1 && num <= 18 && STADTBAHN_LINES.includes(clean);
}

function calculateSecondsUntil(realtimeHour, realtimeMinute) {
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let departureSeconds = realtimeHour * 3600 + realtimeMinute * 60;

  // Nur für Zeiten die mehr als 12 Stunden in der Vergangenheit liegen → nächster Tag
  // (vorher 1 Stunde - das war zu kurz!)
  if (departureSeconds < nowSeconds - 12 * 3600) {
    departureSeconds += 24 * 3600;
  }

  // Erlaube negative Werte für vergangene Abfahrten
  return departureSeconds - nowSeconds;
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

function findMainDirections(departures, walkTimeSeconds) {
  if (departures.length === 0) return [];
  
  const reachable = departures.filter(dep => dep.secondsUntil >= walkTimeSeconds);
  
  if (reachable.length === 0) return [];
  
  const directionMap = {};
  reachable.forEach(dep => {
    const dir = getShortDirection(dep.direction);
    if (!directionMap[dir]) {
      directionMap[dir] = [];
    }
    directionMap[dir].push(dep);
  });
  
  const directions = Object.entries(directionMap)
    .map(([name, deps]) => ({
      name,
      nextDeparture: deps[0],
      count: deps.length
    }))
    .sort((a, b) => a.nextDeparture.secondsUntil - b.nextDeparture.secondsUntil);
  
  return directions.slice(0, 2);
}

// === localStorage Helpers ===
function loadSettings() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('kvb-monitor-settings-v2');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kvb-monitor-settings-v2', JSON.stringify(settings));
  } catch (e) {}
}

// === STYLES ===
const styles = {
  header: {
    background: 'linear-gradient(90deg, #e30613 0%, #c10510 100%)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(227, 6, 19, 0.3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '36px',
    height: '36px',
    background: '#fff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '12px',
    color: '#e30613',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  settingsBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  refreshBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 12px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  leaveTimerContainer: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  leaveTimerGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  main: {
    padding: '16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  departure: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '8px',
  },
  lineBadge: {
    minWidth: '48px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    color: '#fff',
  },
  settingsPanel: {
    background: 'rgba(0,0,0,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '16px',
  },
  walkTimeBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '8px',
    marginBottom: '8px',
  },
  stopBtn: {
    padding: '8px 12px',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    background: 'transparent',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
  },
  lineFilterBtn: {
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
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalContent: {
    background: '#1a1a2e',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBody: {
    padding: '20px',
  },
};

// === COMPONENTS ===
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

function WalkTimeStepper({ value, onChange, accentColor = '#e30613' }) {
  const decrease = () => {
    if (value > 1) onChange(value - 1);
  };
  
  const increase = () => {
    if (value < 30) onChange(value + 1);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button 
        onClick={decrease}
        disabled={value <= 1}
        style={{
          width: '44px', height: '44px', borderRadius: '10px', border: 'none',
          background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '24px',
          fontWeight: '600', cursor: value <= 1 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: value <= 1 ? 0.3 : 1,
        }}
      >−</button>
      <div style={{ minWidth: '80px', textAlign: 'center', fontSize: '20px', fontWeight: '700' }}>
        <span style={{ color: accentColor }}>{value}</span> min
      </div>
      <button 
        onClick={increase}
        disabled={value >= 30}
        style={{
          width: '44px', height: '44px', borderRadius: '10px', border: 'none',
          background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '24px',
          fontWeight: '600', cursor: value >= 30 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: value >= 30 ? 0.3 : 1,
        }}
      >+</button>
    </div>
  );
}

function LeaveTimerCard({ direction, walkTimeSeconds }) {
  const { name, nextDeparture } = direction;
  const secondsUntilLeave = Math.max(0, nextDeparture.secondsUntil - walkTimeSeconds);
  const isUrgent = secondsUntilLeave <= 30;
  const isSoon = secondsUntilLeave > 30 && secondsUntilLeave <= 120;

  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
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
      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
        {name}
      </div>
      <div style={{ 
        fontSize: '48px', 
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

// Changelog Modal Component
function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>📋 Changelog</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>
        <div style={styles.modalBody}>
          {CHANGELOG.map((entry, idx) => (
            <div key={entry.version} style={{
              marginBottom: idx < CHANGELOG.length - 1 ? '20px' : 0,
              paddingBottom: idx < CHANGELOG.length - 1 ? '20px' : 0,
              borderBottom: idx < CHANGELOG.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: '14px',
                  background: idx === 0 ? '#e30613' : 'rgba(255,255,255,0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}>
                  v{entry.version}
                </span>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>{entry.date}</span>
              </div>
              <ul style={{ 
                margin: 0, 
                paddingLeft: '20px',
                fontSize: '13px',
                lineHeight: 1.6,
                opacity: 0.8,
              }}>
                {entry.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Feedback Modal Component
function FeedbackModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    type: 'feature',
    title: '',
    description: '',
    notify_on_release: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Fehler beim Senden');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    setFormData({
      email: '',
      name: '',
      type: 'feature',
      title: '',
      description: '',
      notify_on_release: true,
    });
    setSubmitted(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={handleClose}>
      <div style={{...styles.modalContent, maxWidth: '450px'}} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {submitted ? '✅ Danke!' : '💬 Feedback geben'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>
        <div style={styles.modalBody}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                Dein Feedback wurde eingereicht!
              </p>
              <p style={{ fontSize: '13px', opacity: 0.7 }}>
                {formData.notify_on_release 
                  ? 'Du wirst per E-Mail benachrichtigt, wenn es umgesetzt wurde.'
                  : 'Wir schauen es uns an!'}
              </p>
              <button
                onClick={handleClose}
                style={{
                  marginTop: '20px',
                  padding: '10px 24px',
                  background: '#e30613',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Schließen
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Typ-Auswahl */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '8px' }}>
                  Was möchtest du mitteilen?
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'feature', label: '✨ Feature-Wunsch', color: '#8b5cf6' },
                    { value: 'bug', label: '🐛 Bug melden', color: '#ef4444' },
                    { value: 'feedback', label: '💬 Feedback', color: '#06b6d4' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, type: opt.value})}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: '2px solid',
                        borderColor: formData.type === opt.value ? opt.color : 'rgba(255,255,255,0.2)',
                        background: formData.type === opt.value ? `${opt.color}33` : 'transparent',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* E-Mail */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>
                  E-Mail *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="deine@email.de"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Name (optional) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Dein Name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Titel */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>
                  Kurze Beschreibung *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="z.B. Favoriten-Haltestellen speichern"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Beschreibung */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>
                  Details *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Beschreibe dein Anliegen genauer..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Benachrichtigung */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                cursor: 'pointer',
                fontSize: '13px',
              }}>
                <input
                  type="checkbox"
                  checked={formData.notify_on_release}
                  onChange={(e) => setFormData({...formData, notify_on_release: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ opacity: 0.8 }}>
                  Benachrichtige mich per E-Mail, wenn es umgesetzt wurde
                </span>
              </label>

              {error && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e30613',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Wird gesendet...' : 'Absenden'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// === DISRUPTIONS BANNER ===
function DisruptionsBanner({ disruptions, getLineColor }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!disruptions || disruptions.summary?.total === 0) return null;
  
  const { tram, elevator, escalator } = disruptions;
  const hasContent = (tram?.length || 0) + (elevator?.length || 0) + (escalator?.length || 0) > 0;
  if (!hasContent) return null;

  return (
    <div style={{
      background: 'rgba(255, 152, 0, 0.15)',
      borderBottom: '1px solid rgba(255, 152, 0, 0.3)',
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          cursor: 'pointer',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '16px' }}>⚠️</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>
          {tram?.length > 0 && `${tram.length} Linienstörung${tram.length > 1 ? 'en' : ''}`}
          {tram?.length > 0 && ((elevator?.length || 0) + (escalator?.length || 0) > 0) && ' • '}
          {elevator?.length > 0 && `${elevator.length} Aufzüge`}
          {elevator?.length > 0 && escalator?.length > 0 && ' • '}
          {escalator?.length > 0 && `${escalator.length} Rolltreppen`}
        </span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
      </div>
      
      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          {tram?.map((d, i) => (
            <div key={`tram-${i}`} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 0',
              borderBottom: i < tram.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <span style={{
                minWidth: '32px',
                height: '24px',
                borderRadius: '4px',
                background: getLineColor(d.line),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
              }}>{d.line}</span>
              <span style={{ fontSize: '12px', lineHeight: 1.4, opacity: 0.9 }}>{d.message}</span>
            </div>
          ))}
          
          {elevator?.length > 0 && (
            <div style={{ marginTop: tram?.length > 0 ? '12px' : 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>🛗 Aufzugstörungen:</div>
              {elevator.map((e, i) => (
                <div key={`elev-${i}`} style={{ fontSize: '11px', opacity: 0.8, padding: '2px 0 2px 16px' }}>
                  {e.station}
                </div>
              ))}
            </div>
          )}
          
          {escalator?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>↗️ Fahrtreppenstörungen:</div>
              {escalator.slice(0, 5).map((e, i) => (
                <div key={`esc-${i}`} style={{ fontSize: '11px', opacity: 0.8, padding: '2px 0 2px 16px' }}>
                  {e.station}
                </div>
              ))}
              {escalator.length > 5 && (
                <div style={{ fontSize: '11px', opacity: 0.5, padding: '2px 0 2px 16px' }}>
                  ... und {escalator.length - 5} weitere
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === MAIN COMPONENT ===
export default function Home() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [walkTime, setWalkTime] = useState(6);
  const [selectedStop, setSelectedStop] = useState(POPULAR_STOPS[0]);
  const [selectedLines, setSelectedLines] = useState(['5']);
  const [stadtbahnOnly, setStadtbahnOnly] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [apiLimit, setApiLimit] = useState(200);
  const [disruptions, setDisruptions] = useState(null);
  const [disruptedLines, setDisruptedLines] = useState(new Set());

  const walkTimeSeconds = walkTime * 60;

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = loadSettings();
    if (saved) {
      if (saved.walkTime) setWalkTime(saved.walkTime);
      if (saved.selectedStop) {
        // Prüfen ob die gespeicherte Station noch existiert
        const found = POPULAR_STOPS.find(s => s.id === saved.selectedStop.id);
        if (found) {
          setSelectedStop(found);
        }
      }
      if (saved.selectedLines && saved.selectedLines.length > 0) {
        setSelectedLines(saved.selectedLines);
      }
      if (typeof saved.stadtbahnOnly === 'boolean') {
        setStadtbahnOnly(saved.stadtbahnOnly);
      }
    }
    setSettingsLoaded(true);
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSettings({
      walkTime,
      selectedStop,
      selectedLines,
      stadtbahnOnly,
    });
  }, [walkTime, selectedStop, selectedLines, stadtbahnOnly, settingsLoaded]);

  // Update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter departures: Stadtbahn-Filter + Linien-Filter
  const departuresWithTime = departures
    // Erst Stadtbahn-Filter (wenn aktiv)
    .filter(dep => !stadtbahnOnly || isStadtbahnLine(dep.line))
    // Dann Linien-Filter (wenn aktiv)
    .filter(dep => selectedLines.length === 0 || selectedLines.includes(dep.line))
    .map(dep => ({
      ...dep,
      secondsUntil: calculateSecondsUntil(dep.realtimeHour, dep.realtimeMinute),
      minutesUntil: Math.floor(calculateSecondsUntil(dep.realtimeHour, dep.realtimeMinute) / 60)
    }))
    // Filter: Bahnen die mehr als 1 Minute vorbei sind ausblenden
    .filter(dep => dep.secondsUntil > -60)
    .sort((a, b) => a.secondsUntil - b.secondsUntil);

  // Fetch departures
  const fetchDepartures = useCallback(async (showRefreshIndicator = false, customLimit = null) => {
    if (showRefreshIndicator) setRefreshing(true);
    
    const limit = customLimit || 200;
    
    try {
      const url = `/api/departures/${selectedStop.id}?limit=${limit}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setDepartures(data.departures);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(data.error || 'Fehler beim Laden');
      }
    } catch (err) {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStop.id]);

  const handleManualRefresh = () => {
    fetchDepartures(true);
  };

  // Auto-refresh alle 10 Sekunden
  useEffect(() => {
    if (!settingsLoaded) return;
    setLoading(true);
    fetchDepartures();
    const interval = setInterval(() => fetchDepartures(), 10000);
    return () => clearInterval(interval);
  }, [fetchDepartures, settingsLoaded]);

  // Fetch disruptions
  const fetchDisruptions = useCallback(async () => {
    try {
      const res = await fetch('/api/disruptions');
      const data = await res.json();
      setDisruptions(data);
      
      // Betroffene Linien extrahieren
      const affected = new Set();
      data.tram?.forEach(d => affected.add(d.line));
      data.bus?.forEach(d => affected.add(d.line));
      setDisruptedLines(affected);
    } catch (e) {
      console.error('Disruptions fetch error:', e);
    }
  }, []);

  // Disruptions laden und alle 5 Minuten aktualisieren
  useEffect(() => {
    fetchDisruptions();
    const interval = setInterval(fetchDisruptions, 300000);
    return () => clearInterval(interval);
  }, [fetchDisruptions]);

  // Toggle line filter
  const toggleLine = (line) => {
    setSelectedLines(prev => {
      const newLines = prev.includes(line) 
        ? prev.filter(l => l !== line)
        : [...prev, line];
      return newLines;
    });
  };

  // Select all lines
  const selectAllLines = () => {
    setSelectedLines([]);
  };

  // Mehr anzeigen
  const showMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  // Mehr laden von API
  const loadMore = () => {
    setApiLimit(prev => prev + 200);
    fetchDepartures(true, apiLimit + 200);
  };

  // Get main directions for leave timer
  const mainDirections = findMainDirections(departuresWithTime, walkTimeSeconds);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>KVB</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{selectedStop.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
              {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button style={styles.settingsBtn} onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          <button style={styles.refreshBtn} onClick={handleManualRefresh}>
            <span style={{ 
              display: 'inline-block',
              transition: 'transform 0.3s',
              transform: refreshing ? 'rotate(360deg)' : 'none',
            }}>🔄</span>
          </button>
        </div>
      </header>

      {/* Disruptions Banner */}
      <DisruptionsBanner disruptions={disruptions} getLineColor={getLineColor} />

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          {/* Gehzeit */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>
              🚶 Gehzeit zur Haltestelle
            </div>
            <WalkTimeStepper value={walkTime} onChange={setWalkTime} accentColor="#e30613" />
          </div>

          {/* Haltestelle */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>
              🚏 Haltestelle
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {POPULAR_STOPS.map(stop => (
                <button
                  key={stop.id}
                  onClick={() => {
                    setSelectedStop(stop);
                    setDisplayCount(10);
                  }}
                  style={{
                    ...styles.stopBtn,
                    background: selectedStop.id === stop.id ? '#e30613' : 'transparent',
                    borderColor: selectedStop.id === stop.id ? '#e30613' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {stop.name}
                </button>
              ))}
            </div>
          </div>

          {/* Nur Stadtbahn Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>
              🚋 Verkehrsmittel
            </div>
            <button
              onClick={() => setStadtbahnOnly(!stadtbahnOnly)}
              style={{
                padding: '10px 16px',
                border: '2px solid',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                marginRight: '8px',
                background: stadtbahnOnly ? 'rgba(0,150,63,0.2)' : 'rgba(255,255,255,0.1)',
                borderColor: stadtbahnOnly ? '#00963f' : 'rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              {stadtbahnOnly ? '✓ Nur Stadtbahn' : 'Alle (inkl. Bus)'}
            </button>
            <span style={{ fontSize: '11px', opacity: 0.5 }}>
              {stadtbahnOnly ? 'Nur Linien 1-18' : 'Zeigt auch Buslinien'}
            </span>
          </div>

          {/* Linienfilter */}
          <div>
            <div style={{ fontSize: '12px', opacity: 0.6, marginBottom: '8px' }}>
              🚋 Linienfilter
            </div>
            <button
              onClick={selectAllLines}
              style={{
                ...styles.lineFilterBtn,
                background: selectedLines.length === 0 ? '#fff' : 'transparent',
                borderColor: selectedLines.length === 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                color: selectedLines.length === 0 ? '#000' : '#fff',
              }}
            >
              Alle
            </button>
            {AVAILABLE_LINES.map(line => {
              const isSelected = selectedLines.includes(line);
              const color = getLineColor(line);
              return (
                <button
                  key={line}
                  onClick={() => toggleLine(line)}
                  style={{
                    ...styles.lineFilterBtn,
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
        </div>
      )}

      {/* Leave Timer */}
      {mainDirections.length > 0 && (
        <div style={styles.leaveTimerContainer}>
          <div style={styles.leaveTimerGrid}>
            {mainDirections.map(dir => (
              <LeaveTimerCard 
                key={dir.name} 
                direction={dir} 
                walkTimeSeconds={walkTimeSeconds}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hinweis wenn keine erreichbaren Bahnen */}
      {!loading && departuresWithTime.length > 0 && mainDirections.length === 0 && (
        <div style={styles.leaveTimerContainer}>
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>
            <p style={{ fontSize: '14px' }}>⏰ Keine Bahn mehr erreichbar mit {walkTime} min Gehzeit</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Warte auf die nächsten Abfahrten...</p>
          </div>
        </div>
      )}

      {/* Active Filter Info */}
      {(selectedLines.length > 0 || stadtbahnOnly) && (
        <div style={{
          background: 'rgba(0,150,63,0.1)',
          borderBottom: '1px solid rgba(0,150,63,0.3)',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {stadtbahnOnly && (
            <span style={{
              background: 'rgba(0,150,63,0.3)',
              padding: '2px 8px',
              borderRadius: '4px',
            }}>
              🚋 Nur Stadtbahn
            </span>
          )}
          {selectedLines.length > 0 && (
            <>
              <span>Linie{selectedLines.length > 1 ? 'n' : ''}:</span>
              {selectedLines.map(line => (
                <span key={line} style={{
                  background: getLineColor(line),
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}>
                  {line}
                </span>
              ))}
            </>
          )}
          <button
            onClick={() => {
              selectAllLines();
              setStadtbahnOnly(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: '12px',
              marginLeft: '8px',
            }}
          >
            ✕ Filter aufheben
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#e30613',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ opacity: 0.7 }}>Lade Live-Daten...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={() => fetchDepartures(true)}
              style={{
                padding: '10px 20px',
                background: '#e30613',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : departuresWithTime.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
            <p style={{ fontSize: '14px' }}>Keine Abfahrten gefunden</p>
            {selectedLines.length > 0 && (
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Versuche den Linienfilter anzupassen
              </p>
            )}
            {stadtbahnOnly && (
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Oder deaktiviere "Nur Stadtbahn" in den Einstellungen
              </p>
            )}
          </div>
        ) : (
          <>
            <p style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              opacity: 0.5,
              marginBottom: '12px',
            }}>
              {stadtbahnOnly ? 'Stadtbahn-Abfahrten' : selectedLines.length > 0 ? 'Gefilterte Abfahrten' : 'Alle Abfahrten'}
            </p>
            <div>
              {departuresWithTime.slice(0, displayCount).map(dep => {
                const isUnreachable = dep.secondsUntil < walkTimeSeconds;
                const isDisrupted = disruptedLines.has(dep.line);
                return (
                  <div 
                    key={dep.id} 
                    style={{
                      ...styles.departure,
                      opacity: isUnreachable ? 0.4 : 1,
                      borderLeft: isDisrupted ? '3px solid #ff9800' : 'none',
                    }}
                  >
                    <div style={{
                      ...styles.lineBadge,
                      background: getLineColor(dep.line),
                      position: 'relative',
                    }}>
                      {dep.line}
                      {isDisrupted && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '14px',
                          height: '14px',
                          background: '#ff9800',
                          borderRadius: '50%',
                          fontSize: '9px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}>!</span>
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {getShortDirection(dep.direction)}
                        {isUnreachable && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ff6b6b' }}>verpasst</span>}
                      </div>
                      <div style={{
                        marginTop: '3px',
                        fontSize: '11px',
                        opacity: 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span>{dep.plannedTimeFormatted}</span>
                        {dep.delay > 0 && <span style={{ color: '#ff6b6b' }}>+{dep.delay}</span>}
                        {dep.isRealtime && (
                          <span style={{
                            background: '#00c853',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 600,
                          }}>
                            LIVE
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {dep.secondsUntil < -30 ? 'weg' : dep.secondsUntil <= 30 ? 'jetzt' : `${dep.minutesUntil}'`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mehr laden Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              marginTop: '16px',
              flexWrap: 'wrap',
            }}>
              {displayCount < departuresWithTime.length && (
                <button
                  onClick={showMore}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Mehr anzeigen ({departuresWithTime.length - displayCount} weitere)
                </button>
              )}
              {departuresWithTime.length < 5 && selectedLines.length > 0 && (
                <button
                  onClick={loadMore}
                  disabled={refreshing}
                  style={{
                    padding: '10px 20px',
                    background: '#e30613',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    opacity: refreshing ? 0.6 : 1,
                  }}
                >
                  {refreshing ? 'Lädt...' : 'Mehr Abfahrten laden'}
                </button>
              )}
            </div>
            
            {/* Update Info */}
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              opacity: 0.4,
              marginTop: '20px',
            }}>
              {lastUpdate && `Aktualisiert: ${lastUpdate.toLocaleTimeString('de-DE')}`}
              {' • '}Auto-Refresh 10s
              {' • '}{departuresWithTime.filter(d => d.isRealtime).length}/{departuresWithTime.length} Echtzeit
            </div>
          </>
        )}
      </main>

      {/* Footer mit klickbarer Version */}
      <footer style={styles.footer}>
        {/* Feedback Button */}
        <button
          onClick={() => setShowFeedback(true)}
          style={{
            background: 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)',
            border: 'none',
            borderRadius: '20px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            padding: '10px 20px',
            marginBottom: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
          }}
        >
          💬 Feedback geben
        </button>
        
        <div>
          <button
            onClick={() => setShowChangelog(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '11px',
              opacity: 0.4,
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }}
          >
            KVB Monitor v{APP_VERSION}
          </button>
        </div>
        <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '4px' }}>
          Daten: VRR EFA API • Keine offizielle KVB App
        </div>
      </footer>

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      
      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
