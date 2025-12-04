import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const calcRisk = (pm25?: number, no2?: number, co?: number) => {
  const pm = pm25 ?? 30;
  const no = no2 ?? 20;
  const coVal = co ?? 0.5;

  const pmPenalty = Math.min(pm / 2, 60);
  const noPenalty = Math.min(no / 2.5, 30);
  const coPenalty = Math.min(coVal * 8, 10);
  const score = Math.max(0, Math.round(100 - pmPenalty - noPenalty - coPenalty));

  let riskLevel: "low" | "moderate" | "high";
  if (score >= 75) riskLevel = "low";
  else if (score >= 45) riskLevel = "moderate";
  else riskLevel = "high";

  const tips: string[] = [];
  if (pm > 55 || no > 80) {
    tips.push("Delay outdoor workouts or move them indoors.");
  }
  if (pm > 35) {
    tips.push("Use an N95/FFP2 mask for long outdoor stays.");
  }
  if (no > 40) {
    tips.push("Prefer metro or cycling lanes away from traffic bottlenecks.");
  }
  tips.push(
    "Pick routes with parks or waterfronts—natural buffers can cut exposure by ~20%.",
  );
  tips.push("Keep windows closed during rush hour and use recirculation in cars.");

  return { score, riskLevel, tips };
};

export const ensureProfile = mutation({
  args: {
    userKey: v.string(),
    nickname: v.optional(v.string()),
    homeCity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const derivedUserId = args.userKey.startsWith("user-")
      ? (args.userKey.slice(5) as Id<"users">)
      : undefined;
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();

    if (existing) {
      const patch: Partial<{
        nickname?: string;
        homeCity?: string;
        userId?: Id<"users">;
      }> = {};
      if (args.nickname) patch.nickname = args.nickname;
      if (args.homeCity) patch.homeCity = args.homeCity;
      if (!existing.userId && derivedUserId) patch.userId = derivedUserId;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing;
    }

    const profile = await ctx.db.insert("profiles", {
      userKey: args.userKey,
      userId: derivedUserId,
      nickname: args.nickname,
      homeCity: args.homeCity,
      points: 0,
      streak: 0,
      bestStreak: 0,
      lastActiveDate: "",
    });

    return await ctx.db.get(profile);
  },
});

export const logExposure = mutation({
  args: {
    userKey: v.string(),
    lat: v.number(),
    lon: v.number(),
    locationName: v.string(),
    pm25: v.optional(v.number()),
    no2: v.optional(v.number()),
    co: v.optional(v.number()),
    mode: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile =
      (await ctx.db
        .query("profiles")
        .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
        .unique()) ??
      (await ctx.db.get(
        await ctx.db.insert("profiles", {
          userKey: args.userKey,
          nickname: undefined,
          homeCity: undefined,
          points: 0,
          streak: 0,
          bestStreak: 0,
          lastActiveDate: "",
        }),
      ));

    const timestamp = args.timestamp ?? Date.now();
    const dayKey = new Date(timestamp).toISOString().slice(0, 10);
    const { score, riskLevel, tips } = calcRisk(args.pm25, args.no2, args.co);

    // Streak + points logic.
    let streak = profile?.streak ?? 0;
    let bestStreak = profile?.bestStreak ?? 0;
    let points = profile?.points ?? 0;

    if (profile?.lastActiveDate === dayKey) {
      // same day; keep streak
    } else if (profile?.lastActiveDate) {
      const diff =
        (Date.parse(dayKey) - Date.parse(profile.lastActiveDate)) / 86400000;
      if (diff === 1) streak += 1;
      else streak = 1;
    } else {
      streak = 1;
    }

    if (score >= 80) points += 20;
    else if (score >= 60) points += 12;
    else points += 6;
    bestStreak = Math.max(bestStreak, streak);

    const exposureId = await ctx.db.insert("exposures", {
      profileId: profile!._id,
      lat: args.lat,
      lon: args.lon,
      locationName: args.locationName,
      timestamp,
      pm25: args.pm25,
      no2: args.no2,
      co: args.co,
      mode: args.mode,
      riskLevel,
      tips,
      score,
    });

    await ctx.db.patch(profile!._id, {
      points,
      streak,
      bestStreak,
      lastActiveDate: dayKey,
    });

    return {
      exposureId,
      points,
      streak,
      bestStreak,
      score,
      riskLevel,
      tips,
    };
  },
});

export const getPassport = query({
  args: { userKey: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();

    const limit = args.limit ?? 6;
    const exposures = profile
      ? await ctx.db
          .query("exposures")
          .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
          .order("desc")
          .take(limit)
      : [];

    const weekly = profile
      ? await ctx.db
          .query("exposures")
          .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
          .order("desc")
          .take(50)
      : [];

    const averageScore =
      weekly.length === 0
        ? null
        : Math.round(
            weekly.reduce((acc, e) => acc + (e.score ?? 0), 0) / weekly.length,
          );

    const latest = exposures.at(0) ?? null;

    return { profile, exposures, averageScore, latest };
  },
});

export const insights = query({
  args: { userKey: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userKey", (q) => q.eq("userKey", args.userKey))
      .unique();
    if (!profile) return null;

    const logs = await ctx.db
      .query("exposures")
      .withIndex("by_profile", (q) => q.eq("profileId", profile._id))
      .order("desc")
      .take(30);

    const byDay: Record<string, { scores: number[]; count: number }> = {};
    for (const log of logs) {
      const day = new Date(log.timestamp).toISOString().slice(0, 10);
      byDay[day] ??= { scores: [], count: 0 };
      byDay[day].scores.push(log.score);
      byDay[day].count += 1;
    }

    const trend = Object.entries(byDay)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([day, info]) => ({
        day,
        average: Math.round(
          info.scores.reduce((acc, s) => acc + s, 0) / info.scores.length,
        ),
        samples: info.count,
      }));

    const cleanStreak = trend
      .reverse()
      .reduce(
        (acc, day) =>
          day.average >= 70 && acc.continues
            ? { length: acc.length + 1, continues: true }
            : { length: acc.length, continues: false },
        { length: 0, continues: true },
      ).length;

    return {
      profile,
      trend: trend.slice(-7),
      cleanStreak,
      sampleCount: logs.length,
    };
  },
});
