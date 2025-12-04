import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

// Wrapper functions to expose the air component's airQualityHistory functions to the public API

export const storeReading = mutation({
  args: {
    userKey: v.string(),
    lat: v.number(),
    lng: v.number(),
    locationName: v.string(),
    aqi: v.number(),
    riskLevel: v.string(),
    source: v.string(),
    pm25: v.optional(v.number()),
    pm10: v.optional(v.number()),
    no2: v.optional(v.number()),
    o3: v.optional(v.number()),
    co: v.optional(v.number()),
    so2: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation(components.air.airQualityHistory.storeReading, args);
  },
});

export const getLocationHistory = query({
  args: {
    userKey: v.string(),
    locationName: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getLocationHistory, args);
  },
});

export const getUserHistory = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getUserHistory, args);
  },
});

export const getDailyAverages = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getDailyAverages, args);
  },
});

export const compareLocations = query({
  args: {
    userKey: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.compareLocations, args);
  },
});

export const getStatsSummary = query({
  args: {
    userKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getStatsSummary, args);
  },
});

export const getHourlyAverages = query({
  args: {
    userKey: v.string(),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getHourlyAverages, args);
  },
});

export const getRecentReadings = query({
  args: {
    userKey: v.string(),
    minutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getRecentReadings, args);
  },
});

export const getLastReadingTimestamp = query({
  args: {
    userKey: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.air.airQualityHistory.getLastReadingTimestamp, args);
  },
});
