import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./permissions";

export const list = query({
  args: { logtoId: v.string(), authToken: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId, args.authToken);
    return await ctx.db.query("officerInvitations").collect();
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("officerInvitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("officerInvitations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    authToken: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.string(),
    message: v.optional(v.string()),
    acceptanceDeadline: v.optional(v.string()),
    leaderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId, args.authToken);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    const now = Date.now();
    const { logtoId, authToken, ...data } = args;
    return await ctx.db.insert("officerInvitations", {
      ...data,
      status: "pending",
      invitedBy: adminId,
      invitedAt: now,
      lastSentAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    authToken: v.string(),
    id: v.id("officerInvitations"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId, args.authToken);
    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "accepted") updates.acceptedAt = now;
    if (args.status === "declined") updates.declinedAt = now;
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const resend = mutation({
  args: { logtoId: v.string(), authToken: v.string(), id: v.id("officerInvitations") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId, args.authToken);
    await ctx.db.patch(args.id, {
      resentAt: Date.now(),
      lastSentAt: Date.now(),
    });
    return args.id;
  },
});
