'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { lerpPosition, smoothTransition, hasSignificantChange } from '../../lib/gtfs/interpolation';

/**
 * Hook for 60 FPS vehicle animation
 *
 * Smoothly animates vehicles between API updates
 *
 * @param {Array} vehicles - Array of vehicle objects from useVehicleTracking
 * @param {boolean} isActive - Enable/disable animation
 * @returns {Array} Animated vehicle positions
 */
export function useMapAnimation(vehicles, isActive = true) {
  const [animatedVehicles, setAnimatedVehicles] = useState([]);
  const rafRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const previousVehiclesRef = useRef(new Map());

  // Animation loop
  useEffect(() => {
    if (!isActive || vehicles.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      setAnimatedVehicles(vehicles);
      return;
    }

    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000; // seconds
      lastUpdateRef.current = now;

      // Update positions based on elapsed time
      setAnimatedVehicles(prevAnimated => {
        return vehicles.map(vehicle => {
          const prevVehicle = previousVehiclesRef.current.get(vehicle.id);

          if (!prevVehicle) {
            // New vehicle, no animation needed
            previousVehiclesRef.current.set(vehicle.id, vehicle);
            return vehicle;
          }

          // Check if position has changed significantly
          if (!hasSignificantChange(prevVehicle, vehicle, 5)) {
            // Position hasn't changed much, keep animating along current path
            return animateVehicle(vehicle, deltaTime);
          }

          // Position jumped (new API data), smooth transition
          const transitionDuration = 500; // ms
          const elapsed = now - (vehicle.transitionStartTime || now);

          if (elapsed < transitionDuration) {
            // Still transitioning
            const smoothed = smoothTransition(
              prevVehicle,
              vehicle,
              transitionDuration,
              elapsed
            );

            return {
              ...vehicle,
              lat: smoothed.lat,
              lng: smoothed.lng,
              transitionStartTime: vehicle.transitionStartTime || now
            };
          } else {
            // Transition complete
            previousVehiclesRef.current.set(vehicle.id, vehicle);
            return vehicle;
          }
        });
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [vehicles, isActive]);

  // Pause animation when tab is hidden (battery saving)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      } else {
        lastUpdateRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return animatedVehicles;
}

/**
 * Animate vehicle along its path
 */
function animateVehicle(vehicle, deltaTime) {
  if (!vehicle.segment || !vehicle.speed) {
    return vehicle;
  }

  const { segment, speed, progress } = vehicle;

  // Calculate how much progress to add this frame
  // Assume segment distance if not provided
  const segmentDistance = 500; // meters (average between stops)
  const speedMetersPerSecond = (speed * 1000) / 3600;
  const distanceThisFrame = speedMetersPerSecond * deltaTime;
  const progressIncrement = distanceThisFrame / segmentDistance;

  const newProgress = Math.min(1, progress + progressIncrement);

  // If we've reached the end of the segment, stop animating
  // (wait for next API update with new segment)
  if (newProgress >= 1) {
    return vehicle;
  }

  return {
    ...vehicle,
    progress: newProgress
    // Note: lat/lng will be recalculated by VehicleTracker on next API update
  };
}

/**
 * Hook for FPS monitoring
 *
 * Useful for debugging performance
 */
export function useFPSMonitor() {
  const [fps, setFps] = useState(60);
  const frameTimesRef = useRef([]);
  const lastFrameTimeRef = useRef(Date.now());

  useEffect(() => {
    let rafId;

    const measureFPS = () => {
      const now = Date.now();
      const frameTime = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      frameTimesRef.current.push(frameTime);

      // Keep last 60 frame times
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average FPS
      if (frameTimesRef.current.length > 0) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const avgFPS = 1000 / avgFrameTime;
        setFps(Math.round(avgFPS));
      }

      rafId = requestAnimationFrame(measureFPS);
    };

    rafId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}

/**
 * Hook for measuring render performance
 */
export function useRenderTime() {
  const [renderTime, setRenderTime] = useState(0);
  const startTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
  });

  useEffect(() => {
    const time = performance.now() - startTimeRef.current;
    setRenderTime(time);
  });

  return renderTime;
}
