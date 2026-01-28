import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";

// Get current user by Better Auth ID from context
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.subject) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    return user;
  },
});

// Get all users (for admin use)
export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !identity.subject) {
      return [];
    }

    // Check if user has admin privileges
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (user.role !== "Administrator" && user.role !== "Executive Officer")) {
      return [];
    }

    return await ctx.db.query("users").collect();
  },
});

// Get user by ID (for admin use)
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !identity.subject) {
      return null;
    }

    // Check if user has admin privileges
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (user.role !== "Administrator" && user.role !== "Executive Officer")) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

export const updateNavigationLayout = mutation({
  args: {
    authUserId: v.string(),
    navigationLayout: v.union(
      v.literal("horizontal"),
      v.literal("sidebar"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      navigationLayout: args.navigationLayout,
      lastUpdated: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

// Sync user from Better Auth to Convex
export const syncUser = mutation({
  args: {
    authUserId: v.string(),
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (existingUser) {
      // Update existing user's last login
      await ctx.db.patch(existingUser._id, {
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      });
      return existingUser;
    }

    // Check if user exists by email (for migration purposes)
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (userByEmail) {
      // Link existing user to Better Auth ID
      await ctx.db.patch(userByEmail._id, {
        authUserId: args.authUserId,
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      });
      return await ctx.db.get(userByEmail._id);
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      authUserId: args.authUserId,
      email: args.email,
      emailVisibility: true,
      verified: true,
      name: args.name,
      avatar: args.avatar,
      lastLogin: Date.now(),
      joinDate: Date.now(),
      notificationPreferences: {},
      displayPreferences: {},
      accessibilitySettings: {},
      signedUp: false,
      requestedEmail: false,
      role: "Member",
      status: "active",
      eventsAttended: 0,
      points: 0,
    });

    return await ctx.db.get(userId);
  },
});

// Get user by Better Auth ID
export const getUserByAuthUserId = query({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    return user;
  },
});

// Check if user has officer or admin role
export const hasOfficerRole = query({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      return false;
    }

    const officerRoles = [
      "General Officer",
      "Executive Officer",
      "Member at Large",
      "Past Officer",
      "Administrator",
    ];

    return officerRoles.includes(user.role);
  },
});

// Update user role
export const updateUserRole = mutation({
  args: {
    authUserId: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      role: args.role,
      lastUpdated: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

// Server action to sync user from Better Auth session after sign-in
export const syncUserFromSession = mutation({
  args: {
    inviteId: v.optional(v.string()),
    signInMethod: v.optional(
      v.union(
        v.literal("email"),
        v.literal("google"),
        v.literal("microsoft"),
        v.literal("github"),
        v.literal("facebook"),
        v.literal("twitter"),
        v.literal("apple"),
        v.literal("other"),
      ),
    ),
  },
  handler: async (ctx, { inviteId, signInMethod }) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.email || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    // Check for sponsor domain auto-assignment
    let sponsorDomainData = null;
    if (identity.email) {
      try {
        const emailDomain = "@" + identity.email.split("@")[1];
        const sponsorDomain = await ctx.db
          .query("sponsorDomains")
          .withIndex("by_domain", (q) => q.eq("domain", emailDomain.toLowerCase()))
          .first();

        if (sponsorDomain) {
          sponsorDomainData = sponsorDomain;
          console.log("Sponsor domain match found:", {
            domain: emailDomain,
            organization: sponsorDomain.organizationName,
            tier: sponsorDomain.sponsorTier,
          });
        }
      } catch (error) {
        console.error("Error checking sponsor domains:", error);
        // Continue with normal flow if sponsor domain check fails
      }
    }

    // Process invite if provided
    let inviteData = null;
    if (inviteId) {
      try {
        console.log("Processing invite:", inviteId);
        const invite = await ctx.db
          .query("invites")
          .filter((q) => q.eq(q.field("_id"), inviteId))
          .first();

        if (invite) {
          inviteData = invite;
          console.log("Invite found:", {
            email: invite.email,
            role: invite.role,
          });

          // Verify the invite is for this user's email
          if (
            invite.email === identity.email &&
            invite.status === "pending"
          ) {
            // Mark invite as accepted
            await ctx.db.patch(invite._id, {
              status: "accepted",
              acceptedBy: identity.subject,
              acceptedAt: Date.now(),
            });
            console.log("Invite accepted successfully");
          } else {
            console.warn("Invite validation failed:", {
              inviteEmail: invite.email,
              userEmail: identity.email,
              inviteStatus: invite.status,
            });
            inviteData = null; // Reset if validation fails
          }
        } else {
          console.warn("Invite not found:", inviteId);
        }
      } catch (error) {
        console.error("Error processing invite:", error);
        inviteData = null;
      }
    }

    // Check for accepted officer invitations (if user accepted before signing in)
    let acceptedInvitation = null;
    try {
      const acceptedInvites = await ctx.db
        .query("officerInvitations")
        .withIndex("by_email", (q) => q.eq("email", identity.email))
        .filter((q) => q.eq("status", "accepted"))
        .first();

      if (acceptedInvites) {
        acceptedInvitation = acceptedInvites;
        console.log(
          `Found accepted officer invitation for ${identity.email}: ${acceptedInvitation.role}`,
        );
      }
    } catch (error) {
      console.error("Error checking for accepted invitations:", error);
    }

    if (existingUser) {
      // Update existing user's last login and sign-in method
      const updateData: any = {
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      };

      if (signInMethod) {
        updateData.signInMethod = signInMethod;
      }

      // Check if existing user should be upgraded to sponsor based on domain
      if (
        sponsorDomainData &&
        existingUser.role !== "Sponsor" &&
        existingUser.role !== "Administrator"
      ) {
        // Auto-upgrade existing user to sponsor
        updateData.role = "Sponsor";
        updateData.sponsorTier = sponsorDomainData.sponsorTier;
        updateData.sponsorOrganization = sponsorDomainData.organizationName;
        updateData.autoAssignedSponsor = true;
        console.log("Auto-upgrading existing user to sponsor:", {
          tier: sponsorDomainData.sponsorTier,
          organization: sponsorDomainData.organizationName,
        });
      }

      // Check if existing user has an accepted officer invitation
      if (
        acceptedInvitation &&
        existingUser.role !== "Administrator" &&
        existingUser.role !== acceptedInvitation.role
      ) {
        // Upgrade user to officer role from accepted invitation
        updateData.role = acceptedInvitation.role;
        updateData.position = acceptedInvitation.position;
        updateData.invitedBy = acceptedInvitation.invitedBy;
        updateData.inviteAccepted = Date.now();
        console.log("Upgrading existing user from accepted invitation:", {
          role: acceptedInvitation.role,
          position: acceptedInvitation.position,
        });
      }

      await ctx.db.patch(existingUser._id, updateData);
      return await ctx.db.get(existingUser._id);
    }

    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (userByEmail) {
      // Link existing user to Better Auth ID
      const updateData: any = {
        authUserId: identity.subject,
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      };

      if (signInMethod) {
        updateData.signInMethod = signInMethod;
      }

      // Check if existing user should be upgraded to sponsor based on domain
      if (
        sponsorDomainData &&
        userByEmail.role !== "Sponsor" &&
        userByEmail.role !== "Administrator"
      ) {
        updateData.role = "Sponsor";
        updateData.sponsorTier = sponsorDomainData.sponsorTier;
        updateData.sponsorOrganization = sponsorDomainData.organizationName;
        updateData.autoAssignedSponsor = true;
      }

      // Check if existing user has an accepted officer invitation
      if (
        acceptedInvitation &&
        userByEmail.role !== "Administrator" &&
        userByEmail.role !== acceptedInvitation.role
      ) {
        updateData.role = acceptedInvitation.role;
        updateData.position = acceptedInvitation.position;
        updateData.invitedBy = acceptedInvitation.invitedBy;
        updateData.inviteAccepted = Date.now();
      }

      await ctx.db.patch(userByEmail._id, updateData);
      return await ctx.db.get(userByEmail._id);
    }

    // Create new user
    // Determine role: sponsor domain takes precedence, then accepted invitation, then invite
    let userRole: "Member" | "General Officer" | "Executive Officer" | "Member at Large" | "Past Officer" | "Sponsor" | "Administrator" = "Member";
    let userPosition = undefined;
    let sponsorTier = undefined;
    let sponsorOrganization = undefined;
    let autoAssignedSponsor = false;

    if (sponsorDomainData) {
      // Auto-assign as sponsor based on domain
      userRole = "Sponsor";
      sponsorTier = sponsorDomainData.sponsorTier;
      sponsorOrganization = sponsorDomainData.organizationName;
      autoAssignedSponsor = true;
      console.log("Auto-assigning user as sponsor:", {
        tier: sponsorTier,
        organization: sponsorOrganization,
      });
    } else if (acceptedInvitation?.role) {
      // Use role from accepted officer invitation
      userRole = acceptedInvitation.role as any;
      userPosition = acceptedInvitation.position;
      console.log("Using role from accepted invitation:", {
        role: userRole,
        position: userPosition,
      });
    } else if (inviteData?.role) {
      // Use role from invite
      userRole = inviteData.role as any;
      userPosition = inviteData.position;
    }

    const id = await ctx.db.insert("users", {
      authUserId: identity.subject,
      email: identity.email!,
      emailVisibility: true,
      verified: true,
      name: identity.name || "",
      avatar: (identity.picture as string | null | undefined) || undefined,
      lastLogin: Date.now(),
      joinDate: Date.now(),
      notificationPreferences: {},
      displayPreferences: {},
      accessibilitySettings: {},
      signedUp: false,
      requestedEmail: false,
      role: userRole,
      status: "active",
      eventsAttended: 0,
      points: 0,
      signInMethod: signInMethod || "google", // Default to google for OAuth
      ...(userPosition && { position: userPosition }),
      ...(sponsorTier && { sponsorTier }),
      ...(sponsorOrganization && { sponsorOrganization }),
      ...(autoAssignedSponsor && { autoAssignedSponsor }),
      ...(inviteData && { invitedBy: inviteData.createdBy || "system" }),
      ...(inviteData && { inviteAccepted: Date.now() }),
    });

    console.log("Creating user with data:", {
      role: userRole,
      position: userPosition,
      sponsorTier,
      sponsorOrganization,
    });

    return await ctx.db.get(id);
  },
});

// Server mutation to check officer role from session
export const checkOfficerRoleFromSession = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.subject) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user) {
      return false;
    }

    const officerRoles = [
      "General Officer",
      "Executive Officer",
      "Member at Large",
      "Past Officer",
      "Administrator",
    ];

    return officerRoles.includes(user.role);
  },
});

