/**
 * Vehicle Tracker
 *
 * Calculates estimated vehicle positions based on:
 * - GTFS schedule data (travel times, route shapes)
 * - Live departure times (from API)
 *
 * Note: Positions are ESTIMATES, not GPS data!
 */

export class VehicleTracker {
  constructor(gtfsData) {
    this.routes = gtfsData.routes || {};
    this.shapes = gtfsData.shapes || {};
    this.stops = gtfsData.stops || {};
    this.schedule = gtfsData.schedule || {};
  }

  /**
   * Calculate vehicle position for a specific departure
   *
   * @param {Object} departure - Live departure data from API
   * @param {Date} currentTime - Current timestamp
   * @returns {Object|null} { lat, lng, progress, segment, speed, ... }
   */
  calculatePosition(departure, currentTime) {
    const { line, direction, realtimeHour, realtimeMinute, delay = 0 } = departure;

    // Find matching route shape
    const shapeId = this.findShapeId(line, direction);
    if (!shapeId) {
      console.warn(`No shape found for line ${line} direction ${direction}`);
      return null;
    }

    const shape = this.shapes[shapeId];
    if (!shape) {
      console.warn(`Shape data missing for ${shapeId}`);
      return null;
    }

    // Determine current segment (between which two stops)
    const segment = this.findCurrentSegment(line, departure, currentTime);

    if (!segment) {
      // Vehicle hasn't departed yet or already completed route
      return null;
    }

    // Calculate progress along segment (0-1)
    const progress = this.calculateProgress(segment, currentTime);

    // Interpolate geographic position
    const position = this.interpolatePosition(shape, segment, progress);

    // Calculate estimated speed
    const speed = this.calculateSpeed(segment);

    return {
      lat: position.lat,
      lng: position.lng,
      progress: progress,
      segment: {
        from: segment.from.id,
        to: segment.to.id
      },
      speed: speed,
      line: line,
      direction: direction,
      delay: delay || 0,
      timestamp: currentTime.getTime()
    };
  }

  /**
   * Find shape ID for a line and direction
   */
  findShapeId(line, direction) {
    // Find shape that matches this line and direction
    const matchingShapes = Object.keys(this.shapes).filter(shapeId => {
      const shape = this.shapes[shapeId];
      return shape.routeId === line &&
             shape.direction.toLowerCase().includes(direction.toLowerCase().substring(0, 5));
    });

    return matchingShapes[0] || null;
  }

