import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store air quality reading with hour tracking
export const storeReading = mutation({
  args: {
    userKey: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationName: v.string(),
    aqi: v.number(),
    pm25: v.optional(v.number()),
    pm10: v.optional(v.number()),
    no2: v.optional(v.number()),
    co: v.optional(v.number()),
    o3: v.optional(v.number()),
    so2: v.optional(v.number()),
    source: v.string(),
    riskLevel: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a reading for this location in the last 15 minutes
    const recentReadings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey_location", (q) => 
        q.eq("userKey", args.userKey).eq("locationName", args.locationName)
      )
      .filter((q) => q.gt(q.field("timestamp"), now - 900000)) // Last 15 minutes
      .collect();
    
    // If we have a recent reading (within 15 min), don't store duplicate
    if (recentReadings.length > 0) {
      return recentReadings[0]._id;
    }
    
    // Store the new reading with hour tracking
    const id = await ctx.db.insert("airQualityHistory", {
      userKey: args.userKey,
      lat: args.lat,
      lng: args.lng,
      locationName: args.locationName,
      aqi: args.aqi,
      pm25: args.pm25,
      pm10: args.pm10,
      no2: args.no2,
      co: args.co,
      o3: args.o3,
      so2: args.so2,
      source: args.source,
      riskLevel: args.riskLevel,
      timestamp: now,
      date: today,
    });
    
    return id;
  },
});

// Get readings for a specific location over time
export const getLocationHistory = query({
  args: {
    userKey: v.string(),
    locationName: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey_location", (q) => 
        q.eq("userKey", args.userKey).eq("locationName", args.locationName)
      )
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .order("desc")
      .collect();
    
    return readings;
  },
});

// Get all readings for a user
export const getUserHistory = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .order("desc")
      .collect();
    
    return readings;
  },
});

// Get daily averages for comparison
export const getDailyAverages = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .collect();
    
    // Group by date
    const dailyData: Record<string, {
      date: string;
      readings: number;
      totalAqi: number;
      totalPm25: number;
      totalNo2: number;
      pm25Count: number;
      no2Count: number;
    }> = {};
    
    readings.forEach((reading) => {
      const date = reading.date;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          readings: 0,
          totalAqi: 0,
          totalPm25: 0,
          totalNo2: 0,
          pm25Count: 0,
          no2Count: 0,
        };
      }
      dailyData[date].readings++;
      dailyData[date].totalAqi += reading.aqi;
      if (reading.pm25) {
        dailyData[date].totalPm25 += reading.pm25;
        dailyData[date].pm25Count++;
      }
      if (reading.no2) {
        dailyData[date].totalNo2 += reading.no2;
        dailyData[date].no2Count++;
      }
    });
    
    // Calculate averages
    return Object.values(dailyData)
      .map((day) => ({
        date: day.date,
        avgAqi: Math.round(day.totalAqi / day.readings),
        avgPm25: day.pm25Count > 0 ? Math.round(day.totalPm25 / day.pm25Count) : null,
        avgNo2: day.no2Count > 0 ? Math.round((day.totalNo2 / day.no2Count) * 10) / 10 : null,
        readings: day.readings,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get comparison between locations
export const compareLocations = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = args.days || 7;
    const cutoffTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .collect();
    
    // Group by location
    const locationData: Record<string, {
      locationName: string;
      readings: number;
      totalAqi: number;
      totalPm25: number;
      pm25Count: number;
      minAqi: number;
      maxAqi: number;
      lat: number;
      lng: number;
    }> = {};
    
    readings.forEach((reading) => {
      const loc = reading.locationName;
      if (!locationData[loc]) {
        locationData[loc] = {
          locationName: loc,
          readings: 0,
          totalAqi: 0,
          totalPm25: 0,
          pm25Count: 0,
          minAqi: Infinity,
          maxAqi: -Infinity,
          lat: reading.lat,
          lng: reading.lng,
        };
      }
      locationData[loc].readings++;
      locationData[loc].totalAqi += reading.aqi;
      locationData[loc].minAqi = Math.min(locationData[loc].minAqi, reading.aqi);
      locationData[loc].maxAqi = Math.max(locationData[loc].maxAqi, reading.aqi);
      if (reading.pm25) {
        locationData[loc].totalPm25 += reading.pm25;
        locationData[loc].pm25Count++;
      }
    });
    
    return Object.values(locationData)
      .map((loc) => ({
        locationName: loc.locationName,
        avgAqi: Math.round(loc.totalAqi / loc.readings),
        avgPm25: loc.pm25Count > 0 ? Math.round(loc.totalPm25 / loc.pm25Count) : null,
        minAqi: loc.minAqi === Infinity ? null : loc.minAqi,
        maxAqi: loc.maxAqi === -Infinity ? null : loc.maxAqi,
        readings: loc.readings,
        lat: loc.lat,
        lng: loc.lng,
      }))
      .sort((a, b) => b.readings - a.readings);
  },
});

