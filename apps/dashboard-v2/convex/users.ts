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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.email || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      });
      return existingUser;
    }

    const userByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (userByEmail) {
      await ctx.db.patch(userByEmail._id, {
        authUserId: identity.subject,
        lastLogin: Date.now(),
        lastUpdated: Date.now(),
      });
      return await ctx.db.get(userByEmail._id);
    } else {
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
        role: "Member",
        status: "active",
        eventsAttended: 0,
        points: 0,
      });
      return await ctx.db.get(id);
    }
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
