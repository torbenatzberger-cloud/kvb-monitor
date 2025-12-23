'use client';

import { useState, useEffect, useCallback } from 'react';
import StationAutocomplete from '../components/StationAutocomplete';
import DirectionFilter from '../components/DirectionFilter';
import LineFilter from '../components/LineFilter';
import { extractDirections, normalizeDirection } from '../lib/stationUtils';
import { saveSettings as saveSettingsUtil, loadSettings as loadSettingsUtil, addRecentSearch } from '../lib/storageUtils';

// === CONFIG ===
const APP_VERSION = '1.8.0';

// === CHANGELOG ===
const CHANGELOG = [
  {
    version: '1.8.0',
    date: '23.12.2025',
    changes: [
      'NEU: Haltestellen-Suche mit Autocomplete – finde jede beliebige Station in München',
      'NEU: Linienfilter – wähle gezielt eine oder mehrere Linien',
      'NEU: Richtungsfilter – wähle gezielt eine oder mehrere Richtungen',
      'NEU: Recent Searches – schneller Zugriff auf häufig genutzte Haltestellen',
      'Verbessert: Settings werden persistent gespeichert (inkl. Haltestelle)',
    ],
  },
  {
    version: '1.1.0',
    date: '19.12.2025',
    changes: [
      'Vereinfacht: Stationsauswahl entfernt (fix auf Theodolindenplatz)',
      'Gehzeit-Einstellung jetzt immer sichtbar',
      'UI aufgeräumt',
    ],
  },
  {
    version: '1.0.3',
    date: '19.12.2025',
    changes: [
      'Fix: Vergangene Bahnen werden jetzt korrekt als "weg" angezeigt',
      'Fix: Bahnen die länger als 1 Min weg sind werden ausgeblendet',
      'Fix: 12-Stunden-Schwelle für Tag/Nacht-Berechnung',
    ],
  },
  {
    version: '1.0.2',
    date: '19.12.2025',
    changes: [
      'Fix: Hydration-Fehler vollständig behoben',
      'Fix: Uhrzeit-Anzeige korrigiert',
      'Fix: "verpasst" Label korrigiert',
    ],
  },
  {
    version: '1.0.1',
    date: '19.12.2025',
    changes: [
      'Fix: Hydration-Fehler behoben (alle Bahnen zeigten "jetzt")',
    ],
  },
  {
    version: '1.0.0',
    date: '19.12.2025',
    changes: [
      'Erste Release für München',
      'MVG API Integration (U-Bahn, S-Bahn, Tram)',
      'Losgeh-Timer mit Countdown',
      'Filter: Linie 25 Richtung Max-Weber-Platz',
      'Gehzeit per +/- einstellbar (1-30 min)',
      'Feedback-System – Bug melden, Feature wünschen',
      'Auto-Refresh alle 10 Sekunden',
    ],
  },
];

// MVG Linienfarben
const LINE_COLORS = {
  // U-Bahn
  'U1': '#52822f', 'U2': '#c20831', 'U3': '#ec6726', 'U4': '#00a984',
  'U5': '#bc7a00', 'U6': '#0065ae', 'U7': '#52822f', 'U8': '#c20831',
  // S-Bahn
  'S1': '#16c0e9', 'S2': '#76b82a', 'S3': '#7b107d', 'S4': '#c2003d',
  'S5': '#00805a', 'S6': '#00975f', 'S7': '#943126', 'S8': '#000000',
  // Tram
  '12': '#96c11e', '15': '#96c11e', '16': '#96c11e', '17': '#96c11e',
  '18': '#96c11e', '19': '#96c11e', '20': '#96c11e', '21': '#96c11e',
  '22': '#96c11e', '23': '#96c11e', '25': '#96c11e', '27': '#96c11e', '28': '#96c11e',
};

// All available MVG lines (dynamically extracted from departures)
const ALL_LINE_TYPES = ['U', 'S', 'Tram', 'Bus'];

