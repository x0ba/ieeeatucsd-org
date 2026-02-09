import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireOfficerAccess,
  requireAdminAccess,
} from "./permissions";

export const listMine = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    return await ctx.db
      .query("fundRequests")
      .withIndex("by_requestedBy", (q) => q.eq("requestedBy", userId))
      .collect();
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("fundRequests").collect();
  },
});

export const get = query({
  args: { id: v.id("fundRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    title: v.string(),
    description: v.string(),
    amount: v.number(),
    department: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { logtoId, ...data } = args;
    return await ctx.db.insert("fundRequests", {
      ...data,
      status: "submitted",
      requestedBy: userId,
    });
  },
});

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("fundRequests"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("completed"),
    ),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
      ...(args.reviewNotes && { reviewNotes: args.reviewNotes }),
    });
    return args.id;
  },
});