// Get user by email (for migration purposes)

// Get user by email (for migration purposes)
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return user;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    authUserId: v.string(),
    name: v.string(),
    pid: v.optional(v.string()),
    major: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    memberId: v.optional(v.string()),
    zelleInformation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update user document
    const updateData: any = {
      name: args.name,
      lastUpdated: Date.now(),
    };

    if (args.pid !== undefined) updateData.pid = args.pid;
    if (args.major !== undefined) updateData.major = args.major;
    if (args.graduationYear !== undefined) updateData.graduationYear = args.graduationYear;
    if (args.memberId !== undefined) updateData.memberId = args.memberId;
    if (args.zelleInformation !== undefined) updateData.zelleInformation = args.zelleInformation;

    await ctx.db.patch(user._id, updateData);

    // Sync to public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const publicProfileData: any = {
      name: args.name,
      position: user.role,
    };

    if (args.major !== undefined) publicProfileData.major = args.major;
    if (args.graduationYear !== undefined) publicProfileData.graduationYear = args.graduationYear;

    if (publicProfile) {
      await ctx.db.patch(publicProfile._id, publicProfileData);
    } else {
      await ctx.db.insert("publicProfiles", {
        userId: user._id,
        name: args.name,
        points: user.points || 0,
        totalEventsAttended: user.eventsAttended || 0,
        major: args.major || "",
      });
    }

    return await ctx.db.get(user._id);
  },
});