// === HELPERS ===
function getLineColor(line) {
  const clean = String(line).trim();
  if (LINE_COLORS[clean]) return LINE_COLORS[clean];
  if (clean.startsWith('U')) return '#0065ae';
  if (clean.startsWith('S')) return '#16c0e9';
  if (/^\d+$/.test(clean)) return '#96c11e';
  return '#666666';
}

function calculateSecondsUntil(hour, minute) {
  const now = new Date();
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let departureSeconds = hour * 3600 + minute * 60;
  
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
  let short = direction.replace(/^München\s+/i, '');
  return short;
}

function findMainDirections(departures, walkTimeSeconds, selectedDirections = []) {
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

  // Timer Logic:
  // - Default: Show 2 timers
  // - If exactly 1 direction selected: Show 1 timer
  // - If 2+ directions selected: Show 2 timers
  const maxDirections = selectedDirections.length === 1 ? 1 : 2;
  return directions.slice(0, maxDirections);
}

// === localStorage Helpers (legacy - now using utility functions) ===
function loadSettings() {
  return loadSettingsUtil('mvg-monitor-settings-v3', {
    version: 3,
    walkTime: 7,
    selectedStation: null,
    selectedLines: [],
    selectedDirections: [],
  });
}

function saveSettings(settings) {
  saveSettingsUtil('mvg-monitor-settings-v3', {
    ...settings,
    version: 3,
  });
}

// === STYLES ===
const styles = {
  header: {
    background: 'linear-gradient(90deg, #0065ae 0%, #004a82 100%)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0, 101, 174, 0.3)',
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
    fontSize: '11px',
    color: '#0065ae',
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
  leaveTimerSingle: {
    maxWidth: '300px',
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
    fontSize: '14px',
    color: '#fff',
  },
  settingsPanel: {
    background: 'rgba(0,0,0,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '16px',
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
  footer: {
    textAlign: 'center',
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: '20px',
  },
  // Walk Time Stepper
  walkTimeStepper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  stepperBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '24px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  stepperValue: {
    minWidth: '80px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: '700',
  },
};

// === COMPONENTS ===
function ProgressBar({ secondsUntilLeave, walkTimeSeconds, mounted = false }) {
  const maxBuffer = walkTimeSeconds;
  const timeUsed = maxBuffer - secondsUntilLeave;
  const progress = mounted ? Math.min(100, Math.max(0, (timeUsed / maxBuffer) * 100)) : 0;
  
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

function LeaveTimerCard({ direction, walkTimeSeconds, mounted = false }) {
  const { name, nextDeparture } = direction;
  const secondsUntilLeave = Math.max(0, nextDeparture.secondsUntil - walkTimeSeconds);
  const isUrgent = mounted && secondsUntilLeave <= 30;
  const isSoon = mounted && secondsUntilLeave > 30 && secondsUntilLeave <= 120;

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
      <div style={{ 
        fontSize: '16px', 
        fontWeight: 700, 
        marginBottom: '12px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
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
        {!mounted ? '--:--' : secondsUntilLeave <= 0 ? 'JETZT!' : formatTime(secondsUntilLeave)}
      </div>
      <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '4px' }}>
        {!mounted ? 'wird geladen...' : secondsUntilLeave <= 0 ? 'Loslaufen!' : 'bis loslaufen'}
      </div>
      
      <ProgressBar secondsUntilLeave={secondsUntilLeave} walkTimeSeconds={walkTimeSeconds} mounted={mounted} />
      
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
        {!mounted ? '⏳ Laden...' : isUrgent ? '🏃 JETZT LOS!' : isSoon ? '👟 Fertig machen!' : '😌 Zeit genug'}
      </div>
      <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '10px' }}>
        {nextDeparture.line} • Abfahrt {nextDeparture.realtimeTimeFormatted}
        {nextDeparture.delay > 0 && ` (+${nextDeparture.delay})`}
      </div>
    </div>
  );
}

