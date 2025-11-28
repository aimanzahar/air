import { NextResponse } from "next/server";
import type {
  AirQualityStation,
  BoundingBox,
  RadiusSearchRequest,
  BoundingBoxSearchRequest,
  SearchResponse
} from "../../../types/airQuality";

const DOE_BASE_URL = "https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/CAQM_MCAQM_Current_Reading/MapServer/0/query";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Calculate distance between two points in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert radius to lat/lng bounding box
function getBoundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
}

// Fetch all stations from DOE API
async function fetchAllStations(): Promise<AirQualityStation[]> {
  const cacheKey = 'doe-all-stations';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const url = `${DOE_BASE_URL}?f=json&outFields=*&returnGeometry=false&spatialRel=esriSpatialRelIntersects&where=1%3D1`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data?.features) return [];

  const stations: AirQualityStation[] = [];

  for (const feature of data.features) {
    const attrs = feature.attributes;
    if (!attrs || !attrs.LATITUDE || !attrs.LONGITUDE) continue;

    stations.push({
      id: `doe-${attrs.STATION_ID}`,
      name: attrs.STATION_LOCATION || "DOE Station",
      location: attrs.STATION_LOCATION || "Unknown Location",
      city: attrs.PLACE,
      country: "Malaysia",
      lat: attrs.LATITUDE,
      lng: attrs.LONGITUDE,
      aqi: attrs.API,
      pm25: attrs.PARAM_SELECTED === 'PM2.5' ? attrs.API : undefined,
      no2: attrs.PARAM_SELECTED === 'NO2' ? attrs.API : undefined,
      co: attrs.PARAM_SELECTED === 'CO' ? attrs.API : undefined,
      o3: attrs.PARAM_SELECTED === 'O3' ? attrs.API : undefined,
      so2: attrs.PARAM_SELECTED === 'SO2' ? attrs.API : undefined,
      lastUpdated: attrs.DATETIME ? new Date(attrs.DATETIME).toISOString() : undefined,
      source: "doe",
      class: attrs.CLASS,
      category: attrs.STATION_CATEGORY,
      state: attrs.STATE_NAME,
      region: attrs.REGION_NAME
    });
  }

  setCachedData(cacheKey, stations);
  return stations;
}

// Search stations by bounding box
async function searchByBounds(bounds: BoundingBox, limit: number = 100): Promise<AirQualityStation[]> {
  const cacheKey = `doe-bounds-${bounds.north}-${bounds.south}-${bounds.east}-${bounds.west}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  // Build where clause for spatial query
  const whereClause = `LATITUDE > ${bounds.south} AND LATITUDE < ${bounds.north} AND LONGITUDE > ${bounds.west} AND LONGITUDE < ${bounds.east}`;
  const encodedWhere = encodeURIComponent(whereClause);

  const url = `${DOE_BASE_URL}?f=json&outFields=*&returnGeometry=false&where=${encodedWhere}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data?.features) return [];

  const stations: AirQualityStation[] = [];

  for (const feature of data.features) {
    const attrs = feature.attributes;
    if (!attrs || !attrs.LATITUDE || !attrs.LONGITUDE) continue;

    stations.push({
      id: `doe-${attrs.STATION_ID}`,
      name: attrs.STATION_LOCATION || "DOE Station",
      location: attrs.STATION_LOCATION || "Unknown Location",
      city: attrs.PLACE,
      country: "Malaysia",
      lat: attrs.LATITUDE,
      lng: attrs.LONGITUDE,
      aqi: attrs.API,
      pm25: attrs.PARAM_SELECTED === 'PM2.5' ? attrs.API : undefined,
      no2: attrs.PARAM_SELECTED === 'NO2' ? attrs.API : undefined,
      co: attrs.PARAM_SELECTED === 'CO' ? attrs.API : undefined,
      o3: attrs.PARAM_SELECTED === 'O3' ? attrs.API : undefined,
      so2: attrs.PARAM_SELECTED === 'SO2' ? attrs.API : undefined,
      lastUpdated: attrs.DATETIME ? new Date(attrs.DATETIME).toISOString() : undefined,
      source: "doe",
      class: attrs.CLASS,
      category: attrs.STATION_CATEGORY,
      state: attrs.STATE_NAME,
      region: attrs.REGION_NAME
    });

    if (stations.length >= limit) break;
  }

  setCachedData(cacheKey, stations);
  return stations;
}

