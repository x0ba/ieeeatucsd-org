import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Get all event requests
export const getAllEventRequests = query({
  handler: async (ctx) => {
    const eventRequests = await ctx.db
      .query("eventRequests")
      .withIndex("by_status")
      .collect();

    return eventRequests.map((req) => ({
      ...req,
      id: req._id,
    }));
  },
});

// Get event request by ID
export const getEventRequestById = query({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const eventRequest = await ctx.db.get(args.requestId as any);
    if (!eventRequest) return null;

    return {
      ...eventRequest,
      id: eventRequest._id,
    };
  },
});

// Update event request
export const updateEventRequest = mutation({
  args: {
    requestId: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("needs_review"),
    ),
    roomBookingFiles: v.optional(v.array(v.string())),
    graphicsFiles: v.optional(v.array(v.string())),
    graphicsCompleted: v.optional(v.boolean()),
    flyersCompleted: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
    department: v.optional(v.string()),
    declinedReason: v.optional(v.string()),
    reviewFeedback: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const eventRequest = await ctx.db.get(args.requestId as any);
    if (!eventRequest) {
      throw new Error("Event request not found");
    }

    const updateData: any = {
      status: args.status,
      lastUpdated: Date.now(),
      lastUpdatedBy: args.updatedBy,
    };

    if (args.roomBookingFiles !== undefined)
      updateData.roomBookingFiles = args.roomBookingFiles;
    if (args.graphicsFiles !== undefined)
      updateData.graphicsFiles = args.graphicsFiles;
    if (args.graphicsCompleted !== undefined)
      updateData.graphicsCompleted = args.graphicsCompleted;
    if (args.flyersCompleted !== undefined)
      updateData.flyersCompleted = args.flyersCompleted;
    if (args.published !== undefined) updateData.published = args.published;
    if (args.department !== undefined) updateData.department = args.department;
    if (args.declinedReason !== undefined)
      updateData.declinedReason = args.declinedReason;
    if (args.reviewFeedback !== undefined)
      updateData.reviewFeedback = args.reviewFeedback;

    await ctx.db.patch(eventRequest._id, updateData);

    return await ctx.db.get(eventRequest._id);
  },
});

// Get event attendees
export const getEventAttendees = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendees = await ctx.db
      .query("eventAttendees")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();

    return attendees;
  },
});

// Create event (from approved event request)
export const createEvent = mutation({
  args: {
    eventName: v.string(),
    eventDescription: v.string(),
    eventCode: v.string(),
    location: v.string(),
    files: v.array(v.string()),
    pointsToReward: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    published: v.boolean(),
    eventType: v.union(
      v.literal("social"),
      v.literal("technical"),
      v.literal("outreach"),
      v.literal("professional"),
      v.literal("projects"),
      v.literal("other"),
    ),
    hasFood: v.boolean(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      eventName: args.eventName,
      eventDescription: args.eventDescription,
      eventCode: args.eventCode,
      location: args.location,
      files: args.files,
      pointsToReward: args.pointsToReward,
      startDate: args.startDate,
      endDate: args.endDate,
      published: args.published,
      eventType: args.eventType,
      hasFood: args.hasFood,
      createdFrom: args.createdBy,
    });

    return { eventId };
  },
});

// Check in attendee
export const checkInAttendee = mutation({
  args: {
    eventId: v.id("events"),
    authUserId: v.string(),
    checkedInBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already checked in
    const existing = await ctx.db
      .query("eventAttendees")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect()
      .then((attendees) =>
        attendees.find((a) => a.authUserId === args.authUserId),
      );

    if (existing) {
      throw new Error("User already checked in to this event");
    }

    await ctx.db.insert("eventAttendees", {
      eventId: args.eventId,
      authUserId: args.authUserId,
      checkedInAt: Date.now(),
    });

    return { success: true };
  },
});

// Get events (for management)
export const getAllEvents = query({
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_published")
      .collect();

    return events.map((event) => ({
      ...event,
      id: event._id,
    }));
  },
});

// Get published events (for public view)
export const getPublishedEvents = query({
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("published", true))
      .order("asc")
      .collect();

    return events.map((event) => ({
      ...event,
      id: event._id,
    }));
  },
});

// Delete event request
export const deleteEventRequest = mutation({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const eventRequest = await ctx.db.get(args.requestId as any);
    if (!eventRequest) {
      throw new Error("Event request not found");
    }

    await ctx.db.delete(eventRequest._id);

    return { success: true };
  },
});