  /**
   * Find current segment (between which two stops) the vehicle is on
   */
  findCurrentSegment(line, departure, currentTime) {
    const scheduleData = this.schedule[line];
    if (!scheduleData || !scheduleData.segments) {
      return null;
    }

    // Parse departure time
    const departureTime = new Date();
    departureTime.setHours(departure.realtimeHour);
    departureTime.setMinutes(departure.realtimeMinute);
    departureTime.setSeconds(0);
    departureTime.setMilliseconds(0);

    // Check if current time is past midnight compared to departure
    if (currentTime.getHours() < 6 && departure.realtimeHour > 20) {
      // Crossed midnight: add 1 day to current time
      currentTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const elapsedSeconds = (currentTime - departureTime) / 1000;

    if (elapsedSeconds < 0) {
      // Vehicle hasn't departed yet
      return null;
    }

    // Walk through segments to find current position
    let cumulativeTime = 0;
    const segments = scheduleData.segments;

    for (let i = 0; i < segments.length; i++) {
      const segmentData = segments[i];
      const segmentTime = segmentData.travel_time_seconds;

      if (elapsedSeconds >= cumulativeTime &&
          elapsedSeconds < cumulativeTime + segmentTime) {
        // Vehicle is in this segment
        const fromStop = this.stops[segmentData.from_stop];
        const toStop = this.stops[segmentData.to_stop];

        if (!fromStop || !toStop) {
          console.warn(`Missing stop data for segment: ${segmentData.from_stop} -> ${segmentData.to_stop}`);
          continue;
        }

        return {
          from: fromStop,
          to: toStop,
          travelTime: segmentTime,
          elapsedInSegment: elapsedSeconds - cumulativeTime,
          distance_meters: segmentData.distance_meters || 0
        };
      }

      cumulativeTime += segmentTime;
    }

    // Vehicle has completed route
    return null;
  }

  /**
   * Calculate progress within current segment (0-1)
   */
  calculateProgress(segment) {
    if (segment.travelTime === 0) return 1;
    return Math.min(1, Math.max(0, segment.elapsedInSegment / segment.travelTime));
  }

  /**
   * Interpolate geographic position along route shape
   */
  interpolatePosition(shape, segment, progress) {
    const { from, to } = segment;

    // Get shape points
    const points = shape.points || [];

    if (points.length === 0) {
      // Fallback: linear interpolation between stops
      return {
        lat: from.lat + (to.lat - from.lat) * progress,
        lng: from.lng + (to.lng - from.lng) * progress
      };
    }

    // Find shape points closest to from and to stops
    const fromPoint = this.findClosestShapePoint(points, from);
    const toPoint = this.findClosestShapePoint(points, to);

    if (fromPoint.index === -1 || toPoint.index === -1) {
      // Fallback
      return {
        lat: from.lat + (to.lat - from.lat) * progress,
        lng: from.lng + (to.lng - from.lng) * progress
      };
    }

    // Get segment points
    const segmentPoints = points.slice(
      Math.min(fromPoint.index, toPoint.index),
      Math.max(fromPoint.index, toPoint.index) + 1
    );

    if (segmentPoints.length < 2) {
      return {
        lat: from.lat + (to.lat - from.lat) * progress,
        lng: from.lng + (to.lng - from.lng) * progress
      };
    }

    // Interpolate along shape points using progress
    const totalDist = segmentPoints[segmentPoints.length - 1].dist - segmentPoints[0].dist;
    const targetDist = segmentPoints[0].dist + totalDist * progress;

    // Find two points that bracket targetDist
    for (let i = 0; i < segmentPoints.length - 1; i++) {
      const p1 = segmentPoints[i];
      const p2 = segmentPoints[i + 1];

      if (p1.dist <= targetDist && p2.dist >= targetDist) {
        const localProgress = (targetDist - p1.dist) / (p2.dist - p1.dist || 1);

        return {
          lat: p1.lat + (p2.lat - p1.lat) * localProgress,
          lng: p1.lng + (p2.lng - p1.lng) * localProgress
        };
      }
    }

    // Fallback: return last point
    return segmentPoints[segmentPoints.length - 1];
  }

  /**
   * Find closest shape point to a stop
   */
  findClosestShapePoint(points, stop) {
    let minDist = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const dist = Math.sqrt(
        Math.pow(point.lat - stop.lat, 2) +
        Math.pow(point.lng - stop.lng, 2)
      );

      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    return { index: closestIndex, distance: minDist };
  }

  /**
   * Calculate estimated speed (km/h)
   */
  calculateSpeed(segment) {
    if (segment.distance_meters === 0 || segment.travelTime === 0) {
      // Default tram/subway speed
      return 25; // km/h
    }

    const distanceKm = segment.distance_meters / 1000;
    const timeHours = segment.travelTime / 3600;
    return distanceKm / timeHours;
  }
}

/**
 * Network-wide vehicle tracker
 *
 * Tracks vehicles across multiple stations
 */
export class NetworkVehicleTracker {
  constructor(vehicleTracker, monitoredLines) {
    this.tracker = vehicleTracker;
    this.monitoredLines = monitoredLines || [];
    this.stationDepartures = new Map();
  }

  /**
   * Add departure data from a station
   */
  addStationData(stationId, departures) {
    this.stationDepartures.set(stationId, departures);
  }

  /**
   * Calculate all vehicle positions across the network
   */
  getAllVehiclePositions(currentTime) {
    const vehicles = new Map(); // unique key → vehicle position

    // Iterate through all monitored stations
    for (const [stationId, departures] of this.stationDepartures) {
      for (const dep of departures) {
        // Only track filtered lines
        if (this.monitoredLines.length > 0 &&
            !this.monitoredLines.includes(dep.line)) {
          continue;
        }

        // Generate unique vehicle ID
        const vehicleKey = this.generateVehicleId(dep);

        // Skip if we already have this vehicle (from another station)
        if (vehicles.has(vehicleKey)) continue;

        // Calculate position
        const position = this.tracker.calculatePosition(dep, currentTime);

        if (position) {
          vehicles.set(vehicleKey, {
            ...position,
            id: vehicleKey,
            departure: dep
          });
        }
      }
    }

    return Array.from(vehicles.values());
  }

  /**
   * Generate unique vehicle ID
   *
   * Format: line_direction_time
   * Example: "5_Heumarkt_1430"
   */
  generateVehicleId(departure) {
    const direction = departure.direction.replace(/\s+/g, '_').substring(0, 15);
    const time = `${String(departure.realtimeHour).padStart(2, '0')}${String(departure.realtimeMinute).padStart(2, '0')}`;
    return `${departure.line}_${direction}_${time}`;
  }

  /**
   * Clear all station data
   */
  clear() {
    this.stationDepartures.clear();
  }
}
