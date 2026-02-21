import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOfficerAccess } from "./permissions";

export const list = query({
  args: { logtoId: v.string(), authToken: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId, args.authToken);
    return await ctx.db.query("internalEvents").withIndex("by_startDate").collect();
  },
});

export const getById = query({
  args: { logtoId: v.string(), authToken: v.string(), id: v.id("internalEvents") },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId, args.authToken);
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    authToken: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    location: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    eventType: v.union(
      v.literal("meeting"),
      v.literal("tabling"),
      v.literal("workshop"),
      v.literal("social"),
      v.literal("outreach"),
      v.literal("other"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireOfficerAccess(ctx, args.logtoId, args.authToken);
    const id = await ctx.db.insert("internalEvents", {
      name: args.name,
      description: args.description,
      location: args.location,
      startDate: args.startDate,
      endDate: args.endDate,
      eventType: args.eventType,
      createdBy: user.logtoId ?? user.authUserId ?? "",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    authToken: v.string(),
    id: v.id("internalEvents"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    eventType: v.optional(
      v.union(
        v.literal("meeting"),
        v.literal("tabling"),
        v.literal("workshop"),
        v.literal("social"),
        v.literal("outreach"),
        v.literal("other"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId, args.authToken);
    const { logtoId, authToken, id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
      updatedBy: logtoId,
    });
    return id;
  },
});

export const remove = mutation({
  args: { logtoId: v.string(), authToken: v.string(), id: v.id("internalEvents") },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId, args.authToken);
    await ctx.db.delete(args.id);
    return args.id;
  },
});
