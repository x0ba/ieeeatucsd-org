import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess, requireOfficerAccess } from "./permissions";

export const list = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("constitutions").collect();
  },
});

export const get = query({
  args: { id: v.id("constitutions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("constitutions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .first();
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("constitutions"),
    title: v.optional(v.string()),
    sections: v.optional(v.any()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminAccess(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { id, logtoId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {
      lastModifiedBy: userId,
    };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});
