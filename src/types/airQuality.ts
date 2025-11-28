// Core air quality data structure
export interface AirQualityData {
  location: string;
  city?: string;
  country?: string;
  pm25: number | null;
  no2: number | null;
  co: number | null;
  unit?: string;
  lastUpdated?: string | null;
  source?: "waqi" | "openaq" | "doe";
}

// Station data structure
export interface AirQualityStation {
  id?: string;
  name: string;
  location: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
  aqi?: number;
  pm25?: number;
  no2?: number;
  co?: number;
  o3?: number;
  so2?: number;
  lastUpdated?: string;
  distance?: number; // Distance from reference point in km
  source?: "waqi" | "openaq" | "doe";
  class?: string; // Air quality class (Good, Moderate, etc.)
  category?: string; // Station category (Urban, Rural, etc.)
  state?: string; // State name
  region?: string; // Region name
}

// Bounding box for area searches
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Station cluster for performance
export interface StationCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  count: number;
  averageAQI: number;
  stations: AirQualityStation[];
}

// Area air quality summary
export interface AreaAirQualitySummary {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  totalStations: number;
  averageAQI: number;
  highestAQI: number;
  lowestAQI: number;
  stations: AirQualityStation[];
  clusters?: StationCluster[];
}

// API request/response types
export interface RadiusSearchRequest {
  lat: number;
  lng: number;
  radius?: number; // in kilometers, default 100
  limit?: number; // maximum stations to return
  source?: "doe";
}

export interface BoundingBoxSearchRequest {
  bounds: BoundingBox;
  limit?: number;
  source?: "doe";
}

export interface SearchResponse {
  success: boolean;
  data: AirQualityStation[];
  summary?: AreaAirQualitySummary;
  error?: string;
}

// Cache entry for performance optimization
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// API configuration
export interface APIConfig {
  doe: {
    baseUrl: string;
    cacheTimeout: number;
    maxRadius: number; // maximum supported radius in meters
  };
}

// Debounce configuration
export interface DebounceConfig {
  delay: number; // in milliseconds
  maxWait: number; // maximum wait time
}

// Tracking options for real-time updates
export interface TrackingOptions {
  enabled: boolean;
  radiusKm: number;
  updateInterval: number; // in milliseconds
  debounceDelay: number;
  maxStations: number;
  clustering: boolean;
  clusterSize: number; // km
}

export type RiskLevel = "low" | "moderate" | "high" | "loading";