import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess, getCurrentUser } from "./permissions";

const logType = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("error"),
  v.literal("update"),
  v.literal("delete"),
  v.literal("create"),
  v.literal("login"),
  v.literal("logout"),
);

export const list = query({
  args: {
    logtoId: v.string(),
    limit: v.optional(v.number()),
    type: v.optional(logType),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);

    let q = ctx.db.query("logs");

    const results = await q.order("desc").collect();

    const filtered = args.type
      ? results.filter((log) => log.type === args.type)
      : results;

    return filtered.slice(0, args.limit ?? 100);
  },
});

export const create = mutation({
  args: {
    logtoId: v.optional(v.string()),
    userId: v.optional(v.string()),
    type: logType,
    part: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;

    if (!userId && args.logtoId) {
      const user = await getCurrentUser(ctx, args.logtoId);
      userId = user?.logtoId ?? user?.authUserId ?? args.logtoId;
    }

    return await ctx.db.insert("logs", {
      userId: userId ?? "system",
      type: args.type,
      part: args.part,
      message: args.message,
    });
  },
});
