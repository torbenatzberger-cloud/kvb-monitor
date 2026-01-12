'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import StationAutocomplete from './components/StationAutocomplete';
import DirectionFilter from './components/DirectionFilter';
import LineFilter from './components/LineFilter';
import { extractDirections, normalizeDirection } from './lib/stationUtils';
import { saveSettings as saveSettingsUtil, loadSettings as loadSettingsUtil, addRecentSearch } from './lib/storageUtils';
import Line5Map from './components/Line5Map';

// Dynamic import to prevent SSR issues
const MapContainer = dynamic(() => import('./components/map/MapContainer'), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Karte lädt...</div>
});

// === CONFIG ===
const APP_VERSION = '1.8.1';

// === CHANGELOG ===
const CHANGELOG = [
  {
    version: '1.8.1',
    date: '24.12.2025',
    changes: [
      'NEU: Filter werden automatisch zurückgesetzt beim Stationswechsel',
      'Verbessert: Keine verwirrenden Filter von vorheriger Station mehr',
      'Verhindert: Linien- und Richtungsfilter bleiben nicht hängen',
    ],
  },
  {
    version: '1.8.0',
    date: '23.12.2025',
    changes: [
      'NEU: Haltestellen-Suche mit Autocomplete – finde jede beliebige Haltestelle',
      'NEU: Richtungsfilter – wähle gezielt eine oder mehrere Richtungen',
      'NEU: Relevante Störungsmeldungen – nur für deine ausgewählten Linien & Haltestelle',
      'Verbessert: Schnellere Suche durch Caching (150ms statt 300ms)',
      'Verbessert: Settings werden persistent gespeichert',
    ],
  },
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
// These are kept for backward compatibility but now use the utility functions
function loadSettings() {
  return loadSettingsUtil('kvb-monitor-settings-v3', {
    version: 3,
    walkTime: 6,
    selectedStop: null,
    selectedLines: [],
    selectedDirections: [],
  });
}

function saveSettings(settings) {
  saveSettingsUtil('kvb-monitor-settings-v3', {
    ...settings,
    version: 3,
  });
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

// === RELEVANT DISRUPTIONS ===
/**
 * Relevante Störungsmeldungen - nur Linien & Haltestelle die aktuell angezeigt werden
 * Wird unterhalb der Leave Timer Cards angezeigt
 */
function RelevantDisruptions({ disruptions, selectedStop, displayedLines, getLineColor }) {
  const [expanded, setExpanded] = useState(true); // Default expanded für bessere Sichtbarkeit

  if (!disruptions || !selectedStop) return null;

  // Filter: Nur Linienstörungen für aktuell angezeigte Linien
  const relevantTramDisruptions = (disruptions.tram || []).filter(d =>
    displayedLines.includes(d.line)
  );

  // Filter: Nur Aufzug/Rolltreppe für die aktuell ausgewählte Haltestelle
  const stationName = selectedStop.name.toLowerCase();
  const relevantElevator = (disruptions.elevator || []).filter(e =>
    e.station.toLowerCase().includes(stationName) || stationName.includes(e.station.toLowerCase())
  );
  const relevantEscalator = (disruptions.escalator || []).filter(e =>
    e.station.toLowerCase().includes(stationName) || stationName.includes(e.station.toLowerCase())
  );

  const totalRelevant = relevantTramDisruptions.length + relevantElevator.length + relevantEscalator.length;

  if (totalRelevant === 0) return null;

  return (
    <div style={{
      margin: '16px',
      borderRadius: '12px',
      background: 'rgba(255, 152, 0, 0.1)',
      border: '1px solid rgba(255, 152, 0, 0.3)',
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          cursor: 'pointer',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
            Aktuelle Störungen
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            {relevantTramDisruptions.length > 0 && `${relevantTramDisruptions.length} Linie${relevantTramDisruptions.length > 1 ? 'n' : ''}`}
            {relevantTramDisruptions.length > 0 && (relevantElevator.length + relevantEscalator.length > 0) && ' • '}
            {relevantElevator.length > 0 && `${relevantElevator.length} Aufzug${relevantElevator.length > 1 ? 'e' : ''}`}
            {relevantElevator.length > 0 && relevantEscalator.length > 0 && ' • '}
            {relevantEscalator.length > 0 && `${relevantEscalator.length} Rolltreppe${relevantEscalator.length > 1 ? 'n' : ''}`}
          </div>
        </div>
        <span style={{ fontSize: '12px', opacity: 0.5 }}>{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Linienstörungen */}
          {relevantTramDisruptions.map((d, i) => (
            <div key={`tram-${i}`} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 12px',
              marginBottom: i < relevantTramDisruptions.length - 1 ? '8px' : 0,
              background: 'rgba(255, 152, 0, 0.15)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 152, 0, 0.25)',
            }}>
              <span style={{
                minWidth: '36px',
                height: '28px',
                borderRadius: '6px',
                background: getLineColor(d.line),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}>{d.line}</span>
              <span style={{ fontSize: '13px', lineHeight: 1.5, flex: 1 }}>{d.message}</span>
            </div>
          ))}

          {/* Aufzugstörungen an dieser Haltestelle */}
          {relevantElevator.length > 0 && (
            <div style={{
              marginTop: relevantTramDisruptions.length > 0 ? '12px' : 0,
              padding: '10px 12px',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛗</span>
                <span>Aufzug außer Betrieb</span>
              </div>
              {relevantElevator.map((e, i) => (
                <div key={`elev-${i}`} style={{ fontSize: '12px', opacity: 0.9, padding: '4px 0 4px 24px' }}>
                  {e.station}
                </div>
              ))}
            </div>
          )}

          {/* Fahrtreppenstörungen an dieser Haltestelle */}
          {relevantEscalator.length > 0 && (
            <div style={{
              marginTop: (relevantTramDisruptions.length > 0 || relevantElevator.length > 0) ? '12px' : 0,
              padding: '10px 12px',
              background: 'rgba(255, 152, 0, 0.1)',
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>↗️</span>
                <span>Rolltreppe außer Betrieb</span>
              </div>
              {relevantEscalator.map((e, i) => (
                <div key={`esc-${i}`} style={{ fontSize: '12px', opacity: 0.9, padding: '4px 0 4px 24px' }}>
                  {e.station}
                </div>
              ))}
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
  const [selectedStop, setSelectedStop] = useState(null); // Changed: null instead of POPULAR_STOPS[0]
  const [selectedLines, setSelectedLines] = useState([]);
  const [selectedDirections, setSelectedDirections] = useState([]); // NEW: Direction filter
  const [availableLines, setAvailableLines] = useState([]); // NEW: Available lines from departures
  const [availableDirections, setAvailableDirections] = useState([]); // NEW: Available directions from departures
  const [showSettings, setShowSettings] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [tick, setTick] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [displayCount, setDisplayCount] = useState(10);
  const [disruptions, setDisruptions] = useState(null);
  const [disruptedLines, setDisruptedLines] = useState(new Set());
  const [showLineMap, setShowLineMap] = useState(false); // NEW: Toggle für Linie 5 Karte

  const walkTimeSeconds = walkTime * 60;

  // Load settings from localStorage on mount (with v2 → v3 migration)
  useEffect(() => {
    const saved = loadSettings();

    // Migration from v2 to v3
    if (!saved.version || saved.version < 3) {
      const v2Settings = loadSettingsUtil('kvb-monitor-settings-v2');
      if (v2Settings && Object.keys(v2Settings).length > 0) {
        // Migrate v2 settings
        if (v2Settings.walkTime) setWalkTime(v2Settings.walkTime);
        if (v2Settings.selectedStop) setSelectedStop(v2Settings.selectedStop);
        if (v2Settings.selectedLines) setSelectedLines(v2Settings.selectedLines);
        // New in v3: selectedDirections defaults to empty (all directions)
        setSelectedDirections([]);

        // Save migrated settings to v3
        saveSettings({
          walkTime: v2Settings.walkTime || 6,
          selectedStop: v2Settings.selectedStop || null,
          selectedLines: v2Settings.selectedLines || [],
          selectedDirections: [],
        });
        setSettingsLoaded(true);
        return;
      }
    }

    // Load v3 settings
    if (saved.walkTime) setWalkTime(saved.walkTime);
    if (saved.selectedStop) setSelectedStop(saved.selectedStop);
    if (saved.selectedLines) setSelectedLines(saved.selectedLines);
    if (saved.selectedDirections) setSelectedDirections(saved.selectedDirections);

    setSettingsLoaded(true);
  }, []);

  // Reset filters when station changes
  useEffect(() => {
    if (!settingsLoaded) return;
    // Reset line and direction filters when station changes
    setSelectedLines([]);
    setSelectedDirections([]);
  }, [selectedStop?.id, settingsLoaded]); // Trigger when station ID changes

  // Save settings when they change
  useEffect(() => {
    if (!settingsLoaded) return;
    saveSettings({
      walkTime,
      selectedStop,
      selectedLines,
      selectedDirections,
    });
  }, [walkTime, selectedStop, selectedLines, selectedDirections, settingsLoaded]);

  // Update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Extract available lines and directions from departures
  useEffect(() => {
    if (departures.length > 0) {
      // Extract unique lines and sort
      const lines = [...new Set(departures.map(d => d.line))].sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true });
      });
      setAvailableLines(lines);

      // Extract unique directions - filtered by selected lines if any
      const filteredDepartures = selectedLines.length > 0
        ? departures.filter(dep => selectedLines.includes(dep.line))
        : departures;

      const directions = extractDirections(filteredDepartures, 'Köln');
      setAvailableDirections(directions);

      // Clean up selected directions that are no longer available
      if (selectedDirections.length > 0) {
        const validDirections = selectedDirections.filter(dir => directions.includes(dir));
        if (validDirections.length !== selectedDirections.length) {
          setSelectedDirections(validDirections);
        }
      }
    } else {
      setAvailableLines([]);
      setAvailableDirections([]);
    }
  }, [departures, selectedLines]);

  // Filter departures: Linien-Filter + Richtungs-Filter
  const departuresWithTime = departures
    // Linien-Filter (wenn aktiv)
    .filter(dep => selectedLines.length === 0 || selectedLines.includes(dep.line))
    // NEU: Richtungs-Filter (wenn aktiv)
    .filter(dep => {
      if (selectedDirections.length === 0) return true; // Alle Richtungen
      const normalized = normalizeDirection(dep.direction, 'Köln');
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
    if (!selectedStop) {
      setLoading(false);
      setDepartures([]);
      return;
    }

    if (showRefreshIndicator) setRefreshing(true);

    try {
      const url = `/api/departures/${selectedStop.id}?limit=200`;
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
  }, [selectedStop]);

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

  // Infinite Scroll: Mehr anzeigen wenn User scrollt
  useEffect(() => {
    const handleScroll = () => {
      // Prüfe ob User am Ende der Seite ist
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;

      // Wenn noch 200px bis zum Ende → lade mehr
      if (scrollPosition >= pageHeight - 200) {
        if (displayCount < departuresWithTime.length) {
          setDisplayCount(prev => Math.min(prev + 20, departuresWithTime.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayCount, departuresWithTime.length]);

  // Get main directions for leave timer
  const mainDirections = findMainDirections(departuresWithTime, walkTimeSeconds, selectedDirections);

  // Get list of displayed lines for disruption filtering
  const displayedLines = [...new Set(departuresWithTime.map(dep => dep.line))];

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
            <div style={{ fontWeight: 700, fontSize: '16px' }}>
              {selectedStop ? selectedStop.name : 'KVB Monitor'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
              {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button
            style={{
              ...styles.settingsBtn,
              background: showLineMap ? '#00963f' : 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setShowLineMap(!showLineMap)}
            title="Linie 5 Live-Karte"
          >
            🗺️
          </button>
          <button style={styles.settingsBtn} onClick={() => setShowSettings(!showSettings)}>
            ⚙️
          </button>
          <button style={styles.refreshBtn} onClick={handleManualRefresh} disabled={!selectedStop}>
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
              apiEndpoint="/api/stations/search"
              placeholder="Haltestelle suchen..."
              onSelect={(station) => {
                setSelectedStop(station);
                addRecentSearch('kvb-recent-searches', station);
                setDisplayCount(10);
              }}
              initialValue={selectedStop}
              accentColor="#e30613"
              recentSearchesKey="kvb-recent-searches"
            />
          </div>

          {/* 2. Linienfilter - nur wenn Haltestelle gewählt */}
          {selectedStop && availableLines.length > 0 && (
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
          {selectedStop && availableDirections.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                🎯 Richtungen
              </div>
              <DirectionFilter
                availableDirections={availableDirections}
                selectedDirections={selectedDirections}
                onChange={setSelectedDirections}
                accentColor="#e30613"
              />
            </div>
          )}

          {/* 4. Gehzeit */}
          <div style={{ paddingTop: selectedStop ? '12px' : '0', borderTop: selectedStop ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
              🚶 Gehzeit zur Haltestelle
            </div>
            <WalkTimeStepper value={walkTime} onChange={setWalkTime} accentColor="#e30613" />
          </div>
        </div>
      )}

      {/* Line 5 Map View */}
      {showLineMap && (
        <Line5Map
          selectedStop={selectedStop}
          departures={departures}
        />
      )}

      {/* Leave Timer */}
      {!showLineMap && mainDirections.length > 0 && (
        <div style={styles.leaveTimerContainer}>
          <div style={{
            ...styles.leaveTimerGrid,
            gridTemplateColumns: mainDirections.length === 1 ? '1fr' : '1fr 1fr',
          }}>
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

      {/* Live Map - TEMPORARILY DISABLED */}
      {/* TODO: Re-enable after further development */}
      {false && selectedStop && (
        <MapContainer
          selectedStation={selectedStop}
          selectedLines={selectedLines}
          city="cologne"
          accentColor="#e30613"
        />
      )}

      {/* Hinweis wenn keine erreichbaren Bahnen */}
      {!showLineMap && !loading && departuresWithTime.length > 0 && mainDirections.length === 0 && (
        <div style={styles.leaveTimerContainer}>
          <div style={{ textAlign: 'center', padding: '20px', opacity: 0.7 }}>
            <p style={{ fontSize: '14px' }}>⏰ Keine Bahn mehr erreichbar mit {walkTime} min Gehzeit</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Warte auf die nächsten Abfahrten...</p>
          </div>
        </div>
      )}

      {/* Relevant Disruptions - unterhalb der Leave Timer Cards */}
      {!showLineMap && <RelevantDisruptions
        disruptions={disruptions}
        selectedStop={selectedStop}
        displayedLines={displayedLines}
        getLineColor={getLineColor}
      />}

      {/* Active Filter Info */}
      {!showLineMap && (selectedLines.length > 0 || selectedDirections.length > 0) && (
        <div style={{
          background: 'rgba(227, 6, 19, 0.1)',
          borderBottom: '1px solid rgba(227, 6, 19, 0.3)',
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
          <button
            onClick={() => {
              setSelectedLines([]);
              setSelectedDirections([]);
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
      {!showLineMap && <main style={styles.main}>
        {!selectedStop ? (
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
              {(selectedLines.length > 0 || selectedDirections.length > 0) ? 'Gefilterte Abfahrten' : 'Alle Abfahrten'}
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

            {/* Infinite Scroll Indicator */}
            {displayCount < departuresWithTime.length && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                fontSize: '12px',
                opacity: 0.6,
              }}>
                Scrolle für mehr Abfahrten ({departuresWithTime.length - displayCount} weitere)
              </div>
            )}
            
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
      </main>}

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
