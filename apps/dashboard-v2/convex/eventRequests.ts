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
      .query("eventRequests")
      .withIndex("by_requestedUser", (q) => q.eq("requestedUser", userId))
      .collect();
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("eventRequests").collect();
  },
});

export const get = query({
  args: { id: v.id("eventRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("eventRequests"),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("needs_review"),
    ),
    declinedReason: v.optional(v.string()),
    reviewFeedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.declinedReason && { declinedReason: args.declinedReason }),
      ...(args.reviewFeedback && { reviewFeedback: args.reviewFeedback }),
    });
    return args.id;
  },
});
