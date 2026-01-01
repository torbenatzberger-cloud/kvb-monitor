'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LINE_5_STOPS,
  LINE_5_SEGMENTS,
  LINE_5_TOTAL_TIME,
  getStopIndex,
  getCumulativeTime
} from '../../config/line5';

/**
 * Hook zum Tracken von Fahrzeugen auf Linie 5
 * Berechnet Position aus Abfahrtsdaten
 */
export function useLineVehicles(departures, selectedStopId) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for smooth animation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Berechne Fahrzeugpositionen
  const vehicles = useMemo(() => {
    if (!departures || departures.length === 0) return [];

    // Filtere nur Linie 5 Abfahrten
    const line5Departures = departures.filter(dep =>
      dep.line === '5' || dep.line === 'Linie 5' || dep.line === 'STR 5'
    );

    if (line5Departures.length === 0) return [];

    // Finde den Index der ausgewählten Station
    const selectedIndex = getStopIndex(selectedStopId);
    if (selectedIndex === -1) return [];

    // Berechne für jede Abfahrt die aktuelle Position
    const vehicleList = line5Departures.map((dep, idx) => {
      // Richtung bestimmen
      const dirLower = (dep.direction || '').toLowerCase();
      const isToHeumarkt = dirLower.includes('heumarkt') ||
                           dirLower.includes('dom') ||
                           dirLower.includes('neumarkt');

      // Abfahrtszeit berechnen
      const now = currentTime;
      const departureTime = new Date(now);
      departureTime.setHours(dep.realtimeHour || dep.plannedHour || 0);
      departureTime.setMinutes(dep.realtimeMinute || dep.plannedMinute || 0);
      departureTime.setSeconds(0);

      // Wenn Abfahrtszeit in der Vergangenheit (>12h), nächsten Tag annehmen
      if (departureTime.getTime() - now.getTime() < -12 * 60 * 60 * 1000) {
        departureTime.setDate(departureTime.getDate() + 1);
      }

      // Sekunden bis zur Abfahrt (negativ = schon abgefahren)
      const secondsUntilDeparture = Math.floor((departureTime.getTime() - now.getTime()) / 1000);

      // Position berechnen
      let position = null;
      let progress = 0;
      let currentSegmentIndex = -1;
      let atStation = false;

      // Strecke: Butzweilerhof (Index 0, links) ←→ Heumarkt (Index 14, rechts)
      // Position 0% = Butzweilerhof, Position 100% = Heumarkt

      const timeToSelectedStation = getCumulativeTime(selectedIndex);
      const timeFromSelectedToEnd = LINE_5_TOTAL_TIME - timeToSelectedStation;

      if (secondsUntilDeparture > 0) {
        // Bahn kommt noch → Position VOR der Station berechnen

        if (isToHeumarkt) {
          // Fährt Richtung Heumarkt (nach rechts) → kommt von links (niedrigerer Index)
          // Bahn ist irgendwo zwischen Butzweilerhof und der aktuellen Station
          const estimatedTimeAway = Math.min(secondsUntilDeparture, timeToSelectedStation);
          const positionTime = timeToSelectedStation - estimatedTimeAway;
          const result = getPositionFromTime(positionTime);
          position = result.position;
          currentSegmentIndex = result.segmentIndex;
        } else {
          // Fährt Richtung Ossendorf (nach links) → kommt von rechts (höherer Index)
          // Bahn ist irgendwo zwischen Heumarkt und der aktuellen Station
          const estimatedTimeAway = Math.min(secondsUntilDeparture, timeFromSelectedToEnd);
          const positionTime = timeToSelectedStation + estimatedTimeAway;
          const result = getPositionFromTime(positionTime);
          position = result.position;
          currentSegmentIndex = result.segmentIndex;
        }
      } else {
        // Bahn ist schon abgefahren → Position NACH der Station
        const timeSinceDeparture = Math.abs(secondsUntilDeparture);

        if (isToHeumarkt) {
          // Fährt Richtung Heumarkt (nach rechts) → ist jetzt rechts von der Station (höherer Index)
          const positionTime = timeToSelectedStation + timeSinceDeparture;
          const result = getPositionFromTime(Math.min(positionTime, LINE_5_TOTAL_TIME));
          position = result.position;
          currentSegmentIndex = result.segmentIndex;
        } else {
          // Fährt Richtung Ossendorf (nach links) → ist jetzt links von der Station (niedrigerer Index)
          const positionTime = timeToSelectedStation - timeSinceDeparture;
          const result = getPositionFromTime(Math.max(0, positionTime));
          position = result.position;
          currentSegmentIndex = result.segmentIndex;
        }
      }

      // Filtere Bahnen die außerhalb der Strecke sind
      if (position === null || position < 0 || position > 100) {
        return null;
      }

      return {
        id: `train-${idx}-${dep.direction}-${dep.realtimeHour}${dep.realtimeMinute}`,
        direction: isToHeumarkt ? 'heumarkt' : 'ossendorf',
        position, // 0-100% entlang der Strecke
        secondsUntilDeparture,
        departureTime: `${String(dep.realtimeHour || dep.plannedHour).padStart(2, '0')}:${String(dep.realtimeMinute || dep.plannedMinute).padStart(2, '0')}`,
        destination: dep.direction,
      };
    }).filter(Boolean);

    // Dedupliziere (ähnliche Positionen = gleiche Bahn)
    const deduplicated = [];
    vehicleList.forEach(vehicle => {
      const isDuplicate = deduplicated.some(v =>
        v.direction === vehicle.direction &&
        Math.abs(v.position - vehicle.position) < 3 // Innerhalb 3%
      );
      if (!isDuplicate) {
        deduplicated.push(vehicle);
      }
    });

    return deduplicated;
  }, [departures, selectedStopId, currentTime]);

  // Ankommende Bahnen für die ausgewählte Station
  const incomingVehicles = useMemo(() => {
    const selectedIndex = getStopIndex(selectedStopId);
    if (selectedIndex === -1) return [];

    return vehicles
      .filter(v => v.secondsUntilDeparture > 0)
      .sort((a, b) => a.secondsUntilDeparture - b.secondsUntilDeparture)
      .slice(0, 4);
  }, [vehicles, selectedStopId]);

  return { vehicles, incomingVehicles, currentTime };
}

/**
 * Berechne Position (0-100%) basierend auf verstrichener Zeit seit Butzweilerhof
 * 0% = Butzweilerhof, 100% = Heumarkt
 */
function getPositionFromTime(timeSeconds) {
  let elapsed = 0;

  for (let i = 0; i < LINE_5_SEGMENTS.length; i++) {
    const segment = LINE_5_SEGMENTS[i];
    const segmentEnd = elapsed + segment.travelTime;

    if (timeSeconds <= segmentEnd) {
      // Position innerhalb dieses Segments
      const progressInSegment = (timeSeconds - elapsed) / segment.travelTime;
      const segmentStartPercent = (i / (LINE_5_STOPS.length - 1)) * 100;
      const segmentEndPercent = ((i + 1) / (LINE_5_STOPS.length - 1)) * 100;

      const position = segmentStartPercent + (segmentEndPercent - segmentStartPercent) * progressInSegment;

      return { position, segmentIndex: i };
    }

    elapsed = segmentEnd;
  }

  // Am Ende der Strecke
  return { position: 100, segmentIndex: LINE_5_SEGMENTS.length - 1 };
}

export default useLineVehicles;
