'use client';

import { useState, useEffect, useRef } from 'react';
import { getRecentSearches } from '../lib/storageUtils';

/**
 * Station Autocomplete Component
 * Wiederverwendbare Autocomplete-Suche für Haltestellen
 *
 * @param {string} apiEndpoint - API Endpoint für Suche (z.B. "/api/stations/search")
 * @param {string} placeholder - Placeholder Text
 * @param {function} onSelect - Callback wenn Station ausgewählt wird
 * @param {object} initialValue - Initial ausgewählte Station { id, name, place }
 * @param {string} accentColor - Accent Color für aktive Elemente
 * @param {string} recentSearchesKey - localStorage Key für Recent Searches
 */
export default function StationAutocomplete({
  apiEndpoint,
  placeholder = 'Haltestelle suchen...',
  onSelect,
  initialValue = null,
  accentColor = '#e30613',
  recentSearchesKey = 'recent-searches',
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);

  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const searchCacheRef = useRef(new Map()); // Cache for search results

  // Load recent searches on mount
  useEffect(() => {
    const recent = getRecentSearches(recentSearchesKey);
    setRecentSearches(recent);
  }, [recentSearchesKey]);

  // Set initial query if initialValue provided
  useEffect(() => {
    if (initialValue && initialValue.name) {
      setQuery(initialValue.name);
    }
  }, [initialValue]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced API call with caching
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset state
    setError(null);

    // Don't search if query is too short
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(query.length > 0);
      return;
    }

    // Check cache first for instant response
    const cacheKey = query.toLowerCase().trim();
    if (searchCacheRef.current.has(cacheKey)) {
      const cachedResults = searchCacheRef.current.get(cacheKey);
      setSuggestions(cachedResults);
      setShowDropdown(true);
      setLoading(false);
      return;
    }

    // Set loading state
    setLoading(true);

    // Debounce API call (150ms - reduced from 300ms for faster response)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${apiEndpoint}?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.stations) {
          // Cache the results
          searchCacheRef.current.set(cacheKey, data.stations);

          // Limit cache size to 50 entries to prevent memory issues
          if (searchCacheRef.current.size > 50) {
            const firstKey = searchCacheRef.current.keys().next().value;
            searchCacheRef.current.delete(firstKey);
          }

          setSuggestions(data.stations);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setError(data.error || 'Keine Ergebnisse gefunden');
        }
      } catch (err) {
        console.error('Station search error:', err);
        setError('Suche nicht verfügbar');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, apiEndpoint]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const allOptions = query.length < 2 ? recentSearches : suggestions;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < allOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && allOptions[selectedIndex]) {
        handleSelect(allOptions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Handle station selection
  const handleSelect = (station) => {
    setQuery(station.name);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSuggestions([]);

    if (onSelect) {
      onSelect(station);
    }
  };

  // Display options (recent or suggestions)
  const displayOptions = query.length < 2 ? recentSearches : suggestions;
  const showRecentSearches = query.length < 2 && recentSearches.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input Field */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 40px 12px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '14px',
            boxSizing: 'border-box',
            minHeight: '44px', // Touch-friendly
          }}
          aria-label="Haltestelle suchen"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : null}
        />

        {/* Loading Spinner */}
        {loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: accentColor,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {/* Search Icon (when not loading) */}
        {!loading && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.5,
            fontSize: '16px',
          }}>
            🔍
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: '#1a1a2e',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          maxHeight: '60vh',
          overflowY: 'auto',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {/* Recent Searches Header */}
          {showRecentSearches && (
            <div style={{
              padding: '8px 12px',
              fontSize: '11px',
              opacity: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              Zuletzt gesucht
            </div>
          )}

          {/* Options List */}
          {displayOptions.length > 0 ? (
            displayOptions.map((station, index) => (
              <div
                key={station.id}
                id={`option-${index}`}
                onClick={() => handleSelect(station)}
                style={{
                  padding: '12px',
                  cursor: 'pointer',
                  background: selectedIndex === index ? accentColor : 'transparent',
                  borderBottom: index < displayOptions.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {/* Recent Search Icon */}
                {showRecentSearches && (
                  <span style={{ fontSize: '12px', opacity: 0.6 }}>⭐</span>
                )}

                {/* Station Name */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {station.name}
                  </div>
                  {station.place && (
                    <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>
                      {station.place}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* No Results */
            <div style={{
              padding: '20px',
              textAlign: 'center',
              opacity: 0.6,
              fontSize: '13px',
            }}>
              {error || (query.length < 2 ? 'Mindestens 2 Zeichen eingeben' : 'Keine Ergebnisse gefunden')}
            </div>
          )}
        </div>
      )}

      {/* CSS Animation for Spinner */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
