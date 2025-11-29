import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Component-scoped schema for air exposure tracking.
export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(), // salt:hash (sha256)
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  profiles: defineTable({
    userKey: v.string(),
    userId: v.optional(v.id("users")),
    nickname: v.optional(v.string()),
    homeCity: v.optional(v.string()),
    points: v.number(),
    streak: v.number(),
    bestStreak: v.number(),
    lastActiveDate: v.string(), // ISO date (yyyy-mm-dd)
  }).index("by_userKey", ["userKey"]),

  // Health profile for AI-powered health recommendations
  healthProfiles: defineTable({
    userKey: v.string(),
    // Basic profile
    name: v.optional(v.string()),
    age: v.optional(v.string()), // "child", "teen", "adult", "senior"
    gender: v.optional(v.string()),
    // Respiratory health passport
    hasRespiratoryCondition: v.boolean(),
    conditions: v.array(v.string()), // ["asthma", "copd", "allergies", etc.]
    conditionSeverity: v.optional(v.string()), // "mild", "moderate", "severe"
    // Lifestyle factors
    activityLevel: v.optional(v.string()), // "sedentary", "light", "moderate", "active"
    outdoorExposure: v.optional(v.string()), // "low", "medium", "high" - daily outdoor time
    smokingStatus: v.optional(v.string()), // "never", "former", "current"
    // Living environment
    livesNearTraffic: v.optional(v.boolean()),
    hasAirPurifier: v.optional(v.boolean()),
    // Additional health factors
    isPregnant: v.optional(v.boolean()),
    hasHeartCondition: v.optional(v.boolean()),
    medications: v.array(v.string()), // respiratory medications
    // Meta
    createdAt: v.number(),
    updatedAt: v.number(),
    isComplete: v.boolean(), // true if all essential fields are filled
  }).index("by_userKey", ["userKey"]),

  exposures: defineTable({
    profileId: v.id("profiles"),
    lat: v.number(),
    lon: v.number(),
    locationName: v.string(),
    timestamp: v.number(),
    pm25: v.optional(v.number()),
    no2: v.optional(v.number()),
    co: v.optional(v.number()),
    mode: v.optional(v.string()),
    riskLevel: v.string(),
    tips: v.array(v.string()),
    score: v.number(),
  }).index("by_profile", ["profileId"]),

  // Air quality history for graphs and comparison
  airQualityHistory: defineTable({
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
    timestamp: v.number(),
    date: v.string(), // ISO date for grouping (yyyy-mm-dd)
  })
    .index("by_userKey", ["userKey"])
    .index("by_userKey_location", ["userKey", "locationName"])
    .index("by_date", ["date"])
    .index("by_timestamp", ["timestamp"]),
});
