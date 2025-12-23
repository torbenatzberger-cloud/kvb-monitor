/**
 * Interpolation utilities for smooth vehicle movement
 */

/**
 * Linear interpolation between two values
 *
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Progress (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Linear interpolation between two positions (lat/lng)
 *
 * @param {Object} from - { lat, lng }
 * @param {Object} to - { lat, lng }
 * @param {number} t - Progress (0-1)
 * @returns {Object} { lat, lng }
 */
export function lerpPosition(from, to, t) {
  return {
    lat: lerp(from.lat, to.lat, t),
    lng: lerp(from.lng, to.lng, t)
  };
}

/**
 * Easing functions for smooth animations
 */
export const easing = {
  // No easing
  linear: (t) => t,

  // Accelerating from zero velocity
  easeInQuad: (t) => t * t,

  // Decelerating to zero velocity
  easeOutQuad: (t) => t * (2 - t),

  // Acceleration until halfway, then deceleration
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic ease out (natural deceleration)
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

  // Smooth step (S-curve)
  smoothstep: (t) => t * t * (3 - 2 * t)
};

/**
 * Calculate distance between two lat/lng coordinates (Haversine formula)
 *
 * @param {Object} pos1 - { lat, lng }
 * @param {Object} pos2 - { lat, lng }
 * @returns {number} Distance in meters
 */
export function calculateDistance(pos1, pos2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = pos1.lat * Math.PI / 180;
  const φ2 = pos2.lat * Math.PI / 180;
  const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
  const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Smooth transition between old and new vehicle positions
 *
 * When API updates, vehicle position might "jump". This function
 * creates a smooth transition over a specified duration.
 *
 * @param {Object} currentPos - Current position { lat, lng }
 * @param {Object} targetPos - Target position { lat, lng }
 * @param {number} transitionDuration - Duration in ms
 * @param {number} elapsed - Elapsed time since transition started
 * @returns {Object} { lat, lng }
 */
export function smoothTransition(currentPos, targetPos, transitionDuration, elapsed) {
  const t = Math.min(1, elapsed / transitionDuration);
  const easedT = easing.easeOutCubic(t);

  return lerpPosition(currentPos, targetPos, easedT);
}

/**
 * Calculate bearing (direction) between two positions
 *
 * @param {Object} from - { lat, lng }
 * @param {Object} to - { lat, lng }
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(from, to) {
  const φ1 = from.lat * Math.PI / 180;
  const φ2 = to.lat * Math.PI / 180;
  const Δλ = (to.lng - from.lng) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = (θ * 180 / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Interpolate along a polyline (array of points)
 *
 * @param {Array} points - Array of { lat, lng, dist } points
 * @param {number} progress - Progress (0-1)
 * @returns {Object} { lat, lng, index }
 */
export function interpolateAlongPolyline(points, progress) {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1 || progress <= 0) {
    return { ...points[0], index: 0 };
  }

  if (progress >= 1) {
    return { ...points[points.length - 1], index: points.length - 1 };
  }

  // Calculate total distance
  const totalDist = points[points.length - 1].dist - points[0].dist;
  const targetDist = points[0].dist + totalDist * progress;

  // Find segment containing target distance
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p1.dist <= targetDist && targetDist <= p2.dist) {
      const segmentProgress = (targetDist - p1.dist) / (p2.dist - p1.dist || 1);
      return {
        lat: lerp(p1.lat, p2.lat, segmentProgress),
        lng: lerp(p1.lng, p2.lng, segmentProgress),
        index: i + segmentProgress
      };
    }
  }

  // Fallback: return last point
  return { ...points[points.length - 1], index: points.length - 1 };
}

/**
 * Check if a position has changed significantly (> threshold)
 *
 * Used to avoid unnecessary re-renders
 *
 * @param {Object} pos1 - { lat, lng }
 * @param {Object} pos2 - { lat, lng }
 * @param {number} threshold - Threshold in meters (default: 10m)
 * @returns {boolean} True if change is significant
 */
export function hasSignificantChange(pos1, pos2, threshold = 10) {
  if (!pos1 || !pos2) return true;
  const dist = calculateDistance(pos1, pos2);
  return dist > threshold;
}

/**
 * Clamp value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalize direction string for comparison
 *
 * @param {string} direction - Direction name
 * @returns {string} Normalized direction
 */
export function normalizeDirection(direction) {
  return direction
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
}
