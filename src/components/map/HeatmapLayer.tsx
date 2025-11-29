"use client";

import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface HeatmapData {
  lat: number;
  lng: number;
  intensity?: number;
}

interface HeatmapLayerProps {
  data: Array<{
    lat?: number;
    lng?: number;
    pm25?: number;
    no2?: number;
    co?: number;
    o3?: number;
    so2?: number;
    pm10?: number;
    aqi?: number;
    location?: string;
    source?: string;
  }>;
  selectedPollutant?: 'aqi' | 'pm25' | 'no2' | 'co' | 'o3' | 'so2';
}

export default function HeatmapLayer({ data, selectedPollutant = 'aqi' }: HeatmapLayerProps) {
  const map = useMap();

  // Convert air quality data to heatmap format based on selected pollutant
  const heatmapData = useMemo(() => {
    return data.map(item => {
      if (!item.lat || !item.lng) return null;

      let intensity = 0;
      let value = 0;

      // Calculate intensity based on selected pollutant
      switch (selectedPollutant) {
        case 'aqi':
          value = item.aqi || 0;
          intensity = Math.min(value / 300, 1); // Normalize AQI 0-300 to 0-1
          break;
        case 'pm25':
          value = item.pm25 || 0;
          intensity = Math.min(value / 150, 1); // PM2.5: 0-150 µg/m³ to 0-1
          break;
        case 'no2':
          value = item.no2 || 0;
          intensity = Math.min(value / 200, 1); // NO2: 0-200 ppb to 0-1
          break;
        case 'co':
          value = item.co || 0;
          intensity = Math.min(value / 10, 1); // CO: 0-10 ppm to 0-1
          break;
        case 'o3':
          value = item.o3 || 0;
          intensity = Math.min(value / 180, 1); // O3: 0-180 ppb to 0-1
          break;
        case 'so2':
          value = item.so2 || 0;
          intensity = Math.min(value / 100, 1); // SO2: 0-100 ppb to 0-1
          break;
      }

      // If no value for selected pollutant, use composite intensity
      if (value === 0) {
        const pm25Intensity = item.pm25 ? Math.min(item.pm25 / 150, 1) : 0;
        const no2Intensity = item.no2 ? Math.min(item.no2 / 200, 1) : 0;
        const coIntensity = item.co ? Math.min(item.co / 10, 1) : 0;
        const o3Intensity = item.o3 ? Math.min(item.o3 / 180, 1) : 0;
        const so2Intensity = item.so2 ? Math.min(item.so2 / 100, 1) : 0;

        intensity = Math.max(pm25Intensity, no2Intensity, coIntensity, o3Intensity, so2Intensity);
      }

      // Prioritize DOE data by increasing intensity for DOE stations
      if (item.source === 'doe') {
        intensity = Math.min(intensity * 1.2, 1); // Boost DOE data by 20%
      }

      return [item.lat, item.lng, intensity];
    }).filter(Boolean) as [number, number, number][];
  }, [data, selectedPollutant]);

  useEffect(() => {
    if (!map || !heatmapData || heatmapData.length === 0) return;

    // Create heatmap layer
    const heatLayer = (L as any).heatLayer(heatmapData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#00ff00', // Green (Good)
        0.2: '#ffff00', // Yellow (Moderate)
        0.4: '#ff7e00', // Orange (Unhealthy for Sensitive)
        0.6: '#ff0000', // Red (Unhealthy)
        0.8: '#8f3f97', // Purple (Very Unhealthy)
        1.0: '#7e0023', // Maroon (Hazardous)
      },
    });

    // Add layer to map
    heatLayer.addTo(map);

    // Cleanup
    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, heatmapData]);

  return null;
}