function WalkTimeStepper({ value, onChange, accentColor = '#0065ae' }) {
  const decrease = () => {
    if (value > 1) onChange(value - 1);
  };
  
  const increase = () => {
    if (value < 30) onChange(value + 1);
  };

  return (
    <div style={styles.walkTimeStepper}>
      <button 
        onClick={decrease}
        style={{
          ...styles.stepperBtn,
          opacity: value <= 1 ? 0.3 : 1,
          cursor: value <= 1 ? 'not-allowed' : 'pointer',
        }}
        disabled={value <= 1}
      >
        −
      </button>
      <div style={styles.stepperValue}>
        <span style={{ color: accentColor }}>{value}</span> min
      </div>
      <button 
        onClick={increase}
        style={{
          ...styles.stepperBtn,
          opacity: value >= 30 ? 0.3 : 1,
          cursor: value >= 30 ? 'not-allowed' : 'pointer',
        }}
        disabled={value >= 30}
      >
        +
      </button>
    </div>
  );
}

// Changelog Modal Component
function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
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
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
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
        <div style={{ padding: '20px' }}>
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
                  background: idx === 0 ? '#0065ae' : 'rgba(255,255,255,0.1)',
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
        body: JSON.stringify({
          ...formData,
          title: `[München] ${formData.title}`, // Präfix für München
        }),
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
    <div style={{
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
    }} onClick={handleClose}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '16px',
        maxWidth: '450px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
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
        <div style={{ padding: '20px' }}>
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
                  background: '#0065ae',
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
                  background: '#0065ae',
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

