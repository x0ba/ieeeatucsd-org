import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./permissions";

export const list = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    return await ctx.db.query("directOnboardings").collect();
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    position: v.string(),
    team: v.optional(v.string()),
    emailSent: v.boolean(),
    googleGroupAssigned: v.boolean(),
    googleGroup: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    const { logtoId, ...rest } = args;
    return await ctx.db.insert("directOnboardings", {
      ...rest,
      onboardedBy: adminId,
      onboardedAt: Date.now(),
    });
  },
});
