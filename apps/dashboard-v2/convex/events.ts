import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireOfficerAccess,
  requireAdminAccess,
} from "./permissions";

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("events").collect();
  },
});

export const getByCode = query({
  args: { eventCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .unique();
  },
});

export const get = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    eventName: v.string(),
    eventDescription: v.string(),
    eventCode: v.string(),
    location: v.string(),
    pointsToReward: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    eventType: v.union(
      v.literal("social"),
      v.literal("technical"),
      v.literal("outreach"),
      v.literal("professional"),
      v.literal("projects"),
      v.literal("other"),
    ),
    hasFood: v.boolean(),
    published: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    const { logtoId, ...eventData } = args;
    return await ctx.db.insert("events", {
      ...eventData,
      files: [],
    });
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("events"),
    eventName: v.optional(v.string()),
    eventDescription: v.optional(v.string()),
    eventCode: v.optional(v.string()),
    location: v.optional(v.string()),
    pointsToReward: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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
    hasFood: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    const { id, logtoId, ...updates } = args;
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

export const remove = mutation({
  args: { logtoId: v.string(), id: v.id("events") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    await ctx.db.delete(args.id);
  },
});

export const checkIn = mutation({
  args: {
    logtoId: v.string(),
    eventCode: v.string(),
    food: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);

    const event = await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .unique();

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.published) {
      throw new Error("Event is not published");
    }

    // Check if already checked in
    const existing = await ctx.db
      .query("attendees")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .filter((q) => q.eq(q.field("userId"), user.logtoId ?? user.authUserId ?? ""))
      .first();

    if (existing) {
      throw new Error("Already checked in to this event");
    }

    const userId = user.logtoId ?? user.authUserId ?? "";

    await ctx.db.insert("attendees", {
      eventId: event._id,
      userId,
      timeCheckedIn: Date.now(),
      food: args.food || "none",
      pointsEarned: event.pointsToReward,
    });

    // Update user points and events attended
    await ctx.db.patch(user._id, {
      points: (user.points || 0) + event.pointsToReward,
      eventsAttended: (user.eventsAttended || 0) + 1,
    });

    return { points: event.pointsToReward };
  },
});
