import type {
  AirQualityStation,
  AirQualityData,
  BoundingBox,
  RadiusSearchRequest,
  BoundingBoxSearchRequest,
  SearchResponse,
  AreaAirQualitySummary,
  StationCluster,
  CacheEntry,
  TrackingOptions
} from '../types/airQuality';
import type { Location } from './locationService';

// Cache configuration
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry<any>>();

// Debounce timers
const debounceTimers = new Map<string, NodeJS.Timeout>();

class AirQualityService {
  private config = {
    doe: {
      baseUrl: 'https://eqms.doe.gov.my/api3/publicmapproxy',
      cacheTimeout: DEFAULT_CACHE_TIMEOUT
    }
  };

  // Cache management
  private getCacheKey(prefix: string, params: any): string {
    const key = `${prefix}-${JSON.stringify(params)}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  private getCachedData<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return entry.data;
    }
    cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T, customTimeout?: number): void {
    const timeout = customTimeout || this.config.doe.cacheTimeout;
    cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + timeout
    });

    // Clean up expired entries periodically
    if (cache.size > 100) {
      this.cleanExpiredCache();
    }
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now >= entry.expiry) {
        cache.delete(key);
      }
    }
  }

  // Debouncing
  private debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300,
    maxWait: number = 2000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Clear existing timer
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key)!);
      }

      // Set max wait timer
      const maxWaitTimer = setTimeout(() => {
        if (debounceTimers.has(key)) {
          clearTimeout(debounceTimers.get(key)!);
          debounceTimers.delete(key);
          fn().then(resolve).catch(reject);
        }
      }, maxWait);

      // Set debounce timer
      const timer = setTimeout(() => {
        clearTimeout(maxWaitTimer);
        debounceTimers.delete(key);
        fn().then(resolve).catch(reject);
      }, delay);

      debounceTimers.set(key, timer);
    });
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Convert radius to bounding box
  private getBoundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    
    return {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lng + lngDelta,
      west: lng - lngDelta
    };
  }

  // Fetch from DOE API
  private async fetchDOE(mode: 'radius' | 'bounds' | 'all', params: any): Promise<AirQualityStation[]> {
    const cacheKey = this.getCacheKey('doe', { mode, ...params });
    const cached = this.getCachedData<AirQualityStation[]>(cacheKey);
    if (cached) return cached;

    const url = '/api/doe';
    const body = { mode, ...params };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`DOE API error: ${res.status}`);

      const data = await res.json();
      const stations = data.data || [];

      this.setCachedData(cacheKey, stations, this.config.doe.cacheTimeout);
      return stations;
    } catch (error) {
      console.error('DOE fetch error:', error);
      return [];
    }
  }

  // Get single station data (backward compatibility)
  async getSingleStation(lat: number, lng: number, source?: 'doe'): Promise<AirQualityStation | null> {
    const cacheKey = this.getCacheKey('single', { lat, lng, source });
    const cached = this.getCachedData<AirQualityStation>(cacheKey);
    if (cached) return cached;

    try {
      // Use DOE API
      const doeData = await this.fetchDOE('radius', { lat, lng, radius: 0.1, limit: 1 });
      if (doeData.length > 0) {
        this.setCachedData(cacheKey, doeData[0]);
        return doeData[0];
      }

      return null;
    } catch (error) {
      console.error('Error fetching single station:', error);
      return null;
    }
  }

  // Fetch air quality by radius
  async fetchAirQualityByRadius(
    lat: number,
    lng: number,
    radiusKm: number = 100,
    options: {
      source?: 'doe';
      limit?: number;
      debounce?: boolean;
    } = {}
  ): Promise<SearchResponse> {
    const { source = 'doe', limit = 100, debounce = false } = options;
    const cacheKey = this.getCacheKey('radius', { lat, lng, radiusKm, source, limit });

    if (debounce) {
      return this.debounce(cacheKey, () => this._fetchAirQualityByRadius(lat, lng, radiusKm, { source, limit }));
    }

    return this._fetchAirQualityByRadius(lat, lng, radiusKm, { source, limit });
  }

  private async _fetchAirQualityByRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { source: 'doe'; limit: number }
  ): Promise<SearchResponse> {
    try {
      const stations: AirQualityStation[] = [];

      // Fetch from DOE API
      const doeStations = await this.fetchDOE('radius', { lat, lng, radius: radiusKm, limit: options.limit });
      stations.push(...doeStations);

      // Sort by distance and limit
      const sortedStations = stations
        .map(station => ({
          ...station,
          distance: this.calculateDistance(lat, lng, station.lat, station.lng)
        }))
        .filter(station => station.distance! <= radiusKm)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, options.limit);

      // Calculate summary
      const summary = this.calculateAreaSummary(lat, lng, radiusKm, sortedStations);

      return {
        success: true,
        data: sortedStations,
        summary
      };
    } catch (error) {
      console.error('Error fetching air quality by radius:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Fetch all stations in an area (bounding box)
  async fetchAllStationsInArea(
    bounds: BoundingBox,
    options: {
      source?: 'doe';
      limit?: number;
      page?: number;
    } = {}
  ): Promise<SearchResponse> {
    const { source = 'doe', limit = 100, page = 1 } = options;

    try {
      const stations: AirQualityStation[] = [];

      // Fetch from DOE API
      const doeStations = await this.fetchDOE('bounds', { bounds, limit, page });
      stations.push(...doeStations);

      // Calculate summary
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      const radiusKm = this.calculateDistance(centerLat, centerLng, bounds.north, bounds.east);
      const summary = this.calculateAreaSummary(centerLat, centerLng, radiusKm, stations);

      return {
        success: true,
        data: stations,
        summary
      };
    } catch (error) {
      console.error('Error fetching stations in area:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Calculate average AQI from stations
  calculateAverageAQI(stations: AirQualityStation[]): number {
    const validStations = stations.filter(s => s.aqi && s.aqi > 0);
    if (validStations.length === 0) return 0;
    
    const sum = validStations.reduce((acc, station) => acc + station.aqi!, 0);
    return Math.round(sum / validStations.length);
  }

  // Cluster stations for performance
  clusterStations(stations: AirQualityStation[], clusterSizeKm: number = 5): StationCluster[] {
    if (stations.length === 0) return [];

    const clusters: StationCluster[] = [];
    const processed = new Set<string>();

    for (const station of stations) {
      const key = `${station.lat.toFixed(3)}-${station.lng.toFixed(3)}`;
      if (processed.has(key)) continue;

      // Find nearby stations for clustering
      const nearby = stations.filter(s => {
        const sKey = `${s.lat.toFixed(3)}-${s.lng.toFixed(3)}`;
        if (processed.has(sKey)) return false;
        const distance = this.calculateDistance(station.lat, station.lng, s.lat, s.lng);
        return distance <= clusterSizeKm;
      });

      if (nearby.length > 0) {
        // Mark all as processed
        nearby.forEach(s => {
          const sKey = `${s.lat.toFixed(3)}-${s.lng.toFixed(3)}`;
          processed.add(sKey);
        });

        // Calculate cluster center and average AQI
        const avgLat = nearby.reduce((acc, s) => acc + s.lat, 0) / nearby.length;
        const avgLng = nearby.reduce((acc, s) => acc + s.lng, 0) / nearby.length;
        const avgAQI = this.calculateAverageAQI(nearby);

        clusters.push({
          id: `cluster-${clusters.length}`,
          centerLat: avgLat,
          centerLng: avgLng,
          count: nearby.length,
          averageAQI: avgAQI,
          stations: nearby
        });
      }
    }

    return clusters;
  }

  
  // Calculate area summary
  private calculateAreaSummary(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    stations: AirQualityStation[]
  ): AreaAirQualitySummary {
    const validAQI = stations.filter(s => s.aqi && s.aqi > 0);
    
    return {
      centerLat,
      centerLng,
      radiusKm,
      totalStations: stations.length,
      averageAQI: this.calculateAverageAQI(validAQI),
      highestAQI: validAQI.length > 0 ? Math.max(...validAQI.map(s => s.aqi!)) : 0,
      lowestAQI: validAQI.length > 0 ? Math.min(...validAQI.map(s => s.aqi!)) : 0,
      stations
    };
  }

  // Get tracking options with defaults
  getTrackingOptions(overrides: Partial<TrackingOptions> = {}): TrackingOptions {
    return {
      enabled: true,
      radiusKm: 100,
      updateInterval: 5000,
      debounceDelay: 1000,
      maxStations: 50,
      clustering: true,
      clusterSize: 5,
      ...overrides
    };
  }

  // Clear all cached data
  clearCache(): void {
    cache.clear();
    debounceTimers.forEach(timer => clearTimeout(timer));
    debounceTimers.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    };
  }
}

// Export singleton instance
export const airQualityService = new AirQualityService();

// Export types for convenience
export type {
  AirQualityStation,
  AirQualityData,
  AreaAirQualitySummary,
  StationCluster,
  TrackingOptions
} from '../types/airQuality';