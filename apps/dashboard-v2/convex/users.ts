import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  requireCurrentUser,
  requireAdminAccess,
  getCurrentUser,
} from "./permissions";

export const getMe = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    return await getCurrentUser(ctx, args.logtoId);
  },
});

export const getByLogtoId = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_logtoId", (q) => q.eq("logtoId", args.logtoId))
      .unique();
  },
});

export const upsertFromAuth = mutation({
  args: {
    logtoId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    signInMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_logtoId", (q) => q.eq("logtoId", args.logtoId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastLogin: Date.now(),
        ...(args.signInMethod && { signInMethod: args.signInMethod }),
        ...(args.avatar && { avatar: args.avatar }),
      });
      return existing._id;
    }

    // Check for sponsor domain auto-assignment
    let role: string = "Member";
    let sponsorTier: string | undefined;
    let sponsorOrganization: string | undefined;
    let autoAssignedSponsor = false;

    if (args.email) {
      const emailDomain = "@" + args.email.split("@")[1]?.toLowerCase();
      const domainMatch = await ctx.db
        .query("sponsorDomains")
        .withIndex("by_domain", (q) => q.eq("domain", emailDomain))
        .unique();

      if (domainMatch) {
        role = "Sponsor";
        sponsorTier = domainMatch.sponsorTier;
        sponsorOrganization = domainMatch.organizationName;
        autoAssignedSponsor = true;
      }
    }

    // Check for accepted officer invitations
    const acceptedInvitation = await ctx.db
      .query("officerInvitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .first();

    if (acceptedInvitation && role === "Member") {
      role = acceptedInvitation.role;
    }

    const userId = await ctx.db.insert("users", {
      logtoId: args.logtoId,
      email: args.email,
      emailVisibility: true,
      verified: true,
      name: args.name,
      avatar: args.avatar,
      lastLogin: Date.now(),
      notificationPreferences: {},
      displayPreferences: {},
      accessibilitySettings: {},
      signedUp: false,
      requestedEmail: false,
      role: role as any,
      status: "active",
      joinDate: Date.now(),
      eventsAttended: 0,
      points: 0,
      signInMethod: args.signInMethod || "logto",
      ...(sponsorTier && { sponsorTier: sponsorTier as any }),
      ...(sponsorOrganization && { sponsorOrganization }),
      ...(autoAssignedSponsor && { autoAssignedSponsor }),
      ...(acceptedInvitation?.position && {
        position: acceptedInvitation.position,
      }),
      ...(acceptedInvitation && {
        invitedBy: acceptedInvitation.invitedBy,
        inviteAccepted: Date.now(),
      }),
    });

    return userId;
  },
});

export const completeOnboarding = mutation({
  args: {
    logtoId: v.string(),
    pid: v.string(),
    major: v.string(),
    graduationYear: v.number(),
    memberId: v.optional(v.string()),
    zelleInformation: v.optional(v.string()),
    resume: v.optional(v.string()),
    tosVersion: v.string(),
    privacyPolicyVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      pid: args.pid,
      major: args.major,
      graduationYear: args.graduationYear,
      signedUp: true,
      joinDate: now,
      tosAcceptedAt: now,
      tosVersion: args.tosVersion,
      privacyPolicyAcceptedAt: now,
      privacyPolicyVersion: args.privacyPolicyVersion,
      ...(args.memberId && { memberId: args.memberId }),
      ...(args.zelleInformation && { zelleInformation: args.zelleInformation }),
      ...(args.resume && { resume: args.resume }),
    });

    // Create/update public profile
    const existingProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const profileData = {
      userId: user._id,
      name: user.name,
      major: args.major,
      points: user.points || 0,
      eventsAttended: user.eventsAttended || 0,
      position: user.position || user.role,
      graduationYear: args.graduationYear,
      joinDate: now,
    };

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, profileData);
    } else {
      await ctx.db.insert("publicProfiles", profileData);
    }

    return user._id;
  },
});

export const updateProfile = mutation({
  args: {
    logtoId: v.string(),
    name: v.optional(v.string()),
    major: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    memberId: v.optional(v.string()),
    zelleInformation: v.optional(v.string()),
    avatar: v.optional(v.string()),
    pid: v.optional(v.string()),
    resume: v.optional(v.string()),
    emailVisibility: v.optional(v.boolean()),
    notificationPreferences: v.optional(v.any()),
    displayPreferences: v.optional(v.any()),
    accessibilitySettings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const updateData: Record<string, unknown> = {
      lastUpdated: Date.now(),
    };

    for (const [key, value] of Object.entries(args)) {
      if (key !== "logtoId" && value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(user._id, updateData);
    return user._id;
  },
});

export const acceptPolicyUpdate = mutation({
  args: {
    logtoId: v.string(),
    tosVersion: v.string(),
    privacyPolicyVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const now = Date.now();

    await ctx.db.patch(user._id, {
      tosAcceptedAt: now,
      tosVersion: args.tosVersion,
      privacyPolicyAcceptedAt: now,
      privacyPolicyVersion: args.privacyPolicyVersion,
    });

    return user._id;
  },
});

export const list = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    return await ctx.db.query("users").collect();
  },
});

export const updateRole = mutation({
  args: {
    logtoId: v.string(),
    userId: v.id("users"),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.optional(v.string()),
    team: v.optional(
      v.union(
        v.literal("Internal"),
        v.literal("Events"),
        v.literal("Projects"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);

    await ctx.db.patch(args.userId, {
      role: args.role,
      ...(args.position !== undefined && { position: args.position }),
      ...(args.team !== undefined && { team: args.team }),
      lastUpdated: Date.now(),
      lastUpdatedBy: admin.logtoId,
    });

    return args.userId;
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.signedUp && u.status === "active")
      .map((u) => ({
        _id: u._id,
        name: u.name,
        points: u.points || 0,
        eventsAttended: u.eventsAttended || 0,
        major: u.major,
        avatar: u.avatar,
      }))
      .sort((a, b) => b.points - a.points);
  },
});
