import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./permissions";

export const list = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    return await ctx.db.query("sponsorDomains").collect();
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    domain: v.string(),
    organizationName: v.string(),
    sponsorTier: v.union(
      v.literal("Bronze"),
      v.literal("Silver"),
      v.literal("Gold"),
      v.literal("Platinum"),
      v.literal("Diamond"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    const { logtoId, ...data } = args;
    return await ctx.db.insert("sponsorDomains", {
      ...data,
      createdBy: adminId,
    });
  },
});

export const remove = mutation({
  args: { logtoId: v.string(), id: v.id("sponsorDomains") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    await ctx.db.delete(args.id);
  },
});
