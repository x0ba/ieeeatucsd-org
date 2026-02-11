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

export const create = mutation({
  args: {
    logtoId: v.string(),
    name: v.string(),
    location: v.string(),
    startDateTime: v.number(),
    endDateTime: v.number(),
    eventDescription: v.string(),
    flyersNeeded: v.boolean(),
    flyerType: v.array(v.string()),
    otherFlyerType: v.optional(v.string()),
    flyerAdvertisingStartDate: v.optional(v.number()),
    flyerAdditionalRequests: v.optional(v.string()),
    flyersCompleted: v.boolean(),
    photographyNeeded: v.boolean(),
    requiredLogos: v.array(v.string()),
    otherLogos: v.optional(v.array(v.string())),
    advertisingFormat: v.optional(v.string()),
    willOrHaveRoomBooking: v.boolean(),
    expectedAttendance: v.optional(v.number()),
    roomBookingFiles: v.array(v.string()),
    asFundingRequired: v.boolean(),
    foodDrinksBeingServed: v.boolean(),
    invoices: v.array(
      v.object({
        id: v.string(),
        vendor: v.string(),
        items: v.array(
          v.object({
            description: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            total: v.number(),
          }),
        ),
        tax: v.number(),
        tip: v.number(),
        invoiceFile: v.optional(v.string()),
        additionalFiles: v.array(v.string()),
        subtotal: v.number(),
        total: v.number(),
      }),
    ),
    needsGraphics: v.boolean(),
    needsAsFunding: v.boolean(),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { logtoId, isDraft, ...data } = args;
    return await ctx.db.insert("eventRequests", {
      ...data,
      status: isDraft ? "draft" : "submitted",
      requestedUser: userId,
      flyersCompleted: false,
      isDraft: isDraft ?? false,
    });
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("eventRequests"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    startDateTime: v.optional(v.number()),
    endDateTime: v.optional(v.number()),
    eventDescription: v.optional(v.string()),
    flyersNeeded: v.optional(v.boolean()),
    flyerType: v.optional(v.array(v.string())),
    otherFlyerType: v.optional(v.string()),
    flyerAdvertisingStartDate: v.optional(v.number()),
    flyerAdditionalRequests: v.optional(v.string()),
    photographyNeeded: v.optional(v.boolean()),
    requiredLogos: v.optional(v.array(v.string())),
    otherLogos: v.optional(v.array(v.string())),
    advertisingFormat: v.optional(v.string()),
    willOrHaveRoomBooking: v.optional(v.boolean()),
    expectedAttendance: v.optional(v.number()),
    roomBookingFiles: v.optional(v.array(v.string())),
    asFundingRequired: v.optional(v.boolean()),
    foodDrinksBeingServed: v.optional(v.boolean()),
    invoices: v.optional(
      v.array(
        v.object({
          id: v.string(),
          vendor: v.string(),
          items: v.array(
            v.object({
              description: v.string(),
              quantity: v.number(),
              unitPrice: v.number(),
              total: v.number(),
            }),
          ),
          tax: v.number(),
          tip: v.number(),
          invoiceFile: v.optional(v.string()),
          additionalFiles: v.array(v.string()),
          subtotal: v.number(),
          total: v.number(),
        }),
      ),
    ),
    needsGraphics: v.optional(v.boolean()),
    needsAsFunding: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const { logtoId, id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(id, cleanUpdates);
    return id;
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
