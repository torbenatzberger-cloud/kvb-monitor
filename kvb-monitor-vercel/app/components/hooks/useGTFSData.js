'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to load and cache GTFS data
 *
 * @param {string} city - 'cologne' or 'munich'
 * @returns {Object} { gtfsData, loading, error }
 */
export function useGTFSData(city) {
  const [gtfsData, setGtfsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGTFS() {
      try {
        setLoading(true);
        setError(null);

        // Determine city directory
        const cityDir = city === 'cologne' ? 'kvb' : 'mvg';

        // Check cache first
        const cacheKey = `gtfs_${cityDir}_v1`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            // Check if cache is less than 7 days old
            const cacheAge = Date.now() - parsedCache.timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

            if (cacheAge < maxAge) {
              console.log(`📦 Using cached GTFS data for ${cityDir}`);
              if (isMounted) {
                setGtfsData(parsedCache.data);
                setLoading(false);
              }
              return;
            }
          } catch (e) {
            console.warn('Failed to parse cached GTFS data', e);
            localStorage.removeItem(cacheKey);
          }
        }

        // Fetch GTFS files
        console.log(`📥 Fetching GTFS data for ${cityDir}...`);

        const files = ['routes', 'stops', 'shapes', 'schedule'];
        const data = {};

        for (const file of files) {
          const url = `/gtfs/${cityDir}/${file}.json`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Failed to load ${file}.json: ${response.statusText}`);
          }

          data[file] = await response.json();
          console.log(`  ✓ Loaded ${file}.json`);
        }

        // Cache for future use
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
          console.log(`💾 Cached GTFS data for ${cityDir}`);
        } catch (e) {
          console.warn('Failed to cache GTFS data (quota exceeded?)', e);
        }

        if (isMounted) {
          setGtfsData(data);
          setLoading(false);
        }

      } catch (err) {
        console.error('Error loading GTFS data:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    if (city) {
      loadGTFS();
    }

    return () => {
      isMounted = false;
    };
  }, [city]);

  return { gtfsData, loading, error };
}

/**
 * Hook to preload GTFS data for faster initial load
 *
 * Call this early in your app to start loading GTFS in background
 */
export function usePreloadGTFS(city) {
  useEffect(() => {
    if (!city) return;

    const cityDir = city === 'cologne' ? 'kvb' : 'mvg';
    const files = ['routes', 'stops', 'shapes', 'schedule'];

    // Preload all files
    files.forEach(file => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `/gtfs/${cityDir}/${file}.json`;
      document.head.appendChild(link);
    });

    console.log(`🚀 Preloading GTFS data for ${cityDir}`);
  }, [city]);
}
