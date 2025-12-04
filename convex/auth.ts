import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";

// Diagnostic query - tests if basic functions work (no component delegation)
export const ping = query({
  args: {},
  handler: async () => {
    console.log("[auth.ping] Basic function called successfully");
    return { status: "ok", timestamp: Date.now() };
  },
});

export const signup = mutation({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, args) =>
    ctx.runMutation(components.air.auth.signup, args),
});

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) =>
    ctx.runMutation(components.air.auth.login, args),
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) =>
    ctx.runMutation(components.air.auth.logout, args),
});

export const session = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    console.log("[auth.session] Called with token:", args.token ? "***hidden***" : "none");
    try {
      const result = await ctx.runQuery(components.air.auth.session, args);
      console.log("[auth.session] Component returned:", result ? "user found" : "null");
      return result;
    } catch (error) {
      console.error("[auth.session] Component delegation error:", error);
      throw error;
    }
  },
});
