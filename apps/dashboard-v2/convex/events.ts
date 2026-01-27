import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// Get all published events
export const getPublishedEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("desc")
      .collect();

    return events.map((event) => ({
      id: event._id,
      eventName: event.eventName,
      eventDescription: event.eventDescription,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      pointsToReward: event.pointsToReward,
      hasFood: event.hasFood,
      eventCode: event.eventCode,
      files: event.files || [],
      eventType: event.eventType,
    }));
  },
});

// Get a single event by ID
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) {
      return null;
    }
    return event;
  },
});

// Get events a user has attended
export const getUserAttendedEvents = query({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    const attendeeRecords = await ctx.db
      .query("eventAttendees")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .order("desc")
      .collect();

    // Get unique event IDs
    const uniqueEventIds: Id<"events">[] = Array.from(
      new Set(attendeeRecords.map((record) => record.eventId)),
    );

    // Fetch event documents
    const events = await Promise.all(uniqueEventIds.map((eventId) => ctx.db.get(eventId)));

    // Filter out null events and only include published events
    const publishedEvents = events.filter(
      (event): event is Doc<"events"> => Boolean(event && event.published),
    );

    return publishedEvents.map((event) => ({
      id: event._id,
      eventName: event.eventName,
      eventDescription: event.eventDescription,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      pointsToReward: event.pointsToReward,
      hasFood: event.hasFood,
      eventCode: event.eventCode,
      files: event.files || [],
      eventType: event.eventType,
    }));
  },
});

// Check in a user to an event
export const checkInUser = mutation({
  args: {
    eventId: v.id("events"),
    authUserId: v.string(),
  },
  handler: async (ctx, { eventId, authUserId }) => {
    // Check if the event exists and is published
    const event = await ctx.db.get(eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.published) {
      throw new Error("Cannot check in to unpublished event");
    }

    // Check if user is already checked in
    const existingCheckIn = await ctx.db
      .query("eventAttendees")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .filter((q) => q.eq(q.field("eventId"), eventId))
      .first();

    if (existingCheckIn) {
      throw new Error("User already checked in to this event");
    }

    // Create check-in record
    const checkInId = await ctx.db.insert("eventAttendees", {
      eventId,
      authUserId,
      checkedInAt: Date.now(),
      pointsAwarded: event.pointsToReward,
    });

    // Update user's points and events attended
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        points: (user.points || 0) + event.pointsToReward,
        eventsAttended: (user.eventsAttended || 0) + 1,
        lastUpdated: Date.now(),
      });
    }

    return { checkInId, pointsAwarded: event.pointsToReward };
  },
});

// Create a new event request (draft or submitted)
export const createEventRequest = mutation({
  args: {
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
    photographyNeeded: v.boolean(),
    requiredLogos: v.array(v.string()),
    otherLogos: v.optional(v.array(v.string())),
    roomBookingFiles: v.array(v.string()),
    asFundingRequired: v.boolean(),
    foodDrinksBeingServed: v.boolean(),
    needsGraphics: v.boolean(),
    isDraft: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const requestId = await ctx.db.insert("eventRequests", {
      name: args.name,
      location: args.location,
      startDateTime: args.startDateTime,
      endDateTime: args.endDateTime,
      eventDescription: args.eventDescription,
      flyersNeeded: args.flyersNeeded,
      flyerType: args.flyerType,
      otherFlyerType: args.otherFlyerType,
      flyerAdvertisingStartDate: args.flyerAdvertisingStartDate,
      flyerAdditionalRequests: args.flyerAdditionalRequests,
      photographyNeeded: args.photographyNeeded,
      requiredLogos: args.requiredLogos,
      otherLogos: args.otherLogos,
      roomBookingFiles: args.roomBookingFiles,
      asFundingRequired: args.asFundingRequired,
      foodDrinksBeingServed: args.foodDrinksBeingServed,
      needsGraphics: args.needsGraphics,
      requestedUser: identity.subject,
      status: args.isDraft ? "draft" : "submitted",
      flyersCompleted: false,
      willOrHaveRoomBooking: false,
      needsAsFunding: false,
    });

    return await ctx.db.get(requestId);
  },
});

// Update an event request
export const updateEventRequest = mutation({
  args: {
    requestId: v.id("eventRequests"),
    updates: v.object({
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
      roomBookingFiles: v.optional(v.array(v.string())),
      asFundingRequired: v.optional(v.boolean()),
      foodDrinksBeingServed: v.optional(v.boolean()),
      needsGraphics: v.optional(v.boolean()),
      needsAsFunding: v.optional(v.boolean()),
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("submitted"),
          v.literal("pending"),
          v.literal("completed"),
          v.literal("approved"),
          v.literal("declined"),
          v.literal("needs_review"),
        ),
      ),
      declinedReason: v.optional(v.string()),
      reviewFeedback: v.optional(v.string()),
      graphicsCompleted: v.optional(v.boolean()),
      graphicsFiles: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { requestId, updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Event request not found");
    }

    // Check if user is the requester or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      request.requestedUser !== identity.subject &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to update this event request");
    }

    await ctx.db.patch(requestId, updates);
    return await ctx.db.get(requestId);
  },
});

// Delete an event request
export const deleteEventRequest = mutation({
  args: { requestId: v.id("eventRequests") },
  handler: async (ctx, { requestId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(requestId);
    if (!request) {
      throw new Error("Event request not found");
    }

    // Check if user is the requester or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      request.requestedUser !== identity.subject &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to delete this event request");
    }

    await ctx.db.delete(requestId);
    return { success: true };
  },
});

// Get all event requests for management
export const getEventRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("eventRequests").order("desc").collect();

    return requests;
  },
});

// Get event requests by user
export const getEventRequestsByUser = query({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    const requests = await ctx.db
      .query("eventRequests")
      .withIndex("by_requestedUser", (q) => q.eq("requestedUser", authUserId))
      .order("desc")
      .collect();

    return requests;
  },
});

// Get event requests by status
export const getEventRequestsByStatus = query({
  args: { status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("pending"), v.literal("completed"), v.literal("approved"), v.literal("declined"), v.literal("needs_review")) },
  handler: async (ctx, { status }) => {
    const requests = await ctx.db
      .query("eventRequests")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();

    return requests;
  },
});

// Get users for management (to display names)
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Update user stats after check-in
export const updateUserStats = mutation({
  args: {
    authUserId: v.string(),
    pointsEarned: v.number(),
  },
  handler: async (ctx, { authUserId, pointsEarned }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      points: (user.points || 0) + pointsEarned,
      eventsAttended: (user.eventsAttended || 0) + 1,
      lastUpdated: Date.now(),
    });

    return { success: true };
  },
});
