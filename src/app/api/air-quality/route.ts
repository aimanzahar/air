import { NextResponse } from "next/server";
import type {
  AirQualityStation,
  BoundingBox,
  RadiusSearchRequest,
  BoundingBoxSearchRequest,
  SearchResponse
} from "../../../types/airQuality";

// Priority order: DOE > WAQI
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
      : { lat, lng, radius: radius || 100, limit };

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        // Mark all stations as WAQI source
        return data.data.map((station: any) => ({ ...station, source: "waqi" }));
      }
    }
  } catch (error) {
    console.error("WAQI API fetch failed:", error);
  }
  return [];
}

async function getSingleStation(lat: number, lng: number): Promise<AirQualityStation | null> {
  // Try DOE first
  const doeStations = await fetchFromDOE(lat, lng, 0.1);
  if (doeStations.length > 0) {
    return doeStations[0];
  }

  // Fallback to WAQI
  const waqiStations = await fetchFromWAQI(lat, lng, 0.1);
  if (waqiStations.length > 0) {
    return waqiStations[0];
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, radius, limit, mode, bounds } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json(
        { error: "lat and lng are required numbers" },
        { status: 400 }
      );
    }

    let stations: AirQualityStation[] = [];
    const stationLimit = limit || 100;

    // Handle different modes
    if (mode === "radius" || radius) {
      const radiusKm = radius || 100;

      // Try DOE first
      const doeStations = await fetchFromDOE(lat, lng, radiusKm, undefined, stationLimit);
      stations.push(...doeStations);

      // If we have enough DOE stations, return them
      if (stations.length >= stationLimit * 0.5) {
        return NextResponse.json({
          success: true,
          data: stations.slice(0, stationLimit),
          summary: {
            centerLat: lat,
            centerLng: lng,
            radiusKm,
            totalStations: stations.length,
            averageAQI: stations.reduce((acc, s) => acc + (s.aqi || 0), 0) / stations.length || 0,
            highestAQI: Math.max(...stations.map(s => s.aqi || 0)),
            lowestAQI: Math.min(...stations.map(s => s.aqi || Infinity)),
            source: "doe"
          }
        });
      }

      // Otherwise, fetch from WAQI to supplement
      const waqiStations = await fetchFromWAQI(lat, lng, radiusKm, undefined, stationLimit);

      // Combine and deduplicate (prioritize DOE)
      const combinedStations = [...stations];

      for (const waqiStation of waqiStations) {
        const exists = combinedStations.some(s =>
          Math.abs(s.lat - waqiStation.lat) < 0.001 &&
          Math.abs(s.lng - waqiStation.lng) < 0.001
        );

        if (!exists && combinedStations.length < stationLimit) {
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

      // If we need more stations, fetch from WAQI
      if (stations.length < stationLimit) {
        const waqiStations = await fetchFromWAQI(0, 0, undefined, searchBounds, stationLimit);

        // Combine and deduplicate (prioritize DOE)
        for (const waqiStation of waqiStations) {
          const exists = stations.some(s =>
            Math.abs(s.lat - waqiStation.lat) < 0.001 &&
            Math.abs(s.lng - waqiStation.lng) < 0.001
          );

          if (!exists && stations.length < stationLimit) {
            stations.push(waqiStation);
          }
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
        return NextResponse.json({ error: "No air quality data available" }, { status: 502 });
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
      { error: "Unexpected error fetching air quality data" },
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