// Search stations within radius
async function searchByRadius(lat: number, lng: number, radiusKm: number = 100, limit: number = 100): Promise<AirQualityStation[]> {
  const bounds = getBoundingBox(lat, lng, radiusKm);
  const stations = await searchByBounds(bounds, limit * 2); // Get more to filter

  // Filter by actual distance
  const filteredStations = stations
    .map(station => ({
      ...station,
      distance: calculateDistance(lat, lng, station.lat, station.lng)
    }))
    .filter(station => station.distance! <= radiusKm)
    .slice(0, limit);

  return filteredStations;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, radius, limit, mode } = body;

    // Handle different modes
    if (mode === "radius" || radius) {
      if (typeof lat !== "number" || typeof lng !== "number") {
        return NextResponse.json(
          { error: "lat and lng are required numbers for radius search" },
          { status: 400 },
        );
      }

      const radiusKm = radius || 100;
      const stationLimit = limit || 100;
      const stations = await searchByRadius(lat, lng, radiusKm, stationLimit);

      return NextResponse.json({
        success: true,
        data: stations,
        summary: {
          centerLat: lat,
          centerLng: lng,
          radiusKm,
          totalStations: stations.length,
          averageAQI: stations.filter(s => s.aqi).reduce((acc, s) => acc + (s.aqi || 0), 0) / stations.filter(s => s.aqi).length || 0,
          highestAQI: Math.max(...stations.map(s => s.aqi || 0)),
          lowestAQI: Math.min(...stations.map(s => s.aqi === null ? Infinity : s.aqi || Infinity)),
        }
      });
    }
    else if (mode === "bounds" || body.bounds) {
      const bounds: BoundingBox = body.bounds;
      if (!bounds) {
        return NextResponse.json(
          { error: "bounds are required for bounds mode" },
          { status: 400 }
        );
      }

      const stationLimit = limit || 100;
      const stations = await searchByBounds(bounds, stationLimit);

      return NextResponse.json({
        success: true,
        data: stations,
        summary: {
          centerLat: (bounds.north + bounds.south) / 2,
          centerLng: (bounds.east + bounds.west) / 2,
          radiusKm: calculateDistance(
            (bounds.north + bounds.south) / 2,
            (bounds.east + bounds.west) / 2,
            bounds.north,
            bounds.east
          ),
          totalStations: stations.length,
          averageAQI: stations.filter(s => s.aqi).reduce((acc, s) => acc + (s.aqi || 0), 0) / stations.filter(s => s.aqi).length || 0,
          highestAQI: Math.max(...stations.map(s => s.aqi || 0)),
          lowestAQI: Math.min(...stations.map(s => s.aqi === null ? Infinity : s.aqi || Infinity)),
        }
      });
    }
    else {
      // Default: return all stations
      const stations = await fetchAllStations();

      return NextResponse.json({
        success: true,
        data: stations,
        summary: {
          totalStations: stations.length,
          averageAQI: stations.filter(s => s.aqi).reduce((acc, s) => acc + (s.aqi || 0), 0) / stations.filter(s => s.aqi).length || 0,
          highestAQI: Math.max(...stations.map(s => s.aqi || 0)),
          lowestAQI: Math.min(...stations.map(s => s.aqi === null ? Infinity : s.aqi || Infinity)),
        }
      });
    }
  } catch (error) {
    console.error("DOE API error", error);
    return NextResponse.json(
      { error: "Unexpected error fetching DOE data" },
      { status: 500 },
    );
  }
}