// === MAIN COMPONENT ===
export default function MuenchenMonitor() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [walkTime, setWalkTime] = useState(7);
  const [selectedStation, setSelectedStation] = useState(null); // Changed: null instead of STATION
  const [selectedLines, setSelectedLines] = useState([]); // NEW: Line filter
  const [selectedDirections, setSelectedDirections] = useState([]); // NEW: Direction filter
  const [availableLines, setAvailableLines] = useState([]); // NEW: Available lines from departures
  const [availableDirections, setAvailableDirections] = useState([]); // NEW: Available directions from departures
  const [showSettings, setShowSettings] = useState(false); // NEW: Settings panel toggle
  const [showChangelog, setShowChangelog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [mounted, setMounted] = useState(false);

  const walkTimeSeconds = walkTime * 60;

  // Load settings from localStorage on mount (with v2 → v3 migration)
  useEffect(() => {
    const saved = loadSettings();

    // Migration from v2 to v3
    if (!saved.version || saved.version < 3) {
      const v2Settings = loadSettingsUtil('mvg-monitor-settings');
      if (v2Settings && Object.keys(v2Settings).length > 0) {
        // Migrate v2 settings
        if (v2Settings.walkTime) setWalkTime(v2Settings.walkTime);
        // v2 didn't have selectedStation, selectedLines, selectedDirections
        setSelectedStation(null);
        setSelectedLines([]);
        setSelectedDirections([]);

        // Save migrated settings to v3
        saveSettings({
          walkTime: v2Settings.walkTime || 7,
          selectedStation: null,
          selectedLines: [],
          selectedDirections: [],
        });
        setSettingsLoaded(true);
        setMounted(true);
        return;
      }
    }

    // Load v3 settings
    if (saved.walkTime) setWalkTime(saved.walkTime);
    if (saved.selectedStation) setSelectedStation(saved.selectedStation);
    if (saved.selectedLines) setSelectedLines(saved.selectedLines);
    if (saved.selectedDirections) setSelectedDirections(saved.selectedDirections);

    setSettingsLoaded(true);
    setMounted(true); // Client is now hydrated
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSettings({
      walkTime,
      selectedStation,
      selectedLines,
      selectedDirections,
    });
  }, [walkTime, selectedStation, selectedLines, selectedDirections, settingsLoaded]);

  // Update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Extract available lines and directions from departures
  useEffect(() => {
    if (departures.length > 0) {
      // Extract unique lines
      const lines = [...new Set(departures.map(d => d.line))].sort((a, b) => {
        // Sort: U-Bahn, S-Bahn, Tram, Bus
        const aType = a.startsWith('U') ? 0 : a.startsWith('S') ? 1 : /^\d+$/.test(a) ? 2 : 3;
        const bType = b.startsWith('U') ? 0 : b.startsWith('S') ? 1 : /^\d+$/.test(b) ? 2 : 3;
        if (aType !== bType) return aType - bType;
        return a.localeCompare(b, undefined, { numeric: true });
      });
      setAvailableLines(lines);

      // Extract unique directions
      const directions = extractDirections(departures, 'München');
      setAvailableDirections(directions);
    } else {
      setAvailableLines([]);
      setAvailableDirections([]);
    }
  }, [departures]);

  // Process departures with time calculations + FILTER (Linien + Richtungen)
  const departuresWithTime = departures
    // NEU: Linienfilter (wenn aktiv)
    .filter(dep => selectedLines.length === 0 || selectedLines.includes(dep.line))
    // NEU: Richtungsfilter (wenn aktiv)
    .filter(dep => {
      if (selectedDirections.length === 0) return true; // Alle Richtungen
      const normalized = normalizeDirection(dep.direction, 'München');
      return selectedDirections.some(selected => normalized.includes(selected));
    })
    .map(dep => ({
      ...dep,
      secondsUntil: calculateSecondsUntil(dep.realtimeHour, dep.realtimeMinute),
      minutesUntil: Math.floor(calculateSecondsUntil(dep.realtimeHour, dep.realtimeMinute) / 60)
    }))
    // Filter: Bahnen die mehr als 1 Minute vorbei sind ausblenden
    .filter(dep => dep.secondsUntil > -60)
    .sort((a, b) => a.secondsUntil - b.secondsUntil);

  // Fetch departures
  const fetchDepartures = useCallback(async (showRefreshIndicator = false) => {
    if (!selectedStation) {
      setLoading(false);
      setDepartures([]);
      return;
    }

    if (showRefreshIndicator) setRefreshing(true);

    try {
      const url = `/api/muenchen/departures/${selectedStation.id}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success !== false && data.departures) {
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
  }, [selectedStation]);

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

  // Mehr anzeigen
  const showMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  // Get main direction for leave timer
  const mainDirection = findMainDirections(departuresWithTime, walkTimeSeconds, selectedDirections)[0] || null;

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
          <div style={styles.logo}>MVG</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>
              {selectedStation ? selectedStation.name : 'MVG Monitor'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
              {mounted ? currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </div>
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button style={styles.settingsBtn} onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          <button style={styles.refreshBtn} onClick={handleManualRefresh} disabled={!selectedStation}>
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.3s',
              transform: refreshing ? 'rotate(360deg)' : 'none',
            }}>🔄</span>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          {/* 1. Haltestelle */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
              🚏 Haltestelle
            </div>
            <StationAutocomplete
              apiEndpoint="/api/muenchen/stations/search"
              placeholder="Haltestelle suchen..."
              onSelect={(station) => {
                setSelectedStation(station);
                addRecentSearch('mvg-recent-searches', station);
                setDisplayCount(10);
              }}
              initialValue={selectedStation}
              accentColor="#0065ae"
              recentSearchesKey="mvg-recent-searches"
            />
          </div>

          {/* 2. Linienfilter - nur wenn Haltestelle gewählt */}
          {selectedStation && availableLines.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                🚋 Linien
              </div>
              <LineFilter
                availableLines={availableLines}
                selectedLines={selectedLines}
                onChange={setSelectedLines}
                getLineColor={getLineColor}
              />
            </div>
          )}

          {/* 3. Richtungsfilter - nur wenn Linien verfügbar */}
          {selectedStation && availableDirections.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                🎯 Richtungen
              </div>
              <DirectionFilter
                availableDirections={availableDirections}
                selectedDirections={selectedDirections}
                onChange={setSelectedDirections}
                accentColor="#0065ae"
              />
            </div>
          )}

          {/* 4. Gehzeit */}
          <div style={{ paddingTop: selectedStation ? '12px' : '0', borderTop: selectedStation ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
              🚶 Gehzeit zur Haltestelle
            </div>
            <WalkTimeStepper value={walkTime} onChange={setWalkTime} accentColor="#0065ae" />
          </div>
        </div>
      )}

      {/* Active Filter Info */}
      {(selectedLines.length > 0 || selectedDirections.length > 0) && (
        <div style={{
          background: 'rgba(150, 193, 30, 0.1)',
          borderBottom: '1px solid rgba(150, 193, 30, 0.3)',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
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
          {selectedLines.length > 0 && selectedDirections.length > 0 && <span>•</span>}
          {selectedDirections.length > 0 && (
            <span>Richtung{selectedDirections.length > 1 ? 'en' : ''}: {selectedDirections.join(', ')}</span>
          )}
        </div>
      )}

      {/* Leave Timer - Single */}
      {mainDirection && (
        <div style={styles.leaveTimerContainer}>
          <div style={styles.leaveTimerSingle}>
            <LeaveTimerCard 
              direction={mainDirection} 
              walkTimeSeconds={walkTimeSeconds}
              mounted={mounted}
            />
          </div>
        </div>
      )}

      {/* Hinweis wenn keine erreichbaren Bahnen */}
      {!loading && departuresWithTime.length > 0 && !mainDirection && (
        <div style={styles.leaveTimerContainer}>
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>
            <p style={{ fontSize: '14px' }}>⏰ Keine Bahn mehr erreichbar mit {walkTime} min Gehzeit</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Warte auf die nächsten Abfahrten...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {!selectedStation ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚏</div>
            <p style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
              Wähle eine Haltestelle
            </p>
            <p style={{ fontSize: '13px', opacity: 0.7, maxWidth: '300px', margin: '0 auto' }}>
              Öffne die Einstellungen (⚙️) und suche nach deiner Haltestelle
            </p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#0065ae',
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
                background: '#0065ae',
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
            {(selectedLines.length > 0 || selectedDirections.length > 0) && (
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Versuche den Filter anzupassen
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
              Nächste Abfahrten
            </p>
            <div>
              {departuresWithTime.slice(0, displayCount).map((dep, index) => {
                const isUnreachable = mounted && dep.secondsUntil < walkTimeSeconds;
                return (
                  <div 
                    key={`${dep.line}-${dep.direction}-${index}`} 
                    style={{
                      ...styles.departure,
                      opacity: isUnreachable ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      ...styles.lineBadge,
                      background: getLineColor(dep.line),
                    }}>
                      {dep.line}
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
                        {dep.platform && <span>• Gleis {dep.platform}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {!mounted ? '--' : dep.secondsUntil < -30 ? 'weg' : dep.secondsUntil <= 30 ? 'jetzt' : `${dep.minutesUntil}'`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mehr anzeigen Button */}
            {displayCount < departuresWithTime.length && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginTop: '16px',
              }}>
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
              </div>
            )}
            
            {/* Update Info */}
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              opacity: 0.4,
              marginTop: '20px',
            }}>
              {mounted && lastUpdate && `Aktualisiert: ${lastUpdate.toLocaleTimeString('de-DE')}`}
              {mounted && ' • '}Auto-Refresh 10s
            </div>
          </>
        )}
      </main>

      {/* Footer */}
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
            MVG Monitor v{APP_VERSION}
          </button>
        </div>
        <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '4px' }}>
          Daten: MVG API • Keine offizielle MVG App
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