// Complete user onboarding (get-started flow)
export const completeOnboarding = mutation({
  args: {
    authUserId: v.string(),
    pid: v.string(),
    major: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    memberId: v.optional(v.string()),
    zelleInformation: v.optional(v.string()),
    resume: v.optional(v.id("_storage")),
    navigationLayout: v.union(v.literal("horizontal"), v.literal("sidebar")),
    tosAcceptedAt: v.number(),
    tosVersion: v.string(),
    privacyPolicyAcceptedAt: v.number(),
    privacyPolicyVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      pid: args.pid,
      signedUp: true,
      joinDate: Date.now(),
      navigationLayout: args.navigationLayout,
      tosAcceptedAt: args.tosAcceptedAt,
      tosVersion: args.tosVersion,
      privacyPolicyAcceptedAt: args.privacyPolicyAcceptedAt,
      privacyPolicyVersion: args.privacyPolicyVersion,
      lastUpdated: Date.now(),
    };

    if (args.major !== undefined) updateData.major = args.major;
    if (args.graduationYear !== undefined) updateData.graduationYear = args.graduationYear;
    if (args.memberId !== undefined) updateData.memberId = args.memberId;
    if (args.zelleInformation !== undefined) updateData.zelleInformation = args.zelleInformation;
    if (args.resume !== undefined) updateData.resume = args.resume;

    await ctx.db.patch(user._id, updateData);

    // Sync to public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const publicProfileData: any = {
      name: user.name,
      points: user.points || 0,
      totalEventsAttended: user.eventsAttended || 0,
    };

    if (args.major !== undefined) publicProfileData.major = args.major;
    if (args.graduationYear !== undefined) publicProfileData.graduationYear = args.graduationYear;

    if (publicProfile) {
      await ctx.db.patch(publicProfile._id, publicProfileData);
    } else {
      await ctx.db.insert("publicProfiles", publicProfileData);
    }

    return await ctx.db.get(user._id);
  },
});

