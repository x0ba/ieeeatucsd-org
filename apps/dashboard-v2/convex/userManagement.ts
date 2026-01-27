import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

type UserRole =
  | "Member"
  | "General Officer"
  | "Executive Officer"
  | "Member at Large"
  | "Past Officer"
  | "Sponsor"
  | "Administrator";

// Get all users (for management)
export const getAllUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_role")
      .collect();

    return users.map((user) => ({
      ...user,
      id: user._id,
    }));
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) return null;

    return {
      ...user,
      id: user._id,
    };
  },
});

// Get user by auth ID
export const getUserByAuthId = query({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) return null;

    return {
      ...user,
      id: user._id,
    };
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
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
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
    pid: v.optional(v.string()),
    memberId: v.optional(v.string()),
    major: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    team: v.optional(
      v.union(v.literal("Internal"), v.literal("Events"), v.literal("Projects")),
    ),
    points: v.optional(v.number()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      name: args.name,
      role: args.role,
      position: args.position,
      status: args.status,
      pid: args.pid,
      memberId: args.memberId,
      major: args.major,
      graduationYear: args.graduationYear,
      team: args.team,
      lastUpdated: Date.now(),
      lastUpdatedBy: args.updatedBy,
    };

    if (args.points !== undefined) updateData.points = args.points;

    await ctx.db.patch(user._id, updateData);

    // Sync to public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const publicProfileData: any = {
      name: args.name,
    };

    if (args.major) publicProfileData.major = args.major;
    if (args.graduationYear) publicProfileData.graduationYear = args.graduationYear;
    if (args.points !== undefined) publicProfileData.points = args.points;

    if (publicProfile) {
      await ctx.db.patch(publicProfile._id, publicProfileData);
    } else {
      await ctx.db.insert("publicProfiles", {
        userId: user._id,
        name: args.name,
        major: args.major || "",
        points: args.points || 0,
        totalEventsAttended: (user as any).eventsAttended || 0,
      });
    }

    return await ctx.db.get(user._id);
  },
});

// Update IEEE email status
export const updateIEEEEmailStatus = mutation({
  args: {
    userId: v.string(),
    hasIEEEEmail: v.optional(v.boolean()),
    ieeeEmail: v.optional(v.string()),
    ieeeEmailCreatedAt: v.optional(v.number()),
    ieeeEmailStatus: v.optional(
      v.union(v.literal("active"), v.literal("disabled")),
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("User not found");
    }

    const updateData: any = {
      lastUpdated: Date.now(),
      lastUpdatedBy: args.updatedBy,
    };

    if (args.hasIEEEEmail !== undefined) updateData.hasIEEEEmail = args.hasIEEEEmail;
    if (args.ieeeEmail !== undefined) updateData.ieeeEmail = args.ieeeEmail;
    if (args.ieeeEmailCreatedAt !== undefined)
      updateData.ieeeEmailCreatedAt = args.ieeeEmailCreatedAt;
    if (args.ieeeEmailStatus !== undefined)
      updateData.ieeeEmailStatus = args.ieeeEmailStatus;

    await ctx.db.patch(user._id, updateData);

    return await ctx.db.get(user._id);
  },
});

// Delete user
export const deleteUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("User not found");
    }

    // Delete public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (publicProfile) {
      await ctx.db.delete(publicProfile._id);
    }

    // Delete user
    await ctx.db.delete(user._id);

    return { success: true };
  },
});

// Create invite
export const createInvite = mutation({
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
    position: v.optional(v.string()),
    message: v.optional(v.string()),
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteId = await ctx.db.insert("invites", {
      email: args.email,
      role: args.role,
      position: args.position,
      createdBy: args.invitedBy,
      createdAt: Date.now(),
      status: "pending",
    });

    return { inviteId };
  },
});

// Add existing member (promote to officer)
export const addExistingMember = mutation({
  args: {
    userId: v.string(),
    newRole: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    newPosition: v.string(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new Error("User not found");
    }

    const userData = user as any;

    const updateData: any = {
      role: args.newRole,
      position: args.newPosition,
      lastUpdated: Date.now(),
      lastUpdatedBy: args.updatedBy,
    };

    if (userData.status === "inactive") updateData.status = "active";

    await ctx.db.patch(user._id, updateData);

    // Sync to public profile
    const publicProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (publicProfile) {
      await ctx.db.patch(publicProfile._id, {
        name: userData.name,
      });
    } else {
      await ctx.db.insert("publicProfiles", {
        userId: user._id,
        name: userData.name,
        major: userData.major || "",
        points: userData.points || 0,
        totalEventsAttended: userData.eventsAttended || 0,
      });
    }

    return await ctx.db.get(user._id);
  },
});

// Get sponsor domains
export const getSponsorDomains = query({
  handler: async (ctx) => {
    const domains = await ctx.db.query("sponsorDomains").collect();
    return domains;
  },
});

// Create sponsor domain
export const createSponsorDomain = mutation({
  args: {
    domain: v.string(),
    organizationName: v.string(),
    sponsorTier: v.union(
      v.literal("Bronze"),
      v.literal("Silver"),
      v.literal("Gold"),
      v.literal("Platinum"),
      v.literal("Diamond"),
    ),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const domainId = await ctx.db.insert("sponsorDomains", {
      domain: args.domain,
      organizationName: args.organizationName,
      sponsorTier: args.sponsorTier,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    return { domainId };
  },
});

// Update sponsor domain
export const updateSponsorDomain = mutation({
  args: {
    domainId: v.string(),
    organizationName: v.string(),
    sponsorTier: v.union(
      v.literal("Bronze"),
      v.literal("Silver"),
      v.literal("Gold"),
      v.literal("Platinum"),
      v.literal("Diamond"),
    ),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId as any);
    if (!domain) {
      throw new Error("Sponsor domain not found");
    }

    await ctx.db.patch(domain._id, {
      organizationName: args.organizationName,
      sponsorTier: args.sponsorTier,
      lastModified: Date.now(),
      lastModifiedBy: args.updatedBy,
    });

    return await ctx.db.get(domain._id);
  },
});

// Delete sponsor domain
export const deleteSponsorDomain = mutation({
  args: { domainId: v.string() },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId as any);
    if (!domain) {
      throw new Error("Sponsor domain not found");
    }

    await ctx.db.delete(domain._id);

    return { success: true };
  },
});