// Get statistics summary
export const getStatsSummary = query({
  args: {
    userKey: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);
    const last30d = now - (30 * 24 * 60 * 60 * 1000);
    
    const allReadings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .collect();
    
    const last24hReadings = allReadings.filter(r => r.timestamp > last24h);
    const last7dReadings = allReadings.filter(r => r.timestamp > last7d);
    const last30dReadings = allReadings.filter(r => r.timestamp > last30d);
    
    const calculateStats = (readings: typeof allReadings) => {
      if (readings.length === 0) return null;
      const aqis = readings.map(r => r.aqi);
      return {
        count: readings.length,
        avgAqi: Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length),
        minAqi: Math.min(...aqis),
        maxAqi: Math.max(...aqis),
        locations: new Set(readings.map(r => r.locationName)).size,
      };
    };
    
    return {
      last24h: calculateStats(last24hReadings),
      last7d: calculateStats(last7dReadings),
      last30d: calculateStats(last30dReadings),
      total: calculateStats(allReadings),
    };
  },
});

// Get hourly averages for detailed analysis
export const getHourlyAverages = query({
  args: {
    userKey: v.string(),
    hours: v.optional(v.number()), // Last N hours, default 24
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hours || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .collect();
    
    // Group by hour
    const hourlyData: Record<string, {
      hour: string;
      timestamp: number;
      readings: number;
      totalAqi: number;
      totalPm25: number;
      totalNo2: number;
      totalCo: number;
      totalO3: number;
      totalSo2: number;
      pm25Count: number;
      no2Count: number;
      coCount: number;
      o3Count: number;
      so2Count: number;
      minAqi: number;
      maxAqi: number;
    }> = {};
    
    readings.forEach((reading) => {
      const date = new Date(reading.timestamp);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          hour: hourKey,
          timestamp: reading.timestamp,
          readings: 0,
          totalAqi: 0,
          totalPm25: 0,
          totalNo2: 0,
          totalCo: 0,
          totalO3: 0,
          totalSo2: 0,
          pm25Count: 0,
          no2Count: 0,
          coCount: 0,
          o3Count: 0,
          so2Count: 0,
          minAqi: Infinity,
          maxAqi: -Infinity,
        };
      }
      hourlyData[hourKey].readings++;
      hourlyData[hourKey].totalAqi += reading.aqi;
      hourlyData[hourKey].minAqi = Math.min(hourlyData[hourKey].minAqi, reading.aqi);
      hourlyData[hourKey].maxAqi = Math.max(hourlyData[hourKey].maxAqi, reading.aqi);
      
      if (reading.pm25) {
        hourlyData[hourKey].totalPm25 += reading.pm25;
        hourlyData[hourKey].pm25Count++;
      }
      if (reading.no2) {
        hourlyData[hourKey].totalNo2 += reading.no2;
        hourlyData[hourKey].no2Count++;
      }
      if (reading.co) {
        hourlyData[hourKey].totalCo += reading.co;
        hourlyData[hourKey].coCount++;
      }
      if (reading.o3) {
        hourlyData[hourKey].totalO3 += reading.o3;
        hourlyData[hourKey].o3Count++;
      }
      if (reading.so2) {
        hourlyData[hourKey].totalSo2 += reading.so2;
        hourlyData[hourKey].so2Count++;
      }
    });
    
    // Calculate averages and format
    return Object.values(hourlyData)
      .map((hour) => ({
        hour: hour.hour,
        timestamp: hour.timestamp,
        displayHour: new Date(hour.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
        displayDate: new Date(hour.timestamp).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        avgAqi: Math.round(hour.totalAqi / hour.readings),
        minAqi: hour.minAqi === Infinity ? null : hour.minAqi,
        maxAqi: hour.maxAqi === -Infinity ? null : hour.maxAqi,
        avgPm25: hour.pm25Count > 0 ? Math.round(hour.totalPm25 / hour.pm25Count) : null,
        avgNo2: hour.no2Count > 0 ? Math.round((hour.totalNo2 / hour.no2Count) * 10) / 10 : null,
        avgCo: hour.coCount > 0 ? Math.round((hour.totalCo / hour.coCount) * 100) / 100 : null,
        avgO3: hour.o3Count > 0 ? Math.round(hour.totalO3 / hour.o3Count) : null,
        avgSo2: hour.so2Count > 0 ? Math.round(hour.totalSo2 / hour.so2Count) : null,
        readings: hour.readings,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  },
});

// Get recent readings for live updates (last N minutes)
export const getRecentReadings = query({
  args: {
    userKey: v.string(),
    minutes: v.optional(v.number()), // Last N minutes, default 60
  },
  handler: async (ctx, args) => {
    const minutesBack = args.minutes || 60;
    const cutoffTime = Date.now() - (minutesBack * 60 * 1000);
    
    const readings = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .filter((q) => q.gt(q.field("timestamp"), cutoffTime))
      .order("desc")
      .take(100);
    
    return readings.map(r => ({
      ...r,
      displayTime: new Date(r.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
    }));
  },
});

// Get the last reading timestamp for a user to check if refresh is needed
export const getLastReadingTimestamp = query({
  args: {
    userKey: v.string(),
  },
  handler: async (ctx, args) => {
    const lastReading = await ctx.db
      .query("airQualityHistory")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .order("desc")
      .first();
    
    if (!lastReading) {
      return null;
    }
    
    const now = Date.now();
    const lastTimestamp = lastReading.timestamp;
    const hourInMs = 60 * 60 * 1000;
    const timeSinceLastReading = now - lastTimestamp;
    const needsRefresh = timeSinceLastReading >= hourInMs;
    
    return {
      lastTimestamp,
      timeSinceLastReading,
      needsRefresh,
      nextRefreshIn: Math.max(0, hourInMs - timeSinceLastReading),
    };
  },
});
