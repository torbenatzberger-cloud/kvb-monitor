'use client';

import { useState, useEffect, useCallback } from 'react';
import LineFilter from '../components/LineFilter';
import DirectionFilter from '../components/DirectionFilter';

// === CONFIG ===
const APP_VERSION = '1.0.0';

// Transport type configuration
const TRANSPORT_TYPES = {
  ICE: { label: 'ICE/IC', color: '#c91432', order: 0 },
  REGIONAL: { label: 'RE/RB', color: '#ec192e', order: 1 },
  SBAHN: { label: 'S-Bahn', color: '#006f35', order: 2 },
  UBAHN: { label: 'U-Bahn', color: '#0065ae', order: 3 },
  TRAM: { label: 'Tram', color: '#d82020', order: 4 },
  BUS: { label: 'Bus', color: '#9b59b6', order: 5 },
  FERRY: { label: 'Fähre', color: '#00a4d3', order: 6 },
  OTHER: { label: 'Andere', color: '#666666', order: 7 },
};

// === TYPES ===
interface Station {
  id: string;
  name: string;
  place: string;
  latitude?: number;
  longitude?: number;
  products?: { [key: string]: boolean };
}

interface Departure {
  line: string;
  direction: string;
  plannedWhen: string;
  realtimeWhen: string;
  delay: number;
  platform: string | null;
  cancelled: boolean;
  transportType: string;
  product?: string;
  operator?: string;
  secondsUntil?: number;
  minutesUntil?: number;
}

// === HELPERS ===
function getTransportColor(transportType: string): string {
  return TRANSPORT_TYPES[transportType as keyof typeof TRANSPORT_TYPES]?.color || '#666666';
}

function getLineColor(line: string): string {
  // U-Bahn
  if (line.startsWith('U')) return '#0065ae';
  // S-Bahn
  if (line.startsWith('S')) return '#006f35';
  // ICE/IC
  if (line.startsWith('ICE') || line.startsWith('IC ') || line.startsWith('EC ') || line.startsWith('RJ ')) return '#c91432';
  // RE/RB
  if (line.startsWith('RE') || line.startsWith('RB') || line.startsWith('FEX') || line.startsWith('FLX')) return '#ec192e';
  // Tram
  if (line.startsWith('STR') || /^M?\d+$/.test(line)) return '#d82020';
  // Bus
  if (line.startsWith('Bus')) return '#9b59b6';
  return '#666666';
}

function calculateSecondsUntil(isoTimestamp: string): number {
  const departureTime = new Date(isoTimestamp);
  const now = new Date();
  return Math.floor((departureTime.getTime() - now.getTime()) / 1000);
}

function formatDepartureTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function normalizeDirection(direction: string): string {
  if (!direction) return '';
  // Remove common city prefixes
  let normalized = direction
    .replace(/^Berlin\s+/i, '')
    .replace(/^Hamburg\s+/i, '')
    .replace(/^München\s+/i, '')
    .replace(/^Frankfurt\s*\(.*?\)\s*/i, '')
    .replace(/^Köln\s+/i, '')
    .trim();
  return normalized;
}

function extractDirections(departures: Departure[]): string[] {
  const directionSet = new Set<string>();
  departures.forEach(dep => {
    if (dep.direction) {
      const normalized = normalizeDirection(dep.direction);
      if (normalized) directionSet.add(normalized);
    }
  });
  return Array.from(directionSet).sort();
}

// === STYLES ===
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'linear-gradient(90deg, #1a1a2e 0%, #0f0f1a 100%)',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #000 0%, #333 100%)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  settingsPanel: {
    background: 'rgba(0,0,0,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '16px',
  },
  searchContainer: {
    position: 'relative' as const,
  },
  searchInputWrapper: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  gpsButton: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.95)',
    borderRadius: '12px',
    marginTop: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    maxHeight: '300px',
    overflow: 'auto',
    zIndex: 100,
  },
  searchResultItem: {
    padding: '14px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s',
  },
  leaveTimerContainer: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  leaveTimerGrid: {
    display: 'grid',
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
    minWidth: '56px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '13px',
    color: '#fff',
  },
  filterSection: {
    marginBottom: '20px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    opacity: 0.9,
  },
  transportTypeFilter: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  transportTypeBtn: {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '2px solid',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
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
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    textAlign: 'center' as const,
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    marginTop: '20px',
  },
};

