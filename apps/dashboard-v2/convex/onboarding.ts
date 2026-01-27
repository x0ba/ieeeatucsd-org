import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get organization settings
// Note: Since organizationSettings table doesn't exist in schema,
// this returns default settings. In a production environment,
// you would add the table to schema.ts and uncomment the query logic.
export const getOrganizationSettings = query({
  args: {},
  handler: async (ctx) => {
    // For now, return null to indicate no settings are configured
    // In production, this would query the organizationSettings table:
    // const settings = await ctx.db.query("organizationSettings").first();
    // return settings;
    return null;
  },
});

// Update organization settings
// Note: Since organizationSettings table doesn't exist in schema,
// this returns success without persisting. In a production environment,
// you would add the table to schema.ts and uncomment the mutation logic.
export const updateOrganizationSettings = mutation({
  args: {
    googleSheetsContactListUrl: v.optional(v.string()),
    updatedBy: v.string(),
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
      throw new Error("Not authorized to update organization settings");
    }

    // For now, just return success without persisting
    // In production, this would update the organizationSettings table:
    // const existing = await ctx.db.query("organizationSettings").first();
    // const now = Date.now();
    // if (existing) {
    //   await ctx.db.patch(existing._id, {
    //     googleSheetsContactListUrl: args.googleSheetsContactListUrl,
    //     updatedAt: now,
    //     updatedBy: args.updatedBy,
    //   });
    // } else {
    //   await ctx.db.insert("organizationSettings", {
    //     googleSheetsContactListUrl: args.googleSheetsContactListUrl,
    //     createdAt: now,
    //     updatedAt: now,
    //     updatedBy: args.updatedBy,
    //   });
    // }
    return { success: true };
  },
});

// Get all officer invitations ordered by invitedAt descending
export const listInvitations = query({
  args: {},
  handler: async (ctx) => {
    const invitations = await ctx.db
      .query("officerInvitations")
      .order("desc")
      .collect();
    
    return invitations.map((i) => ({
      _id: i._id,
      name: i.name,
      email: i.email,
      role: i.role,
      position: i.position,
      status: i.status,
      invitedBy: i.invitedBy,
      invitedAt: i.invitedAt,
      expiresAt: i.expiresAt,
      message: i.message,
      acceptanceDeadline: i.acceptanceDeadline,
      leaderName: i.leaderName,
      googleGroupAssigned: i.googleGroupAssigned,
      googleGroup: i.googleGroup,
      permissionsGranted: i.permissionsGranted,
      onboardingEmailSent: i.onboardingEmailSent,
      acceptedAt: i.acceptedAt,
      declinedAt: i.declinedAt,
    }));
  },
});

// Create officer invitation
export const createInvitation = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.string(),
    message: v.optional(v.string()),
    acceptanceDeadline: v.optional(v.string()),
    leaderName: v.optional(v.string()),
    expiresAt: v.number(),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const invitationId = await ctx.db.insert("officerInvitations", {
      name: args.name,
      email: args.email,
      role: args.role,
      position: args.position,
      status: "pending",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      expiresAt: args.expiresAt,
      message: args.message,
      acceptanceDeadline: args.acceptanceDeadline,
      leaderName: args.leaderName,
      googleGroupAssigned: false,
      permissionsGranted: false,
      onboardingEmailSent: false,
      lastSentAt: Date.now(),
    });

    return invitationId;
  },
});

// Update invitation (for resending)
export const updateInvitation = mutation({
  args: {
    invitationId: v.id("officerInvitations"),
    lastSentAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invitationId, {
      lastSentAt: args.lastSentAt,
    });
    return await ctx.db.get(args.invitationId);
  },
});

// Get invitation stats
export const getInvitationStats = query({
  args: {},
  handler: async (ctx) => {
    const invitations = await ctx.db.query("officerInvitations").collect();
    
    return {
      totalInvitations: invitations.length,
      pendingInvitations: invitations.filter((i) => i.status === "pending").length,
      acceptedInvitations: invitations.filter((i) => i.status === "accepted").length,
      declinedInvitations: invitations.filter((i) => i.status === "declined").length,
    };
  },
});

// Create direct onboarding record
export const createDirectOnboarding = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.string(),
    leaderName: v.optional(v.string()),
    customMessage: v.optional(v.string()),
    emailTemplate: v.optional(v.string()),
    onboardedBy: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const onboardingId = await ctx.db.insert("directOnboardings", {
      name: args.name,
      email: args.email,
      role: args.role,
      position: args.position,
      leaderName: args.leaderName,
      customMessage: args.customMessage,
      emailTemplate: args.emailTemplate,
      onboardedBy: args.onboardedBy,
      userId: args.userId,
      createdAt: Date.now(),
    });

    return onboardingId;
  },
});
