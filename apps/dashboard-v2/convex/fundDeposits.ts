import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireOfficerAccess,
  requireAdminAccess,
} from "./permissions";

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("fundDeposits").collect();
  },
});

export const get = query({
  args: { id: v.id("fundDeposits") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    title: v.string(),
    amount: v.number(),
    source: v.string(),
    depositDate: v.number(),
    description: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireOfficerAccess(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { logtoId, ...data } = args;
    return await ctx.db.insert("fundDeposits", {
      ...data,
      depositedBy: userId,
      status: "pending",
    });
  },
});

export const verify = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("fundDeposits"),
    status: v.union(
      v.literal("verified"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    await ctx.db.patch(args.id, {
      status: args.status,
      verifiedBy: adminId,
      verifiedAt: Date.now(),
    });
    return args.id;
  },
});
