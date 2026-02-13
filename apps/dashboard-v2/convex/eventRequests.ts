import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireOfficerAccess,
  requireAdminAccess,
  hasAdminAccess,
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
    const requests = await ctx.db.query("eventRequests").collect();
    const uniqueUserIds = [...new Set(requests.map((request) => request.requestedUser).filter(Boolean))];
    const userNameMap = new Map<string, string>();

    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_logtoId", (q) => q.eq("logtoId", userId))
          .first();
        if (user) {
          userNameMap.set(userId, user.name || user.email || userId);
        }
      }),
    );

    return requests.map((request) => ({
      ...request,
      submitterName: userNameMap.get(request.requestedUser) || request.requestedUser,
    }));
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
    eventType: v.optional(
      v.union(
        v.literal("social"),
        v.literal("technical"),
        v.literal("outreach"),
        v.literal("professional"),
        v.literal("projects"),
        v.literal("other"),
      ),
    ),
    department: v.optional(
      v.union(
        v.literal("events"),
        v.literal("projects"),
        v.literal("internal"),
        v.literal("other"),
      ),
    ),
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
    additionalSpecifications: v.optional(v.string()),
    graphicsUploadNote: v.optional(v.string()),
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
      flyersCompleted: args.flyersCompleted ?? false,
      isDraft: isDraft ?? false,
    });
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("eventRequests"),
    name: v.optional(v.string()),
    eventType: v.optional(
      v.union(
        v.literal("social"),
        v.literal("technical"),
        v.literal("outreach"),
        v.literal("professional"),
        v.literal("projects"),
        v.literal("other"),
      ),
    ),
    department: v.optional(
      v.union(
        v.literal("events"),
        v.literal("projects"),
        v.literal("internal"),
        v.literal("other"),
      ),
    ),
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
    additionalSpecifications: v.optional(v.string()),
    graphicsUploadNote: v.optional(v.string()),
    flyersCompleted: v.optional(v.boolean()),
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
    const userId = user.logtoId ?? user.authUserId ?? "";

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Event request not found");

    // Admins and Executive Officers can edit any request
    if (!hasAdminAccess(user.role)) {
      // Non-admin users can only edit their own requests
      if (request.requestedUser !== userId) {
        throw new Error("You can only edit your own event requests");
      }
      // Non-admin users can only edit requests in editable statuses
      const editableStatuses = ["draft", "submitted", "pending", "needs_review"];
      if (!editableStatuses.includes(request.status)) {
        throw new Error("Cannot edit an event request that has already been approved or declined");
      }
    }

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId as any);
  },
});

export const remove = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("eventRequests"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Event request not found");

    // Admins and Executive Officers can delete any request
    if (hasAdminAccess(user.role)) {
      await ctx.db.delete(args.id);
      return args.id;
    }

    // Non-admin users can only delete their own requests if not approved
    if (request.requestedUser !== userId) {
      throw new Error("You can only delete your own event requests");
    }
    const deletableStatuses = ["draft", "submitted", "pending", "needs_review"];
    if (!deletableStatuses.includes(request.status)) {
      throw new Error("Cannot delete an event request that has already been approved or declined");
    }

    await ctx.db.delete(args.id);
    return args.id;
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
    await requireAdminAccess(ctx, args.logtoId);
    await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.declinedReason && { declinedReason: args.declinedReason }),
      ...(args.reviewFeedback && { reviewFeedback: args.reviewFeedback }),
    });
    return args.id;
  },
});
