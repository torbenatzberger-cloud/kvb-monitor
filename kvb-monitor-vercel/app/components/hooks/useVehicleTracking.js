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

      // Filter by selected lines if specified, and exclude bus lines (>100)
      const filteredDepartures = lines.length > 0
        ? departures.filter(d => lines.includes(d.line) && parseInt(d.line) < 100)
        : departures.filter(d => parseInt(d.line) < 100);

      // Add to network tracker
      networkTrackerRef.current.addStationData(station.id, filteredDepartures);

      // Calculate positions
      const currentTime = new Date();
      const positions = networkTrackerRef.current.getAllVehiclePositions(currentTime);

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
