import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a reimbursement request
export const createReimbursement = mutation({
  args: {
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
    receipts: v.array(
      v.object({
        id: v.string(),
        vendorName: v.string(),
        location: v.string(),
        dateOfPurchase: v.number(),
        lineItems: v.array(
          v.object({
            id: v.string(),
            description: v.string(),
            category: v.string(),
            amount: v.number(),
          }),
        ),
        receiptFile: v.optional(v.string()),
        notes: v.optional(v.string()),
        subtotal: v.number(),
        tax: v.optional(v.number()),
        tip: v.optional(v.number()),
        shipping: v.optional(v.number()),
        total: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const reimbursementId = await ctx.db.insert("reimbursements", {
      ...args,
      submittedBy: identity.subject,
      status: "submitted",
    });

    // Update user's public profile points if needed
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (user) {
      // Check if public profile exists
      const existingProfile = await ctx.db
        .query("publicProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      const points = existingProfile?.points || 0;
      const totalEventsAttended = existingProfile?.totalEventsAttended || 0;

      if (!existingProfile) {
        await ctx.db.insert("publicProfiles", {
          userId: user._id,
          name: user.name,
          major: user.major || "Undeclared",
          points,
          totalEventsAttended,
        });
      }
    }

    return await ctx.db.get(reimbursementId);
  },
});

// Get reimbursement by ID
export const getReimbursement = query({
  args: { reimbursementId: v.id("reimbursements") },
  handler: async (ctx, { reimbursementId }) => {
    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      return null;
    }
    return reimbursement;
  },
});

// Get all reimbursements for a user
export const getUserReimbursements = query({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    const reimbursements = await ctx.db
      .query("reimbursements")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", authUserId))
      .order("desc")
      .collect();

    return reimbursements;
  },
});

// Get all reimbursements (for management)
export const getAllReimbursements = query({
  args: {},
  handler: async (ctx) => {
    const reimbursements = await ctx.db.query("reimbursements").order("desc").collect();
    return reimbursements;
  },
});

// Get reimbursements by status
export const getReimbursementsByStatus = query({
  args: { status: v.union(v.literal("submitted"), v.literal("declined"), v.literal("approved"), v.literal("paid")) },
  handler: async (ctx, { status }) => {
    const reimbursements = await ctx.db
      .query("reimbursements")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();

    return reimbursements;
  },
});

// Update reimbursement status (for officers/admins)
export const updateReimbursementStatus = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
    status: v.union(v.literal("submitted"), v.literal("declined"), v.literal("approved"), v.literal("paid")),
    auditNote: v.optional(v.string()),
  },
  handler: async (ctx, { reimbursementId, status, auditNote }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (!user.role.includes("Officer") && user.role !== "Administrator")) {
      throw new Error("Not authorized to update reimbursement status");
    }

    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    // Add audit log entry
    const currentAuditLogs = reimbursement.auditLogs || [];
    const newAuditLog = {
      action: `Status changed to ${status}`,
      createdBy: identity.subject,
      timestamp: Date.now(),
    };

    await ctx.db.patch(reimbursementId, {
      status,
      auditLogs: [...currentAuditLogs, newAuditLog],
      auditNotes: auditNote ? [...(reimbursement.auditNotes || []), { note: auditNote, createdBy: identity.subject, timestamp: Date.now() }] : reimbursement.auditNotes,
    });

    return await ctx.db.get(reimbursementId);
  },
});

// Update reimbursement with payment details
export const updatePaymentDetails = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
    confirmationNumber: v.string(),
    paymentDate: v.number(),
    amountPaid: v.number(),
    proofFileUrl: v.optional(v.string()),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, { reimbursementId, confirmationNumber, paymentDate, amountPaid, proofFileUrl, memo }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (!user.role.includes("Officer") && user.role !== "Administrator")) {
      throw new Error("Not authorized to update payment details");
    }

    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    // Add audit log entry
    const currentAuditLogs = reimbursement.auditLogs || [];
    const newAuditLog = {
      action: `Payment details added - $${amountPaid}`,
      createdBy: identity.subject,
      timestamp: Date.now(),
    };

    await ctx.db.patch(reimbursementId, {
      status: "paid",
      paymentDetails: {
        confirmationNumber,
        paymentDate,
        amountPaid,
        proofFileUrl,
        memo,
      },
      auditLogs: [...currentAuditLogs, newAuditLog],
    });

    return await ctx.db.get(reimbursementId);
  },
});

// Request audit for a reimbursement
export const requestAudit = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
    auditorId: v.string(),
  },
  handler: async (ctx, { reimbursementId, auditorId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    // Check if user is the submitter or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (reimbursement.submittedBy !== identity.subject && !user.role.includes("Officer") && user.role !== "Administrator")) {
      throw new Error("Not authorized to request audit");
    }

    const currentAuditRequests = reimbursement.auditRequests || [];
    const newAuditRequest = {
      auditorId,
      requestedBy: identity.subject,
      requestedAt: Date.now(),
      status: "pending" as const,
    };

    await ctx.db.patch(reimbursementId, {
      auditRequests: [...currentAuditRequests, newAuditRequest],
    });

    return await ctx.db.get(reimbursementId);
  },
});

