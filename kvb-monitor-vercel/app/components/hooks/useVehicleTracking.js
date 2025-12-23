'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VehicleTracker, NetworkVehicleTracker } from '../../lib/gtfs/vehicleTracker';

/**
 * Hook for tracking vehicle positions
 *
 * @param {Object} options
 * @param {Object} options.station - Selected station
 * @param {Array} options.lines - Filtered lines to track
 * @param {Object} options.gtfsData - GTFS data from useGTFSData
 * @param {boolean} options.enabled - Enable/disable tracking
 * @returns {Object} { vehicles, loading, error, refresh }
 */
export function useVehicleTracking({ station, lines = [], gtfsData, enabled = true }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const trackerRef = useRef(null);
  const networkTrackerRef = useRef(null);

  // Initialize trackers
  useEffect(() => {
    if (gtfsData) {
      trackerRef.current = new VehicleTracker(gtfsData);
      networkTrackerRef.current = new NetworkVehicleTracker(trackerRef.current, lines);
      console.log('🚗 Vehicle tracker initialized');
    }
  }, [gtfsData, lines]);

  // Fetch departures for a station
  const fetchDepartures = useCallback(async (stationId) => {
    try {
      const response = await fetch(`/api/departures/${stationId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch departures: ${response.statusText}`);
      }
      const data = await response.json();
      return data.departures || [];
    } catch (err) {
      console.error(`Error fetching departures for ${stationId}:`, err);
      return [];
    }
  }, []);

  // Calculate vehicle positions
  const calculatePositions = useCallback(async () => {
    if (!station || !trackerRef.current || !networkTrackerRef.current || !enabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clear previous data
      networkTrackerRef.current.clear();

      // Fetch departures from current station
      const departures = await fetchDepartures(station.id);

      // Always track ALL tram/metro lines (<100) for the map, regardless of filter
      // The filter is only for display purposes
      const allTramDepartures = departures.filter(d => parseInt(d.line) < 100);

      // For display filtering (used in UI)
      const filteredDepartures = lines.length > 0
        ? allTramDepartures.filter(d => lines.includes(d.line))
        : allTramDepartures;

      console.log(`🚊 Tracking ${allTramDepartures.length} departures (${filteredDepartures.length} match filters)`);

      // Add ALL tram departures to network tracker for comprehensive map view
      networkTrackerRef.current.addStationData(station.id, allTramDepartures);

      // Calculate positions
      const currentTime = new Date();

      // LIVE MODE: Use real current time
      // If no vehicles are found in transit, fall back to demo mode
      let positions = networkTrackerRef.current.getAllVehiclePositions(currentTime);

      // DEMO MODE FALLBACK: If no vehicles in live mode (e.g., late night), use demo time
      if (positions.length === 0 && filteredDepartures.length > 0) {
        console.log('⚠️ No vehicles in transit at current time, using demo mode');

        // Find the latest departure time from filtered departures
        let latestDepartureMinutes = 0;
        filteredDepartures.forEach(dep => {
          const depMinutes = dep.realtimeHour * 60 + dep.realtimeMinute;
          if (depMinutes > latestDepartureMinutes) {
            latestDepartureMinutes = depMinutes;
          }
        });

        // Set demo time to 5 minutes after latest departure
        const demoTime = new Date();
        demoTime.setHours(Math.floor((latestDepartureMinutes + 5) / 60));
        demoTime.setMinutes((latestDepartureMinutes + 5) % 60);
        demoTime.setSeconds(0);

        console.log(`🕐 Using demo time: ${demoTime.getHours()}:${demoTime.getMinutes().toString().padStart(2, '0')} (real: ${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')}, latest departure: ${Math.floor(latestDepartureMinutes/60)}:${(latestDepartureMinutes%60).toString().padStart(2, '0')})`);

        positions = networkTrackerRef.current.getAllVehiclePositions(demoTime);
      } else {
        console.log(`🕐 Live mode: tracking at ${currentTime.getHours()}:${currentTime.getMinutes().toString().padStart(2, '0')}`);
      }

      setVehicles(positions);
      setLoading(false);

      console.log(`📍 Calculated ${positions.length} vehicle positions`);

    } catch (err) {
      console.error('Error calculating vehicle positions:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [station, lines, enabled, fetchDepartures]);

  // Refresh data periodically
  useEffect(() => {
    if (!enabled || !gtfsData) return;

    // Initial calculation
    calculatePositions();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      calculatePositions();
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, gtfsData, calculatePositions]);

  return {
    vehicles,
    loading,
    error,
    refresh: calculatePositions
  };
}

/**
 * Hook for manual vehicle position calculation
 *
 * Useful when you want full control over when to calculate positions
 *
 * @param {Object} gtfsData - GTFS data
 * @returns {Function} calculatePosition(departure, currentTime)
 */
export function useVehiclePositionCalculator(gtfsData) {
  const trackerRef = useRef(null);

  useEffect(() => {
    if (gtfsData) {
      trackerRef.current = new VehicleTracker(gtfsData);
    }
  }, [gtfsData]);

  return useCallback((departure, currentTime = new Date()) => {
    if (!trackerRef.current) return null;
    return trackerRef.current.calculatePosition(departure, currentTime);
  }, []);
}
