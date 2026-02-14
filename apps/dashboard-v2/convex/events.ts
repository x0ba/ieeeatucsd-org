import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireOfficerAccess,
  requireAdminAccess,
} from "./permissions";

function getLegacyAttendeeIds(event: Record<string, unknown>): string[] {
  const legacy = (event as { attendees?: unknown }).attendees;
  if (!Array.isArray(legacy)) return [];
  return legacy.filter((id): id is string => typeof id === "string");
}

export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();

    return await Promise.all(
      events.map(async (event) => {
        const attendees = await ctx.db
          .query("attendees")
          .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
          .collect();
        const legacyAttendeeIds = getLegacyAttendeeIds(event as Record<string, unknown>);
        const attendeeCount =
          attendees.length > 0
            ? new Set(attendees.map((a) => a.userId)).size
            : new Set(legacyAttendeeIds).size;

        return {
          ...event,
          attendeeCount,
        };
      }),
    );
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    const events = await ctx.db.query("events").collect();

    return await Promise.all(
      events.map(async (event) => {
        const attendeeDocs = await ctx.db
          .query("attendees")
          .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
          .collect();
        const legacyAttendeeIds = getLegacyAttendeeIds(event as Record<string, unknown>);

        const attendeeByUserId = new Map<
          string,
          {
            userId: string;
            name: string;
            email: string;
            timeCheckedIn: number;
            food: string;
            pointsEarned: number;
          }
        >();

        for (const attendee of attendeeDocs) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_logtoId", (q) => q.eq("logtoId", attendee.userId))
            .first();

          attendeeByUserId.set(attendee.userId, {
            userId: attendee.userId,
            name: user?.name || attendee.userId,
            email: user?.email || "",
            timeCheckedIn: attendee.timeCheckedIn,
            food: attendee.food,
            pointsEarned: attendee.pointsEarned,
          });
        }

        if (attendeeByUserId.size === 0 && legacyAttendeeIds.length > 0) {
          await Promise.all(
            [...new Set(legacyAttendeeIds)].map(async (userId) => {
              const user = await ctx.db
                .query("users")
                .withIndex("by_logtoId", (q) => q.eq("logtoId", userId))
                .first();

              attendeeByUserId.set(userId, {
                userId,
                name: user?.name || userId,
                email: user?.email || "",
                timeCheckedIn: 0,
                food: "unknown",
                pointsEarned: 0,
              });
            }),
          );
        }

        const enrichedAttendees = [...attendeeByUserId.values()];

        return {
          ...event,
          attendeeCount: enrichedAttendees.length,
          attendees: enrichedAttendees.sort(
            (a, b) => b.timeCheckedIn - a.timeCheckedIn
          ),
        };
      })
    );
  },
});

export const getByCode = query({
  args: { logtoId: v.string(), eventCode: v.string() },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx, args.logtoId);
    return await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .first();
  },
});

export const get = query({
  args: { logtoId: v.string(), id: v.id("events") },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx, args.logtoId);
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

export const getAttendedEventIds = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";

    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return attendees.map((a) => a.eventId);
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

    // Look up event by code using index (try exact match first, then uppercase)
    const trimmedCode = args.eventCode.trim();
    let event = await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", trimmedCode))
      .first();

    if (!event) {
      // Fallback: try uppercase version
      const upperCode = trimmedCode.toUpperCase();
      event = await ctx.db
        .query("events")
        .withIndex("by_eventCode", (q) => q.eq("eventCode", upperCode))
        .first();
    }

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
