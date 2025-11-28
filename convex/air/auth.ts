import { MutationCtx, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const randomSalt = () => Math.random().toString(36).slice(2, 10);

const simpleHash = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const hashPassword = (password: string, salt?: string) => {
  const useSalt = salt ?? randomSalt();
  const hash = simpleHash(password + useSalt);
  return `${useSalt}:${hash}`;
};

const verifyPassword = (password: string, passwordHash: string) => {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  return simpleHash(password + salt) === storedHash;
};

const createSession = async (ctx: MutationCtx, userId: Id<"users">) => {
  const token = `${randomSalt()}${randomSalt()}${randomSalt()}`;
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
  await ctx.db.insert("sessions", { userId, token, expiresAt });
  return { token, expiresAt } as const;
};

export const signup = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("users")
      // @ts-expect-error Convex codegen isn't checked in; index exists at runtime.
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("Account already exists. Try signing in.");

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name || email.split("@")[0],
      passwordHash: hashPassword(args.password),
      createdAt: Date.now(),
    });

    const session = await createSession(ctx, userId);
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      userKey: `user-${userId}`,
      user: { id: userId, email, name: args.name },
    };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      // @ts-expect-error Convex codegen isn't checked in; index exists at runtime.
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("No account found for that email");
    if (!verifyPassword(args.password, user.passwordHash)) {
      throw new Error("Invalid password");
    }

    // Drop expired sessions for this user
    const oldSessions = await ctx.db
      .query("sessions")
      // @ts-expect-error Convex codegen isn't checked in; index exists at runtime.
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    await Promise.all(
      oldSessions
        .filter((s) => s.expiresAt < Date.now())
        .map((s) => ctx.db.delete(s._id)),
    );

    const session = await createSession(ctx, user._id);
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      userKey: `user-${user._id}`,
      user: { id: user._id, email, name: user.name },
    };
  },
});

export const session = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const record = await ctx.db
      .query("sessions")
      // @ts-expect-error Convex codegen isn't checked in; index exists at runtime.
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!record || record.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(record.userId);
    if (!user) return null;
    return {
      user: { id: user._id, email: user.email, name: user.name },
      userKey: `user-${user._id}`,
      expiresAt: record.expiresAt,
    };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      // @ts-expect-error Convex codegen isn't checked in; index exists at runtime.
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});
