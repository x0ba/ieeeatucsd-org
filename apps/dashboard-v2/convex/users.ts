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
      .first();
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
    // 1. Check if user already exists by logtoId
    const existing = await ctx.db
      .query("users")
      .withIndex("by_logtoId", (q) => q.eq("logtoId", args.logtoId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastLogin: Date.now(),
        ...(args.signInMethod && { signInMethod: args.signInMethod }),
        ...(args.avatar && { avatar: args.avatar }),
      });
      return existing._id;
    }

    // 2. Check if a Firebase-migrated user exists by email (no logtoId yet)
    const migratedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (migratedUser && !migratedUser.logtoId) {
      // Link the migrated user to their Logto account
      await ctx.db.patch(migratedUser._id, {
        logtoId: args.logtoId,
        lastLogin: Date.now(),
        ...(args.signInMethod && { signInMethod: args.signInMethod }),
        ...(args.avatar && !migratedUser.avatar && { avatar: args.avatar }),
        ...(args.name && !migratedUser.name && { name: args.name }),
      });

      // The role field stays in the DB — it will be synced to Logto
      // by the manage-users page or a background job later.
      // For now, the DB role continues to drive permissions.

      return migratedUser._id;
    }

    // 3. Brand new user — check for sponsor domain auto-assignment
    let role: string = "Member";
    let sponsorTier: string | undefined;
    let sponsorOrganization: string | undefined;
    let autoAssignedSponsor = false;

    if (args.email) {
      const emailDomain = "@" + args.email.split("@")[1]?.toLowerCase();
      const domainMatch = await ctx.db
        .query("sponsorDomains")
        .withIndex("by_domain", (q) => q.eq("domain", emailDomain))
        .first();

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
      .first();

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
    syncPublicProfile: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const updateData: Record<string, unknown> = {
      lastUpdated: Date.now(),
    };

    const { syncPublicProfile = true, ...profileArgs } = args;

    for (const [key, value] of Object.entries(profileArgs)) {
      if (key !== "logtoId" && value !== undefined) {
        updateData[key] = value;
      }
    }

    await ctx.db.patch(user._id, updateData);

    // Sync public profile if requested and name/major/graduationYear changed
    if (syncPublicProfile) {
      const existingProfile = await ctx.db
        .query("publicProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      const newName = typeof updateData.name === "string" ? updateData.name : user.name;
      const newMajor =
        typeof updateData.major === "string" ? updateData.major : user.major;
      const newGraduationYear =
        typeof updateData.graduationYear === "number"
          ? updateData.graduationYear
          : user.graduationYear;

      const profileData = {
        name: newName,
        major: newMajor,
        points: user.points || 0,
        eventsAttended: user.eventsAttended || 0,
        position: user.position || user.role,
        graduationYear: newGraduationYear,
        joinDate: user.joinDate || user._creationTime,
      };

      if (existingProfile) {
        await ctx.db.patch(existingProfile._id, profileData);
      } else {
        await ctx.db.insert("publicProfiles", {
          ...profileData,
          userId: user._id,
        });
      }
    }

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

export const updateStatus = mutation({
  args: {
    logtoId: v.string(),
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdminAccess(ctx, args.logtoId);

    await ctx.db.patch(args.userId, {
      status: args.status,
      lastUpdated: Date.now(),
      lastUpdatedBy: admin.logtoId,
    });

    return args.userId;
  },
});

export const deleteUser = mutation({
  args: {
    logtoId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);

    // Delete the user's public profile if it exists
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (publicProfile) {
      await ctx.db.delete(publicProfile._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    return { success: true, deletedUserId: args.userId };
  },
});

export const getOverviewData = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";

    // Get user's attended events
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get event details for attended events
    const eventDetails = await Promise.all(
      attendees.map(async (a) => {
        const event = await ctx.db.get(a.eventId);
        return event ? { ...event, timeCheckedIn: a.timeCheckedIn, pointsEarned: a.pointsEarned } : null;
      })
    );
    eventDetails.filter(Boolean);

    // Build points history
    const sortedAttendees = [...attendees].sort((a, b) => a.timeCheckedIn - b.timeCheckedIn);
    let cumulative = 0;
    const pointsHistory = sortedAttendees.map((a) => {
      cumulative += a.pointsEarned;
      return { date: a.timeCheckedIn, points: a.pointsEarned, cumulative };
    });

    // Get user's reimbursements
    const reimbursements = await ctx.db
      .query("reimbursements")
      .withIndex("by_submittedBy", (q) => q.eq("submittedBy", userId))
      .collect();

    // Build recent activity
    const activities: { type: string; title: string; description: string; date: number; points?: number }[] = [];

    for (const a of attendees) {
      const event = await ctx.db.get(a.eventId);
      activities.push({
        type: "event",
        title: "Attended Event",
        description: event?.eventName || "Event",
        date: a.timeCheckedIn,
        points: a.pointsEarned,
      });
    }

    for (const r of reimbursements) {
      activities.push({
        type: "reimbursement",
        title: `Reimbursement ${r.status === "approved" ? "Approved" : r.status === "paid" ? "Paid" : "Submitted"}`,
        description: r.title,
        date: r._creationTime,
      });
    }

    activities.sort((a, b) => b.date - a.date);

    // Get rank
    const allUsers = await ctx.db.query("users").collect();
    const activeUsers = allUsers
      .filter((u) => u.signedUp && u.status === "active")
      .sort((a, b) => (b.points || 0) - (a.points || 0));
    const rank = activeUsers.findIndex((u) => u._id === user._id) + 1;

    return {
      user: {
        name: user.name,
        points: user.points || 0,
        eventsAttended: user.eventsAttended || 0,
        role: user.role,
        joinDate: user.joinDate,
        signedUp: user.signedUp,
      },
      rank,
      totalMembers: activeUsers.length,
      pointsHistory,
      recentActivity: activities.slice(0, 10),
      reimbursementStats: {
        submitted: reimbursements.length,
        approved: reimbursements.filter((r) => r.status === "approved" || r.status === "paid").length,
      },
    };
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
        graduationYear: u.graduationYear,
        avatar: u.avatar,
      }))
      .sort((a, b) => b.points - a.points);
  },
});