// Complete audit for a reimbursement
export const completeAudit = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
    auditRequestId: v.string(), // Using string to identify the request
    auditResult: v.union(v.literal("approved"), v.literal("needs_changes")),
    auditNotes: v.optional(v.string()),
  },
  handler: async (ctx, { reimbursementId, auditRequestId, auditResult, auditNotes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    const auditRequests = reimbursement.auditRequests || [];
    const requestIndex = auditRequests.findIndex((req) => req.auditorId === identity.subject && req.status === "pending");

    if (requestIndex === -1) {
      throw new Error("Audit request not found");
    }

    // Update the audit request
    const updatedAuditRequests = [...auditRequests];
    updatedAuditRequests[requestIndex] = {
      ...updatedAuditRequests[requestIndex],
      status: "completed" as const,
      auditResult,
      auditNotes,
      completedAt: Date.now(),
    };

    // Add audit log entry
    const currentAuditLogs = reimbursement.auditLogs || [];
    const newAuditLog = {
      action: `Audit completed - ${auditResult}`,
      createdBy: identity.subject,
      timestamp: Date.now(),
    };

    await ctx.db.patch(reimbursementId, {
      auditRequests: updatedAuditRequests,
      auditLogs: [...currentAuditLogs, newAuditLog],
      requiresExecutiveOverride: auditResult === "needs_changes",
    });

    return await ctx.db.get(reimbursementId);
  },
});

// Update reimbursement approved amount (for partial approval)
export const updateApprovedAmount = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
    approvedAmount: v.optional(v.number()),
    partialReason: v.optional(v.string()),
    originalAmount: v.optional(v.number()),
  },
  handler: async (ctx, { reimbursementId, approvedAmount, partialReason, originalAmount }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (!user.role.includes("Officer") && user.role !== "Administrator")) {
      throw new Error("Not authorized to update reimbursement");
    }

    const reimbursement = await ctx.db.get(reimbursementId);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    // Add audit log entry
    const currentAuditLogs = reimbursement.auditLogs || [];
    const newAuditLog = {
      action: approvedAmount
        ? `Partially approved for $${approvedAmount}`
        : "Partial approval cleared",
      createdBy: identity.subject,
      timestamp: Date.now(),
    };

    const updateData: any = {
      auditLogs: [...currentAuditLogs, newAuditLog],
    };

    if (approvedAmount !== undefined) {
      updateData.approvedAmount = approvedAmount;
    }

    if (partialReason !== undefined) {
      updateData.partialReason = partialReason;
    }
    if (originalAmount !== undefined) {
      updateData.originalAmount = originalAmount;
    }

    await ctx.db.patch(reimbursementId, updateData);

    return await ctx.db.get(reimbursementId);
  },
});

// Generic update mutation for reimbursement details
// Used by ManageReimbursementDetails for partial approvals and payment info
export const update = mutation({
  args: {
    id: v.id("reimbursements"),
    approvedAmount: v.optional(v.number()),
    partialReason: v.optional(v.string()),
    originalAmount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("submitted"), v.literal("declined"), v.literal("approved"), v.literal("paid"))),
    paymentConfirmation: v.optional(v.string()),
    paymentDate: v.optional(v.number()),
    amountPaid: v.optional(v.number()),
    proofFileUrl: v.optional(v.string()),
    paymentMemo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (!user.role.includes("Officer") && user.role !== "Administrator")) {
      throw new Error("Not authorized to update reimbursement");
    }

    const reimbursement = await ctx.db.get(args.id);
    if (!reimbursement) {
      throw new Error("Reimbursement not found");
    }

    // Build update data object with only provided fields
    const updateData: any = {};

    if (args.approvedAmount !== undefined) {
      updateData.approvedAmount = args.approvedAmount;
    }
    if (args.partialReason !== undefined) {
      updateData.partialReason = args.partialReason;
    }
    if (args.originalAmount !== undefined) {
      updateData.originalAmount = args.originalAmount;
    }
    if (args.status !== undefined) {
      updateData.status = args.status;
    }
    if (args.paymentConfirmation !== undefined) {
      updateData.paymentConfirmation = args.paymentConfirmation;
    }
    if (args.paymentDate !== undefined) {
      updateData.paymentDate = args.paymentDate;
    }
    if (args.amountPaid !== undefined) {
      updateData.amountPaid = args.amountPaid;
    }
    if (args.proofFileUrl !== undefined) {
      updateData.proofFileUrl = args.proofFileUrl;
    }
    if (args.paymentMemo !== undefined) {
      updateData.paymentMemo = args.paymentMemo;
    }

    // Add audit log entry if there are changes
    if (Object.keys(updateData).length > 0) {
      const currentAuditLogs = reimbursement.auditLogs || [];
      const changes = Object.keys(updateData).join(", ");
      const newAuditLog = {
        action: `Updated: ${changes}`,
        createdBy: identity.subject,
        timestamp: Date.now(),
      };
      updateData.auditLogs = [...currentAuditLogs, newAuditLog];
    }

    await ctx.db.patch(args.id, updateData);

    return await ctx.db.get(args.id);
  },
});

// Get user by ID (for fetching submitter details)
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId as any);
    if (!user) {
      return null;
    }
    return user;
  },
});

// Delete a reimbursement request (for administrators only)
export const deleteReimbursement = mutation({
  args: {
    reimbursementId: v.id("reimbursements"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Unauthorized: User not authenticated");
    }

    // Check if user is administrator
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();
    
    if (!user || user.role !== "Administrator") {
      throw new Error("Unauthorized: Only administrators can delete reimbursements");
    }

    // Delete the reimbursement
    await ctx.db.delete(args.reimbursementId);
    
    return { success: true };
  },
});