// === COMPONENTS ===
function ProgressBar({ secondsUntilLeave, walkTimeSeconds, mounted = false }: { secondsUntilLeave: number; walkTimeSeconds: number; mounted?: boolean }) {
  const maxBuffer = walkTimeSeconds;
  const timeUsed = maxBuffer - secondsUntilLeave;
  const progress = mounted ? Math.min(100, Math.max(0, (timeUsed / maxBuffer) * 100)) : 0;

  let barColor = '#00c853';
  if (progress >= 95) barColor = '#e30613';
  else if (progress >= 80) barColor = '#f39200';

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

function LeaveTimerCard({ departure, walkTimeSeconds, mounted = false }: { departure: Departure; walkTimeSeconds: number; mounted?: boolean }) {
  const secondsUntilLeave = Math.max(0, (departure.secondsUntil || 0) - walkTimeSeconds);
  const isUrgent = mounted && secondsUntilLeave <= 30;
  const isSoon = mounted && secondsUntilLeave > 30 && secondsUntilLeave <= 120;

  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
    textAlign: 'center' as const,
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    ...(isUrgent && {
      background: 'linear-gradient(135deg, rgba(227,6,19,0.3) 0%, rgba(180,0,0,0.2) 100%)',
      borderColor: '#e30613',
    }),
    ...(isSoon && {
      background: 'linear-gradient(135deg, rgba(243,146,0,0.2) 0%, rgba(200,100,0,0.1) 100%)',
      borderColor: '#f39200',
    }),
  };

  const countdownColor = isUrgent ? '#ff6b6b' : isSoon ? '#f39200' : '#00c853';

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          background: getLineColor(departure.line),
          fontSize: '14px',
          fontWeight: 700,
        }}>{departure.line}</span>
        <span style={{ fontSize: '14px', opacity: 0.8 }}>→</span>
        <span style={{ fontSize: '14px', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {normalizeDirection(departure.direction)}
        </span>
      </div>
      <div style={{
        fontSize: '48px',
        fontWeight: 800,
        lineHeight: 1,
        marginBottom: '4px',
        color: countdownColor,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {!mounted ? '--:--' : secondsUntilLeave <= 0 ? 'JETZT!' : formatTime(secondsUntilLeave)}
      </div>
      <div style={{ fontSize: '14px', opacity: 0.7 }}>
        {!mounted ? 'wird geladen...' : secondsUntilLeave <= 0 ? 'Loslaufen!' : 'bis loslaufen'}
      </div>
      <ProgressBar secondsUntilLeave={secondsUntilLeave} walkTimeSeconds={walkTimeSeconds} mounted={mounted} />
      <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '10px' }}>
        Abfahrt {formatDepartureTime(departure.realtimeWhen)}
        {departure.delay > 0 && ` (+${departure.delay})`}
        {departure.platform && ` • Gl. ${departure.platform}`}
      </div>
    </div>
  );
}