export const getOfficerLeaderboard = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx, args.logtoId);
    const users = await ctx.db.query("users").collect();

    const officers = users.filter(
      (u) =>
        u.status === "active" &&
        (u.role === "General Officer" ||
          u.role === "Executive Officer" ||
          u.role === "Administrator"),
    );

    // Group by team
    const teams: Record<string, typeof officers> = {
      Internal: [],
      Events: [],
      Projects: [],
      Unassigned: [],
    };

    for (const officer of officers) {
      const team = officer.team || "Unassigned";
      if (!teams[team]) teams[team] = [];
      teams[team].push(officer);
    }

    // Get attendance data for each officer
    const officerData = await Promise.all(
      officers.map(async (officer) => {
        const userId = officer.logtoId ?? officer.authUserId ?? "";
        const attendees = await ctx.db
          .query("attendees")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect();
        return {
          _id: officer._id,
          name: officer.name,
          avatar: officer.avatar,
          role: officer.role,
          position: officer.position,
          team: officer.team || "Unassigned",
          points: officer.points || 0,
          eventsAttended: officer.eventsAttended || 0,
          totalAttendances: attendees.length,
        };
      }),
    );

    // Calculate team metrics
    const teamMetrics = Object.entries(teams)
      .filter(([_, members]) => members.length > 0)
      .map(([teamName, members]) => {
        const teamOfficerData = officerData.filter((o) => o.team === teamName);
        const totalAttendances = teamOfficerData.reduce((sum, o) => sum + o.totalAttendances, 0);
        const totalPoints = teamOfficerData.reduce((sum, o) => sum + o.points, 0);
        return {
          team: teamName,
          memberCount: members.length,
          totalAttendances,
          totalPoints,
          attendanceRate: members.length > 0 ? totalAttendances / members.length : 0,
          members: teamOfficerData.sort((a, b) => b.totalAttendances - a.totalAttendances),
        };
      })
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    return { teamMetrics, officers: officerData };
  },
});
