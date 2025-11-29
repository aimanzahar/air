import { NextResponse } from "next/server";
import type {
  AirQualityStation,
  BoundingBox,
  RadiusSearchRequest,
  BoundingBoxSearchRequest,
  SearchResponse
} from "../../../types/airQuality";

// Priority order: DOE > WAQI (OpenAQ disabled - v2 deprecated, v3 requires API key)
async function fetchFromDOE(lat: number, lng: number, radius?: number, bounds?: BoundingBox, limit?: number): Promise<AirQualityStation[]> {
  try {
    const url = bounds
      ? "/api/doe"
      : "/api/doe";

    const body = bounds
      ? { mode: "bounds", bounds, limit }
      : { lat, lng, radius: radius || 100, limit };

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        // Mark all stations as DOE source
        return data.data.map((station: any) => ({ ...station, source: "doe" }));
      }
    }
  } catch (error) {
    console.error("DOE API fetch failed:", error);
  }
  return [];
}

async function fetchFromWAQI(lat: number, lng: number, radius?: number, bounds?: BoundingBox, limit?: number): Promise<AirQualityStation[]> {
  try {
    const url = bounds
      ? "/api/waqi"
      : "/api/waqi";

    const body = bounds
      ? { mode: "bounds", bounds, limit }
      : { lat, lon: lng, radius: radius || 100, limit };

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        // Mark all stations as WAQI source and filter out invalid AQI
        return data.data
          .filter((station: any) => station.aqi !== null && station.aqi !== undefined && station.aqi !== "-")
          .map((station: any) => ({ ...station, source: "waqi" }));
      }
    }
  } catch (error) {
    console.error("WAQI API fetch failed:", error);
  }
  return [];
}

async function getSingleStation(lat: number, lng: number): Promise<AirQualityStation | null> {
  // Try DOE first with a larger radius to find the nearest station
  const doeStations = await fetchFromDOE(lat, lng, 10); // 10km radius
  if (doeStations.length > 0) {
    // Sort by distance and return the closest
    doeStations.sort((a, b) => {
      const distA = calculateDistance(lat, lng, a.lat, a.lng);
      const distB = calculateDistance(lat, lng, b.lat, b.lng);
      return distA - distB;
    });
    return doeStations[0];
  }

  // Fallback to WAQI with larger radius
  const waqiStations = await fetchFromWAQI(lat, lng, 10); // 10km radius
  if (waqiStations.length > 0) {
    // Sort by distance and return the closest
    waqiStations.sort((a, b) => {
      const distA = calculateDistance(lat, lng, a.lat, a.lng);
      const distB = calculateDistance(lat, lng, b.lat, b.lng);
      return distA - distB;
    });
    return waqiStations[0];
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, radius, limit, mode, bounds } = body;


    // Enhanced validation with better error messages
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return NextResponse.json(
        { 
          error: "Missing coordinates",
          message: "Latitude and longitude are required. Please provide valid lat and lng values.",
          received: { lat, lng }
        },
        { status: 400 }
      );
    }

    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { 
          error: "Invalid coordinates",
          message: "Latitude and longitude must be valid numbers.",
          received: { lat, lng, latType: typeof lat, lngType: typeof lng }
        },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { 
          error: "Coordinates out of range",
          message: "Latitude must be between -90 and 90, longitude must be between -180 and 180.",
          received: { lat, lng }
        },
        { status: 400 }
      );
    }

    let stations: AirQualityStation[] = [];
    const stationLimit = limit || 200; // Increased limit to accommodate both DOE and WAQI

    // Handle different modes
    if (mode === "radius" || radius) {
      const radiusKm = radius || 100;

      // Try DOE first
      const doeStations = await fetchFromDOE(lat, lng, radiusKm, undefined, stationLimit);
      stations.push(...doeStations);

      // Always fetch from WAQI to supplement DOE data
      const waqiStations = await fetchFromWAQI(lat, lng, radiusKm, undefined, stationLimit);

      // Combine both DOE and WAQI stations (no deduplication to show all sources)
      const combinedStations = [...doeStations];

      // Add WAQI stations if we still have room
      for (const waqiStation of waqiStations) {
        if (combinedStations.length < stationLimit) {
          combinedStations.push(waqiStation);
        }
      }

      return NextResponse.json({
        success: true,
        data: combinedStations,
        summary: {
          centerLat: lat,
          centerLng: lng,
          radiusKm,
          totalStations: combinedStations.length,
          averageAQI: combinedStations.reduce((acc, s) => acc + (s.aqi || 0), 0) / combinedStations.length || 0,
          highestAQI: Math.max(...combinedStations.map(s => s.aqi || 0)),
          lowestAQI: Math.min(...combinedStations.map(s => s.aqi || Infinity)),
          source: "combined"
        }
      });
    }
    else if (mode === "bounds" || bounds) {
      const searchBounds: BoundingBox = bounds;
      if (!searchBounds) {
        return NextResponse.json(
          { error: "bounds are required for bounds mode" },
          { status: 400 }
        );
      }

      // Try DOE first
      const doeStations = await fetchFromDOE(0, 0, undefined, searchBounds, stationLimit);
      stations.push(...doeStations);

      // Always fetch from WAQI to supplement
      const waqiStations = await fetchFromWAQI(0, 0, undefined, searchBounds, stationLimit);

      // Combine both DOE and WAQI stations
      for (const waqiStation of waqiStations) {
        if (stations.length < stationLimit) {
          stations.push(waqiStation);
        }
      }

      return NextResponse.json({
        success: true,
        data: stations,
        summary: {
          centerLat: (searchBounds.north + searchBounds.south) / 2,
          centerLng: (searchBounds.east + searchBounds.west) / 2,
          radiusKm: calculateDistance(
            (searchBounds.north + searchBounds.south) / 2,
            (searchBounds.east + searchBounds.west) / 2,
            searchBounds.north,
            searchBounds.east
          ),
          totalStations: stations.length,
          averageAQI: stations.reduce((acc, s) => acc + (s.aqi || 0), 0) / stations.length || 0,
          highestAQI: Math.max(...stations.map(s => s.aqi || 0)),
          lowestAQI: Math.min(...stations.map(s => s.aqi || Infinity)),
          source: "combined"
        }
      });
    }
    else {
      // Default: single station with DOE priority
      const station = await getSingleStation(lat, lng);
      if (!station) {
        return NextResponse.json({ 
          error: "No air quality data available",
          message: "Could not find air quality stations near your location. Try again with a different location.",
          coordinates: { lat, lng }
        }, { status: 502 });
      }

      return NextResponse.json({
        location: station.location,
        city: station.city,
        country: station.country,
        pm25: station.pm25,
        no2: station.no2,
        co: station.co,
        o3: station.o3,
        so2: station.so2,
        unit: "µg/m³",
        lastUpdated: station.lastUpdated,
        source: station.source,
        aqi: station.aqi
      });
    }
  } catch (error) {
    console.error("Combined air quality API error", error);
    return NextResponse.json(
      { 
        error: "Unexpected error fetching air quality data",
        message: "An unexpected error occurred while fetching air quality data. Please try again later.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate distance
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