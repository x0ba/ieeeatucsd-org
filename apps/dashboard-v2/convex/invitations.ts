import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List recent invitations
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const invitations = await ctx.db
      .query("officerInvitations")
      .order("desc")
      .take(args.limit || 50);

    return invitations;
  },
});

// Create officer invitation
export const create = mutation({
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
    message: v.optional(v.string()),
    acceptanceDeadline: v.optional(v.string()),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the inviter has permission
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.invitedBy))
      .first();

    if (!inviter) {
      throw new Error("Inviter not found");
    }

    const hasPermission =
      inviter.role === "Executive Officer" || inviter.role === "Administrator";
    if (!hasPermission) {
      throw new Error(
        "Unauthorized: Only Executive Officers and Administrators can send invitations",
      );
    }

    // Calculate expiration date (7 days from now)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("officerInvitations", {
      name: args.name,
      email: args.email,
      role: args.role,
      position: args.position,
      status: "pending",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      expiresAt,
      message: args.message,
      acceptanceDeadline: args.acceptanceDeadline,
      leaderName: args.leaderName,
      googleGroupAssigned: false,
      permissionsGranted: false,
      onboardingEmailSent: false,
      lastSentAt: Date.now(),
      roleGranted: false,
      userCreatedOrUpdated: false,
    });

    return await ctx.db.get(invitationId);
  },
});

// Get invitation by ID
export const getById = query({
  args: {
    id: v.id("officerInvitations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Accept invitation
export const accept = mutation({
  args: {
    id: v.id("officerInvitations"),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.id);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is not pending");
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error("Invitation has expired");
    }

    // Update invitation status
    await ctx.db.patch(args.id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Update user role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        role: invitation.role,
        position: invitation.position,
        invitedBy: invitation.invitedBy,
        inviteAccepted: Date.now(),
      });
      return await ctx.db.get(user._id);
    }

    return await ctx.db.get(args.id);
  },
});

// Resend invitation
export const resend = mutation({
  args: {
    id: v.id("officerInvitations"),
    authUserId: v.string(),
    leaderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    const invitation = await ctx.db.get(args.id);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify the current user is the one who invited or is an admin
    const hasPermission =
      invitation.invitedBy === args.authUserId ||
      currentUser.role === "Administrator";

    if (!hasPermission) {
      throw new Error("Unauthorized");
    }

    // Update last sent timestamp
    await ctx.db.patch(args.id, {
      lastSentAt: Date.now(),
      resentAt: Date.now(),
    });

    return await ctx.db.get(args.id);
  },
});

// Get invitations stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allInvitations = await ctx.db.query("officerInvitations").collect();

    const stats = {
      totalInvitations: allInvitations.length,
      pendingInvitations: allInvitations.filter((i) => i.status === "pending")
        .length,
      acceptedInvitations: allInvitations.filter((i) => i.status === "accepted")
        .length,
      declinedInvitations: allInvitations.filter((i) => i.status === "declined")
        .length,
    };

    return stats;
  },
});
