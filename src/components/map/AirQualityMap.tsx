"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline, useMapEvents } from "react-leaflet";
import { Icon, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat/dist/leaflet-heat.js";
import { type Location } from "../../lib/locationService";
import { getRadiusFromZoom, formatRadius } from "../../lib/radiusUtils";

// Fix for default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Dynamic import to avoid SSR issues
const HeatmapLayer = dynamic(
  () => import("./HeatmapLayer"),
  { ssr: false }
);

// Dynamic import to avoid SSR issues
const ZoomControl = dynamic(
  () => import("./ZoomControl"),
  { ssr: false }
);

interface AirQualityData {
  lat?: number;
  lng?: number;
  pm25?: number;
  no2?: number;
  co?: number;
  o3?: number;
  so2?: number;
  pm10?: number;
  aqi?: number;
  location: string;
  source?: string;
}

interface AirQualityMapProps {
  center: Location;
  userLocation?: Location;
  airQualityData?: AirQualityData[];
  nearbyStations?: any[];
  className?: string;
  locationHistory?: Location[];
  showRadius?: boolean;
  radiusKm?: number;
  isTracking?: boolean;
  onZoomChange?: (zoom: number) => void;
  onRadiusChange?: (radius: number) => void;
  selectedPollutant?: 'aqi' | 'pm25' | 'no2' | 'co' | 'o3' | 'so2';
  onPollutantChange?: (pollutant: 'aqi' | 'pm25' | 'no2' | 'co' | 'o3' | 'so2') => void;
}

const MapController = ({ center, zoom }: { center: Location; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const MapInstanceSetter = ({ mapRef }: { mapRef: React.MutableRefObject<LeafletMap | null> }) => {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
};

// Custom map events handler
const MapEventHandler = ({ 
  onZoomChange, 
  onRadiusChange 
}: { 
  onZoomChange?: (zoom: number) => void;
  onRadiusChange?: (radius: number) => void;
}) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange?.(zoom);
      onRadiusChange?.(getRadiusFromZoom(zoom));
    },
  });

  return null;
};