function TransportTypeFilter({
  availableTypes,
  selectedTypes,
  onChange
}: {
  availableTypes: string[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}) {
  const allSelected = selectedTypes.length === 0;

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const sortedTypes = availableTypes.sort((a, b) => {
    const orderA = TRANSPORT_TYPES[a as keyof typeof TRANSPORT_TYPES]?.order ?? 99;
    const orderB = TRANSPORT_TYPES[b as keyof typeof TRANSPORT_TYPES]?.order ?? 99;
    return orderA - orderB;
  });

  return (
    <div style={styles.transportTypeFilter}>
      <button
        onClick={() => onChange([])}
        style={{
          ...styles.transportTypeBtn,
          background: allSelected ? '#fff' : 'transparent',
          borderColor: allSelected ? '#fff' : 'rgba(255,255,255,0.3)',
          color: allSelected ? '#000' : '#fff',
        }}
      >
        Alle
      </button>
      {sortedTypes.map(type => {
        const config = TRANSPORT_TYPES[type as keyof typeof TRANSPORT_TYPES];
        if (!config) return null;
        const isSelected = selectedTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleType(type)}
            style={{
              ...styles.transportTypeBtn,
              background: isSelected ? config.color : 'transparent',
              borderColor: config.color,
              opacity: isSelected ? 1 : 0.5,
            }}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

// === MAIN COMPONENT ===
export default function DeutschlandMonitor() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Station[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkTime, setWalkTime] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Filters
  const [selectedTransportTypes, setSelectedTransportTypes] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<string[]>([]);

  const walkTimeSeconds = walkTime * 60;

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset filters when station changes
  useEffect(() => {
    setSelectedTransportTypes([]);
    setSelectedLines([]);
    setSelectedDirections([]);
  }, [selectedStation?.id]);

  // Search stations
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/deutschland/stations/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        if (data.success && data.stations) {
          setSearchResults(data.stations);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Fetch departures
  const fetchDepartures = useCallback(async () => {
    if (!selectedStation) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/deutschland/departures/${encodeURIComponent(selectedStation.id)}?duration=60`);
      const data = await response.json();

      if (data.success && data.departures) {
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
    }
  }, [selectedStation]);

  // Auto-refresh (30 Sekunden um Rate Limits zu vermeiden)
  useEffect(() => {
    if (!selectedStation) return;

    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [fetchDepartures, selectedStation]);

  // GPS Location
  const handleGpsLocation = async () => {
    if (!navigator.geolocation) {
      setGpsError('GPS nicht verfügbar');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Search for nearby stations using coordinates
          const response = await fetch(
            `https://v6.db.transport.rest/locations/nearby?latitude=${latitude}&longitude=${longitude}&results=5`
          );
          const data = await response.json();

          if (data && data.length > 0) {
            const nearest = data[0];
            setSelectedStation({
              id: nearest.id,
              name: nearest.name,
              place: nearest.address?.city || '',
              latitude: nearest.location?.latitude,
              longitude: nearest.location?.longitude,
            });
            setSearchQuery('');
            setSearchResults([]);
            setShowSettings(false);
          } else {
            setGpsError('Keine Haltestelle gefunden');
          }
        } catch (err) {
          setGpsError('Fehler bei der Suche');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Standortzugriff verweigert');
        } else {
          setGpsError('Standort nicht ermittelbar');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Process departures with filters
  const filteredDepartures = departures
    .filter(dep => selectedTransportTypes.length === 0 || selectedTransportTypes.includes(dep.transportType))
    .filter(dep => selectedLines.length === 0 || selectedLines.includes(dep.line))
    .filter(dep => {
      if (selectedDirections.length === 0) return true;
      const normalized = normalizeDirection(dep.direction);
      return selectedDirections.some(dir => normalized.includes(dir) || dir.includes(normalized));
    });

  const departuresWithTime = filteredDepartures
    .map(dep => ({
      ...dep,
      secondsUntil: calculateSecondsUntil(dep.realtimeWhen),
      minutesUntil: Math.floor(calculateSecondsUntil(dep.realtimeWhen) / 60),
    }))
    .filter(dep => (dep.secondsUntil ?? 0) > -60)
    .sort((a, b) => (a.secondsUntil ?? 0) - (b.secondsUntil ?? 0));

  // Get available filter options
  const availableTransportTypes = Array.from(new Set(departures.map(d => d.transportType))).filter(t => t !== 'UNKNOWN');

  const linesForFilter = selectedTransportTypes.length > 0
    ? departures.filter(d => selectedTransportTypes.includes(d.transportType))
    : departures;
  const availableLines = Array.from(new Set(linesForFilter.map(d => d.line))).sort((a, b) => {
    const typeOrder = (l: string) => {
      if (l.startsWith('ICE') || l.startsWith('IC ')) return 0;
      if (l.startsWith('RE') || l.startsWith('RB')) return 1;
      if (l.startsWith('S')) return 2;
      if (l.startsWith('U')) return 3;
      if (l.startsWith('STR') || /^M?\d+$/.test(l)) return 4;
      if (l.startsWith('Bus')) return 5;
      return 6;
    };
    const orderDiff = typeOrder(a) - typeOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const directionsForFilter = selectedLines.length > 0
    ? departures.filter(d => selectedLines.includes(d.line))
    : selectedTransportTypes.length > 0
      ? departures.filter(d => selectedTransportTypes.includes(d.transportType))
      : departures;
  const availableDirections = extractDirections(directionsForFilter);

  // Find next reachable departures for timers
  const reachableDepartures = departuresWithTime.filter(d => (d.secondsUntil ?? 0) >= walkTimeSeconds);
  const mainDirections = reachableDepartures.slice(0, 2);

  // Select station handler
  const handleSelectStation = (station: Station) => {
    setSelectedStation(station);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>🇩🇪</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>
              {selectedStation ? selectedStation.name : 'Deutschland Monitor'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>
              {selectedStation?.place || 'Alle Städte'}
              {mounted && ` • ${currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`}
            </div>
          </div>
        </div>
        <button
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '13px',
          }}
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          {/* Station Search */}
          <div style={styles.filterSection}>
            <div style={styles.filterLabel}>🚏 Haltestelle</div>
            <div style={styles.searchContainer}>
              <div style={styles.searchInputWrapper}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Haltestelle suchen..."
                  style={styles.searchInput}
                />
                <button
                  onClick={handleGpsLocation}
                  disabled={gpsLoading}
                  style={{
                    ...styles.gpsButton,
                    opacity: gpsLoading ? 0.5 : 1,
                    background: gpsLoading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  }}
                  title="Nächste Haltestelle finden"
                >
                  {gpsLoading ? '⏳' : '📍'}
                </button>
              </div>
              {gpsError && (
                <div style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '8px' }}>{gpsError}</div>
              )}
              {searching && (
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '8px' }}>Suche...</div>
              )}
              {searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map((station) => (
                    <div
                      key={station.id}
                      style={styles.searchResultItem}
                      onClick={() => handleSelectStation(station)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{station.name}</div>
                      <div style={{ fontSize: '12px', opacity: 0.6 }}>{station.place}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Transport Type Filter */}
          {selectedStation && availableTransportTypes.length > 1 && (
            <div style={styles.filterSection}>
              <div style={styles.filterLabel}>🚄 Verkehrsmittel</div>
              <TransportTypeFilter
                availableTypes={availableTransportTypes}
                selectedTypes={selectedTransportTypes}
                onChange={setSelectedTransportTypes}
              />
            </div>
          )}

          {/* Line Filter */}
          {selectedStation && availableLines.length > 0 && (
            <div style={styles.filterSection}>
              <div style={styles.filterLabel}>🚋 Linien</div>
              <LineFilter
                availableLines={availableLines}
                selectedLines={selectedLines}
                onChange={setSelectedLines}
                getLineColor={getLineColor}
              />
            </div>
          )}

          {/* Direction Filter */}
          {selectedStation && availableDirections.length > 0 && (
            <div style={styles.filterSection}>
              <div style={styles.filterLabel}>🎯 Richtungen</div>
              <DirectionFilter
                availableDirections={availableDirections}
                selectedDirections={selectedDirections}
                onChange={setSelectedDirections}
                accentColor="#666"
              />
            </div>
          )}

          {/* Walk Time */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={styles.filterLabel}>🚶 Gehzeit zur Haltestelle</div>
            <div style={styles.walkTimeStepper}>
              <button
                style={{ ...styles.stepperBtn, opacity: walkTime <= 1 ? 0.3 : 1 }}
                onClick={() => walkTime > 1 && setWalkTime(walkTime - 1)}
                disabled={walkTime <= 1}
              >
                −
              </button>
              <div style={{ minWidth: '80px', textAlign: 'center', fontSize: '20px', fontWeight: 700 }}>
                {walkTime} min
              </div>
              <button
                style={{ ...styles.stepperBtn, opacity: walkTime >= 30 ? 0.3 : 1 }}
                onClick={() => walkTime < 30 && setWalkTime(walkTime + 1)}
                disabled={walkTime >= 30}
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Info */}
      {(selectedTransportTypes.length > 0 || selectedLines.length > 0 || selectedDirections.length > 0) && (
        <div style={{
          background: 'rgba(100, 100, 100, 0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {selectedTransportTypes.length > 0 && (
            <span>
              {selectedTransportTypes.map(t => TRANSPORT_TYPES[t as keyof typeof TRANSPORT_TYPES]?.label).join(', ')}
            </span>
          )}
          {selectedLines.length > 0 && (
            <>
              {selectedTransportTypes.length > 0 && <span>•</span>}
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
          {selectedDirections.length > 0 && (
            <>
              {(selectedTransportTypes.length > 0 || selectedLines.length > 0) && <span>•</span>}
              <span>→ {selectedDirections.join(', ')}</span>
            </>
          )}
        </div>
      )}

      {/* Leave Timer */}
      {mainDirections.length > 0 && (
        <div style={styles.leaveTimerContainer}>
          <div style={{
            ...styles.leaveTimerGrid,
            gridTemplateColumns: mainDirections.length === 1 ? '1fr' : '1fr 1fr',
          }}>
            {mainDirections.map((dep, index) => (
              <LeaveTimerCard
                key={`${dep.line}-${dep.direction}-${index}`}
                departure={dep}
                walkTimeSeconds={walkTimeSeconds}
                mounted={mounted}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {!selectedStation ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚉</div>
            <p style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 600 }}>
              Ganz Deutschland
            </p>
            <p style={{ fontSize: '14px', opacity: 0.6, maxWidth: '300px', margin: '0 auto' }}>
              Öffne die Einstellungen (⚙️) und suche nach einer Haltestelle oder nutze GPS (📍).
            </p>
            <div style={{ marginTop: '24px', fontSize: '12px', opacity: 0.4 }}>
              ICE • IC • RE • RB • S-Bahn • U-Bahn • Tram • Bus
            </div>
          </div>
        ) : loading && departures.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ opacity: 0.7 }}>Lade Abfahrten...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchDepartures}
              style={{
                padding: '10px 20px',
                background: '#333',
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
          <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
            <p>Keine Abfahrten gefunden</p>
            {(selectedTransportTypes.length > 0 || selectedLines.length > 0 || selectedDirections.length > 0) && (
              <p style={{ fontSize: '12px', marginTop: '8px' }}>Versuche den Filter anzupassen</p>
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
              {departuresWithTime.slice(0, 30).map((dep, index) => {
                const isUnreachable = mounted && (dep.secondsUntil ?? 0) < walkTimeSeconds;
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
                        {normalizeDirection(dep.direction)}
                        {dep.cancelled && <span style={{ marginLeft: '8px', color: '#ff6b6b' }}>⚠️ Fällt aus</span>}
                        {isUnreachable && !dep.cancelled && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#ff6b6b' }}>verpasst</span>}
                      </div>
                      <div style={{
                        marginTop: '3px',
                        fontSize: '11px',
                        opacity: 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span>{formatDepartureTime(dep.plannedWhen)}</span>
                        {dep.delay > 0 && <span style={{ color: '#ff6b6b' }}>+{dep.delay}</span>}
                        {dep.platform && <span>• Gl. {dep.platform}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: dep.cancelled ? '#ff6b6b' : 'inherit',
                      }}>
                        {!mounted ? '--' : dep.cancelled ? '—' : (dep.secondsUntil ?? 0) < -30 ? 'weg' : (dep.secondsUntil ?? 0) <= 30 ? 'jetzt' : `${dep.minutesUntil}'`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Update Info */}
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              opacity: 0.4,
              marginTop: '20px',
            }}>
              {mounted && lastUpdate && `Aktualisiert: ${lastUpdate.toLocaleTimeString('de-DE')}`}
              {mounted && ' • '}Auto-Refresh 30s
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={{ fontSize: '11px', opacity: 0.4 }}>
          Deutschland Monitor v{APP_VERSION}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.3, marginTop: '4px' }}>
          Daten: db.transport.rest API • Community Projekt
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
