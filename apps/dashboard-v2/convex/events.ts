import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  requireCurrentUser,
  requireOfficerAccess,
  hasAdminAccess,
} from "./permissions";

function getLegacyAttendeeIds(event: Record<string, unknown>): string[] {
  const legacy = (event as { attendees?: unknown }).attendees;
  if (!Array.isArray(legacy)) return [];
  return legacy.filter((id): id is string => typeof id === "string");
}

// ── Queries ──────────────────────────────────────────────────────────────────

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

export const listMine = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    return await ctx.db
      .query("events")
      .withIndex("by_requestedUser", (q) => q.eq("requestedUser", userId))
      .collect();
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    const events = await ctx.db.query("events").collect();

    // Collect unique requestedUser IDs for submitter name lookup
    const uniqueUserIds = [
      ...new Set(
        events
          .map((e) => e.requestedUser)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
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
          submitterName: event.requestedUser
            ? userNameMap.get(event.requestedUser) || event.requestedUser
            : undefined,
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
  args: { logtoId: v.optional(v.string()), id: v.id("events") },
  handler: async (ctx, args) => {
    if (args.logtoId) {
      await requireCurrentUser(ctx, args.logtoId);
    }
    return await ctx.db.get(args.id);
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

// ── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    logtoId: v.string(),
    eventName: v.string(),
    eventDescription: v.string(),
    eventCode: v.optional(v.string()),
    location: v.string(),
    pointsToReward: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.number(),
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
    // Request workflow fields
    department: v.optional(
      v.union(
        v.literal("events"),
        v.literal("projects"),
        v.literal("internal"),
        v.literal("other"),
      ),
    ),
    flyersNeeded: v.optional(v.boolean()),
    flyerType: v.optional(v.array(v.string())),
    otherFlyerType: v.optional(v.string()),
    flyerAdvertisingStartDate: v.optional(v.number()),
    flyerAdditionalRequests: v.optional(v.string()),
    flyersCompleted: v.optional(v.boolean()),
    photographyNeeded: v.optional(v.boolean()),
    requiredLogos: v.optional(v.array(v.string())),
    otherLogos: v.optional(v.array(v.string())),
    advertisingFormat: v.optional(v.string()),
    additionalSpecifications: v.optional(v.string()),
    graphicsUploadNote: v.optional(v.string()),
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
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { logtoId, isDraft, ...data } = args;
    return await ctx.db.insert("events", {
      ...data,
      status: isDraft ? "draft" : (data.published ? "approved" : "submitted"),
      requestedUser: userId,
      flyersCompleted: data.flyersCompleted ?? false,
      isDraft: isDraft ?? false,
      createdAt: Date.now(),
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
    // Request workflow fields
    department: v.optional(
      v.union(
        v.literal("events"),
        v.literal("projects"),
        v.literal("internal"),
        v.literal("other"),
      ),
    ),
    flyersNeeded: v.optional(v.boolean()),
    flyerType: v.optional(v.array(v.string())),
    otherFlyerType: v.optional(v.string()),
    flyerAdvertisingStartDate: v.optional(v.number()),
    flyerAdditionalRequests: v.optional(v.string()),
    flyersCompleted: v.optional(v.boolean()),
    photographyNeeded: v.optional(v.boolean()),
    requiredLogos: v.optional(v.array(v.string())),
    otherLogos: v.optional(v.array(v.string())),
    advertisingFormat: v.optional(v.string()),
    additionalSpecifications: v.optional(v.string()),
    graphicsUploadNote: v.optional(v.string()),
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

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Admins and Executive Officers can edit any event
    if (!hasAdminAccess(user.role)) {
      // Non-admin users can only edit their own events
      if (event.requestedUser && event.requestedUser !== userId) {
        throw new Error("You can only edit your own events");
      }
      // Non-admin users can only edit events in editable statuses
      const editableStatuses = ["draft", "submitted", "pending", "needs_review"];
      if (event.status && !editableStatuses.includes(event.status)) {
        throw new Error("Cannot edit an event that has already been approved or declined");
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

export const remove = mutation({
  args: { logtoId: v.string(), id: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";

    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    // Admins and Executive Officers can delete any event
    if (hasAdminAccess(user.role)) {
      await ctx.db.delete(args.id);
      return args.id;
    }

    // Non-admin users can only delete their own events if not approved
    if (event.requestedUser && event.requestedUser !== userId) {
      throw new Error("You can only delete your own events");
    }
    const deletableStatuses = ["draft", "submitted", "pending", "needs_review"];
    if (event.status && !deletableStatuses.includes(event.status)) {
      throw new Error("Cannot delete an event that has already been approved or declined");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("events"),
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
    const user = await requireCurrentUser(ctx, args.logtoId);
    const event = await ctx.db.get(args.id);
    if (!event) throw new Error("Event not found");

    const userId = user.logtoId ?? user.authUserId ?? "";
    const canSubmitOwnDraft =
      args.status === "submitted" &&
      event.status === "draft" &&
      event.requestedUser === userId;

    if (!hasAdminAccess(user.role) && !canSubmitOwnDraft) {
      throw new Error("Only admins can change this status");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      isDraft: args.status === "submitted" ? false : event.isDraft,
      ...(args.declinedReason && { declinedReason: args.declinedReason }),
      ...(args.reviewFeedback && { reviewFeedback: args.reviewFeedback }),
    });
    return args.id;
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
      throw new ConvexError("Invalid event code. Please check the code and try again.");
    }

    if (!event.published) {
      throw new ConvexError("This event is not currently published for check-in.");
    }

    // Check if already checked in
    const existing = await ctx.db
      .query("attendees")
      .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
      .filter((q) => q.eq(q.field("userId"), user.logtoId ?? user.authUserId ?? ""))
      .first();

    if (existing) {
      throw new ConvexError("You have already checked in to this event.");
    }

    const userId = user.logtoId ?? user.authUserId ?? "";

    await ctx.db.insert("attendees", {
      eventId: event._id,
      userId,
      timeCheckedIn: Date.now(),
      food: args.food || "none",
      pointsEarned: event.pointsToReward ?? 0,
    });

    // Update user points and events attended
    const pts = event.pointsToReward ?? 0;
    await ctx.db.patch(user._id, {
      points: (user.points || 0) + pts,
      eventsAttended: (user.eventsAttended || 0) + 1,
    });

    return { points: pts };
  },
});