export default function AirQualityMap({
  center,
  userLocation,
  airQualityData = [],
  nearbyStations = [],
  className = "",
  locationHistory = [],
  showRadius = false,
  radiusKm = 100,
  isTracking = false,
  onZoomChange,
  onRadiusChange,
  selectedPollutant = 'aqi',
  onPollutantChange,
}: AirQualityMapProps) {
  const [mapLayer, setMapLayer] = useState("street");
  const [zoom, setZoom] = useState(13);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [currentRadius, setCurrentRadius] = useState(radiusKm);
  const [isAnimating, setIsAnimating] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Update center when user location changes and tracking is active
  useEffect(() => {
    if (isTracking && userLocation) {
      const newZoom = 15;
      setZoom(newZoom);
      const newRadius = getRadiusFromZoom(newZoom);
      setCurrentRadius(newRadius);
      onZoomChange?.(newZoom);
      onRadiusChange?.(newRadius);
    }
  }, [userLocation, isTracking, onZoomChange, onRadiusChange]);

  // Update radius when zoom changes
  useEffect(() => {
    const newRadius = getRadiusFromZoom(zoom);
    setCurrentRadius(newRadius);
  }, [zoom]);

  // Handle zoom changes with animation
  const handleZoomChange = useCallback((newZoom: number) => {
    setIsAnimating(true);
    setZoom(newZoom);
    onZoomChange?.(newZoom);
    setTimeout(() => setIsAnimating(false), 500);
  }, [onZoomChange]);

  // Handle radius changes
  const handleRadiusChange = useCallback((newRadius: number) => {
    setCurrentRadius(newRadius);
    onRadiusChange?.(newRadius);
  }, [onRadiusChange]);

  const tileLayers = {
    street: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    },
  };

  const getAQIColor = (aqi?: number) => {
    if (!aqi) return "#gray";
    if (aqi <= 50) return "#00e400"; // Good - Green
    if (aqi <= 100) return "#ffff00"; // Moderate - Yellow
    if (aqi <= 150) return "#ff7e00"; // Unhealthy for Sensitive - Orange
    if (aqi <= 200) return "#ff0000"; // Unhealthy - Red
    if (aqi <= 300) return "#8f3f97"; // Very Unhealthy - Purple
    return "#7e0023"; // Hazardous - Maroon
  };

  const createAirQualityIcon = (aqi?: number) => {
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="15" fill="${getAQIColor(aqi)}" opacity="0.7" stroke="white" stroke-width="2"/>
          <text x="20" y="25" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle" fill="white">${aqi || 'N/A'}</text>
        </svg>
      `)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 space-y-2">
        {/* Layer Toggle */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => setMapLayer("street")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mapLayer === "street"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setMapLayer("satellite")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mapLayer === "satellite"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setMapLayer("terrain")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              mapLayer === "terrain"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Terrain
          </button>
        </div>

        {/* Heatmap Toggle */}
        <div className="border-t pt-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={(e) => setShowHeatmap(e.target.checked)}
              className="rounded"
            />
            Heatmap
          </label>
        </div>

        {/* Pollutant Selector */}
        {showHeatmap && (
          <div className="border-t pt-2">
            <div className="text-xs font-medium text-gray-700 mb-1">Pollutant</div>
            <select
              value={selectedPollutant}
              onChange={(e) => onPollutantChange?.(e.target.value as any)}
              className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="aqi">AQI</option>
              <option value="pm25">PM2.5</option>
              <option value="no2">NO₂</option>
              <option value="co">CO</option>
              <option value="o3">O₃</option>
              <option value="so2">SO₂</option>
            </select>
          </div>
        )}
      </div>

      {/* Custom Zoom Control with Radius Display */}
      <div className="absolute top-4 left-4 z-[1000]">
        <ZoomControl
          currentZoom={zoom}
          onZoomChange={handleZoomChange}
          onRadiusChange={handleRadiusChange}
          showRadius={showRadius}
        />
      </div>

      {/* Coverage Area Label */}
      {showRadius && userLocation && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2">
          <div className="text-sm font-medium text-gray-900">
            Coverage: {formatRadius(currentRadius)}
          </div>
          <div className="text-xs text-gray-500">
            {nearbyStations?.length || 0} stations
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
      >
        <MapInstanceSetter mapRef={mapRef} />
        <MapController center={{ lat: center.lat, lng: center.lng }} zoom={zoom} />
        <MapEventHandler 
          onZoomChange={onZoomChange} 
          onRadiusChange={onRadiusChange}
        />

        <TileLayer
          url={tileLayers[mapLayer as keyof typeof tileLayers].url}
          attribution={tileLayers[mapLayer as keyof typeof tileLayers].attribution}
        />

        {/* User Location Marker with dynamic updates */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            key={`${userLocation.lat}-${userLocation.lng}-${Date.now()}`} // Force re-render on location change
          >
            <Popup>
              <div className="text-sm">
                <strong>Your Location</strong>
                <br />
                Lat: {userLocation.lat.toFixed(6)}
                <br />
                Lng: {userLocation.lng.toFixed(6)}
                {isTracking && (
                  <>
                    <br />
                    <span className="text-emerald-600 font-medium">● Tracking Active</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dynamic Radius Circle */}
        {showRadius && userLocation && (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            radius={currentRadius * 1000} // Convert km to meters
            pathOptions={{
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              color: '#3b82f6',
              weight: 2,
              opacity: isAnimating ? 0.8 : 0.5,
              dashArray: isAnimating ? '5, 5' : '10, 10',
              className: isAnimating ? 'animate-pulse' : '',
            }}
          />
        )}

        {/* Location History Polyline */}
        {locationHistory && locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map(loc => [loc.lat, loc.lng])}
            pathOptions={{
              color: '#10b981',
              weight: 3,
              opacity: 0.7,
            }}
          />
        )}

        {/* Air Quality Station Markers */}
        {nearbyStations?.map((station, index) => (
          <Marker
            key={index}
            position={[station.lat, station.lng]}
            icon={createAirQualityIcon(station.aqi)}
          >
            <Popup>
              <div className="text-sm p-2">
                <h3 className="font-bold">{station.name || "Air Quality Station"}</h3>
                <p className="text-gray-600">{station.location || "Unknown Location"}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>AQI:</span>
                    <span className="font-bold" style={{ color: getAQIColor(station.aqi) }}>
                      {station.aqi || "N/A"}
                    </span>
                  </div>
                  {station.pm25 && (
                    <div className="flex justify-between">
                      <span>PM2.5:</span>
                      <span>{station.pm25} μg/m³</span>
                    </div>
                  )}
                  {station.no2 && (
                    <div className="flex justify-between">
                      <span>NO₂:</span>
                      <span>{station.no2} ppb</span>
                    </div>
                  )}
                  {station.co && (
                    <div className="flex justify-between">
                      <span>CO:</span>
                      <span>{station.co} mg/m³</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Heatmap Layer */}
        {showHeatmap && airQualityData && airQualityData.length > 0 && (
          <HeatmapLayer data={airQualityData} selectedPollutant={selectedPollutant} />
        )}
      </MapContainer>
    </div>
  );
}
