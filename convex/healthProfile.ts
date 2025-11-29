import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get health profile for a user
export const getHealthProfile = query({
  args: { userKey: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("healthProfiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    
    return profile;
  },
});

// Check if health profile is complete
export const isHealthProfileComplete = query({
  args: { userKey: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("healthProfiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    
    if (!profile) return { exists: false, isComplete: false };
    
    return { 
      exists: true, 
      isComplete: profile.isComplete,
      profile 
    };
  },
});

// Create or update health profile
export const saveHealthProfile = mutation({
  args: {
    userKey: v.string(),
    name: v.optional(v.string()),
    age: v.optional(v.string()),
    gender: v.optional(v.string()),
    hasRespiratoryCondition: v.boolean(),
    conditions: v.array(v.string()),
    conditionSeverity: v.optional(v.string()),
    activityLevel: v.optional(v.string()),
    outdoorExposure: v.optional(v.string()),
    smokingStatus: v.optional(v.string()),
    livesNearTraffic: v.optional(v.boolean()),
    hasAirPurifier: v.optional(v.boolean()),
    isPregnant: v.optional(v.boolean()),
    hasHeartCondition: v.optional(v.boolean()),
    medications: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if essential fields are filled
    const isComplete = Boolean(
      args.age && 
      args.activityLevel && 
      args.outdoorExposure
    );
    
    const existing = await ctx.db
      .query("healthProfiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    
    if (existing) {
      // Update existing profile
      await ctx.db.patch(existing._id, {
        name: args.name,
        age: args.age,
        gender: args.gender,
        hasRespiratoryCondition: args.hasRespiratoryCondition,
        conditions: args.conditions,
        conditionSeverity: args.conditionSeverity,
        activityLevel: args.activityLevel,
        outdoorExposure: args.outdoorExposure,
        smokingStatus: args.smokingStatus,
        livesNearTraffic: args.livesNearTraffic,
        hasAirPurifier: args.hasAirPurifier,
        isPregnant: args.isPregnant,
        hasHeartCondition: args.hasHeartCondition,
        medications: args.medications,
        updatedAt: now,
        isComplete,
      });
      
      return { success: true, profileId: existing._id, isNew: false };
    }
    
    // Create new profile
    const profileId = await ctx.db.insert("healthProfiles", {
      userKey: args.userKey,
      name: args.name,
      age: args.age,
      gender: args.gender,
      hasRespiratoryCondition: args.hasRespiratoryCondition,
      conditions: args.conditions,
      conditionSeverity: args.conditionSeverity,
      activityLevel: args.activityLevel,
      outdoorExposure: args.outdoorExposure,
      smokingStatus: args.smokingStatus,
      livesNearTraffic: args.livesNearTraffic,
      hasAirPurifier: args.hasAirPurifier,
      isPregnant: args.isPregnant,
      hasHeartCondition: args.hasHeartCondition,
      medications: args.medications,
      createdAt: now,
      updatedAt: now,
      isComplete,
    });
    
    return { success: true, profileId, isNew: true };
  },
});

// Quick update for specific fields
export const updateHealthConditions = mutation({
  args: {
    userKey: v.string(),
    hasRespiratoryCondition: v.boolean(),
    conditions: v.array(v.string()),
    conditionSeverity: v.optional(v.string()),
    medications: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("healthProfiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    
    if (!existing) {
      throw new Error("Health profile not found. Please create a profile first.");
    }
    
    await ctx.db.patch(existing._id, {
      hasRespiratoryCondition: args.hasRespiratoryCondition,
      conditions: args.conditions,
      conditionSeverity: args.conditionSeverity,
      medications: args.medications,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete health profile
export const deleteHealthProfile = mutation({
  args: { userKey: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("healthProfiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    
    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true };
    }
    
    return { success: false, message: "Profile not found" };
  },
});
