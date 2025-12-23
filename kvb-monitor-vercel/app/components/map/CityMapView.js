'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * City Map View Component (Leaflet)
 *
 * Displays multiple transit lines with vehicles on an interactive map
 *
 * Note: Leaflet is loaded dynamically to avoid SSR issues
 */
export default function CityMapView({
  vehicles,
  gtfsData,
  selectedLines,
  onLineSelect,
  accentColor,
  centerStation
}) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersRef = useRef({
    routes: null,
    vehicles: null,
    stations: null
  });
  const [leaflet, setLeaflet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function loadLeaflet() {
      try {
        // Import Leaflet
        const L = (await import('leaflet')).default;

        // Import Leaflet CSS
        await import('leaflet/dist/leaflet.css');

        // Fix default icon path
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
        });

        setLeaflet(L);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setIsLoading(false);
      }
    }

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leaflet || !mapRef.current || leafletMapRef.current) return;

    // Default center (Cologne)
    const center = centerStation
      ? [centerStation.lat || 50.9375, centerStation.lng || 6.9603]
      : [50.9375, 6.9603];

    const map = leaflet.map(mapRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    leafletMapRef.current = map;

    console.log('🗺️ Leaflet map initialized');

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [leaflet, centerStation]);

  // Draw route polylines
  useEffect(() => {
    if (!leaflet || !leafletMapRef.current || !gtfsData) return;

    const map = leafletMapRef.current;

    // Remove old routes
    if (layersRef.current.routes) {
      map.removeLayer(layersRef.current.routes);
    }

    const routeGroup = leaflet.layerGroup();

    selectedLines.forEach(lineId => {
      const route = gtfsData.routes?.[lineId];
      if (!route) return;

      // Get shapes for this line
      Object.entries(gtfsData.shapes || {}).forEach(([shapeId, shape]) => {
        if (shape.routeId !== lineId) return;

        const latLngs = shape.points.map(p => [p.lat, p.lng]);

        const polyline = leaflet.polyline(latLngs, {
          color: route.color,
          weight: 4,
          opacity: 0.7,
          smoothFactor: 1.0
        });

        // Click handler to switch to line view
        polyline.on('click', () => {
          onLineSelect && onLineSelect(lineId);
        });

        // Hover effect
        polyline.on('mouseover', function() {
          this.setStyle({ weight: 6, opacity: 0.9 });
        });

        polyline.on('mouseout', function() {
          this.setStyle({ weight: 4, opacity: 0.7 });
        });

        polyline.bindTooltip(`Linie ${lineId}`, {
          sticky: true
        });

        polyline.addTo(routeGroup);
      });
    });

    routeGroup.addTo(map);
    layersRef.current.routes = routeGroup;

    console.log(`📍 Rendered ${selectedLines.length} line routes`);
  }, [leaflet, selectedLines, gtfsData, onLineSelect]);

  // Draw vehicle markers
  useEffect(() => {
    if (!leaflet || !leafletMapRef.current || !vehicles || !gtfsData) return;

    const map = leafletMapRef.current;

    // Remove old markers
    if (layersRef.current.vehicles) {
      map.removeLayer(layersRef.current.vehicles);
    }

    const vehicleGroup = leaflet.layerGroup();

    vehicles.forEach(vehicle => {
      const route = gtfsData.routes?.[vehicle.line];
      if (!route) return;

      // Calculate rotation based on bearing/direction
      const rotation = vehicle.bearing || 0;

      // Create custom div icon for vehicle with tram/train symbol
      const iconHtml = `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(${rotation}deg);
        ">
          <div style="
            background: ${route.color};
            color: white;
            border-radius: 6px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 3px 12px rgba(0,0,0,0.4);
            cursor: pointer;
            position: relative;
          ">
            <span style="transform: rotate(${-rotation}deg); display: inline-block;">🚊</span>
          </div>
          <div style="
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%) rotate(${-rotation}deg);
            background: ${route.color};
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: bold;
            border: 1px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            ${vehicle.line}
          </div>
        </div>
      `;

      const icon = leaflet.divIcon({
        html: iconHtml,
        className: 'vehicle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = leaflet.marker([vehicle.lat, vehicle.lng], { icon });

      // Popup with vehicle info
      const popupContent = `
        <div style="font-family: system-ui; padding: 8px;">
          <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
            Linie ${vehicle.line}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
            → ${vehicle.direction}
          </div>
          ${vehicle.delay > 0 ? `
            <div style="color: #f39200; font-size: 13px; font-weight: 600;">
              +${Math.round(vehicle.delay / 60)} Min Verspätung
            </div>
          ` : `
            <div style="color: #95c11f; font-size: 13px; font-weight: 600;">
              Pünktlich
            </div>
          `}
          <div style="color: #999; font-size: 11px; margin-top: 4px;">
            ${Math.round(vehicle.speed)} km/h
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.addTo(vehicleGroup);
    });

    vehicleGroup.addTo(map);
    layersRef.current.vehicles = vehicleGroup;

    console.log(`🚗 Rendered ${vehicles.length} vehicles`);
  }, [leaflet, vehicles, gtfsData]);

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Lade Karte...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div ref={mapRef} style={styles.map} />

      {/* Instructions */}
      <div style={styles.instructions}>
        💡 Tipp: Klicke auf eine Linie für Detailansicht
      </div>

      {/* Stats */}
      {vehicles.length > 0 && (
        <div style={styles.stats}>
          <span>{vehicles.length} Fahrzeuge aktiv</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '400px'
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#fff',
    fontSize: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  instructions: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    pointerEvents: 'none'
  },
  stats: {
    position: 'absolute',
    bottom: '16px',
    right: '16px',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  }
};
