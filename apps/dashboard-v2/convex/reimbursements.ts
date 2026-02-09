import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireAdminAccess,
} from "./permissions";

export const listMine = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    return await ctx.db
      .query("reimbursements")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", userId))
      .collect();
  },
});

export const listAll = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    return await ctx.db.query("reimbursements").collect();
  },
});

export const get = query({
  args: { id: v.id("reimbursements") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    title: v.string(),
    totalAmount: v.number(),
    paymentMethod: v.string(),
    additionalInfo: v.string(),
    department: v.union(
      v.literal("internal"),
      v.literal("external"),
      v.literal("projects"),
      v.literal("events"),
      v.literal("other"),
    ),
    receipts: v.optional(v.any()),
    dateOfPurchase: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { logtoId, ...data } = args;
    return await ctx.db.insert("reimbursements", {
      ...data,
      status: "submitted",
      submittedBy: userId,
      auditLogs: [
        {
          action: "submitted",
          createdBy: userId,
          timestamp: Date.now(),
        },
      ],
    });
  },
});

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("reimbursements"),
    status: v.union(
      v.literal("submitted"),
      v.literal("declined"),
      v.literal("approved"),
      v.literal("paid"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);
    const adminId = admin.logtoId ?? admin.authUserId ?? "";
    const reimbursement = await ctx.db.get(args.id);
    if (!reimbursement) throw new Error("Reimbursement not found");

    const auditLogs = reimbursement.auditLogs || [];
    auditLogs.push({
      action: `status_changed_to_${args.status}`,
      createdBy: adminId,
      timestamp: Date.now(),
    });

    await ctx.db.patch(args.id, {
      status: args.status,
      auditLogs,
    });
    return args.id;
  },
});