// Update user resume storage ID
export const updateResume = mutation({
  args: {
    authUserId: v.string(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      resume: args.storageId,
      lastUpdated: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

// Update user IEEE email (for Slack access)
export const updateIEEEEmail = mutation({
  args: {
    userId: v.string(),
    hasIEEEEmail: v.boolean(),
    ieeeEmail: v.string(),
    ieeeEmailCreatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      hasIEEEEmail: args.hasIEEEEmail,
      ieeeEmail: args.ieeeEmail,
      ieeeEmailCreatedAt: args.ieeeEmailCreatedAt,
      lastUpdated: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});

// Get user by authUserId (alias for getUserByAuthUserId for consistency)
export const getUserByAuthId = query({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    return user;
  },
});

// Get user profile by userId
export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.userId))
      .first();
    
    if (!user) {
      return null;
    }

    return user;
  },
});

// Get all public profiles (for leaderboard)
export const getPublicProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("publicProfiles").collect();
    return profiles;
  },
});

// Get all users (for admin functions)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users;
  },
});

// Update user stats (for testing)
export const updateUserStats = mutation({
  args: {
    userId: v.string(),
    points: v.number(),
    eventsAttended: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      points: args.points,
      eventsAttended: args.eventsAttended,
      lastUpdated: Date.now(),
    });

    // Update public profile as well
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (publicProfile) {
      await ctx.db.patch(publicProfile._id, {
        points: args.points,
        totalEventsAttended: args.eventsAttended,
      });
    }

    return await ctx.db.get(user._id);
  },
});

export const acceptPolicies = mutation({
  args: {
    tosVersion: v.optional(v.string()),
    privacyPolicyVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const updateData: any = {
      lastUpdated: Date.now(),
      lastUpdatedBy: identity.subject,
    };

    if (args.tosVersion) {
      updateData.tosAcceptedAt = Date.now();
      updateData.tosVersion = args.tosVersion;
    }

    if (args.privacyPolicyVersion) {
      updateData.privacyPolicyAcceptedAt = Date.now();
      updateData.privacyPolicyVersion = args.privacyPolicyVersion;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, updateData);
    return { success: true };
  },
});

// Delete user mutation (for admin use)
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify the deleter has admin privileges
    const deleter = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.deletedBy))
      .first();

    if (!deleter || (deleter.role !== "Administrator" && deleter.role !== "Executive Officer")) {
      throw new Error("Unauthorized: Only Administrators and Executive Officers can delete users");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Cascade delete related records
    // Delete notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user.authUserId))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Delete public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (publicProfile) {
      await ctx.db.delete(publicProfile._id);
    }

    // Delete event attendees
    const eventAttendees = await ctx.db
      .query("eventAttendees")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", user.authUserId))
      .collect();
    for (const attendee of eventAttendees) {
      await ctx.db.delete(attendee._id);
    }

    // Delete Google group assignments
    const googleGroupAssignments = await ctx.db
      .query("googleGroupAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", user.authUserId))
      .collect();
    for (const assignment of googleGroupAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete direct onboardings
    const directOnboardings = await ctx.db
      .query("directOnboardings")
      .withIndex("by_userId", (q) => q.eq("userId", user.authUserId))
      .collect();
    for (const onboarding of directOnboardings) {
      await ctx.db.delete(onboarding._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);

    return { success: true };
  },
});

// Get users by role query
export const getUsersByRole = query({
  args: {
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity || !identity.subject) {
      return [];
    }

    // Check if user has admin privileges
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (user.role !== "Administrator" && user.role !== "Executive Officer")) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();

    return users;
  },
});

// Get user names by authUserIds (for displaying names in lists)
export const getUserNamesByAuthUserIds = query({
  args: {
    authUserIds: v.array(v.string()),
  },
  handler: async (ctx, { authUserIds }) => {
    const userNames: Record<string, string> = {};
    
    for (const authUserId of authUserIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
        .first();
      
      if (user) {
        userNames[authUserId] = user.name;
      }
    }
    
    return userNames;
  },
});
