import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ==================== LINKS ====================

// Get all links
export const getLinks = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query("links").order("desc").collect();
    return links;
  },
});

// Get links by category
export const getLinksByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const links = await ctx.db
      .query("links")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
    return links;
  },
});

// Create a link
export const createLink = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    shortUrl: v.optional(v.string()),
    publishDate: v.optional(v.number()),
    expireDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const linkId = await ctx.db.insert("links", {
      ...args,
      createdAt: Date.now(),
      createdBy: identity.subject,
    });

    return await ctx.db.get(linkId);
  },
});

// Update a link
export const updateLink = mutation({
  args: {
    linkId: v.id("links"),
    updates: v.object({
      url: v.optional(v.string()),
      title: v.optional(v.string()),
      category: v.optional(v.string()),
      description: v.optional(v.string()),
      iconUrl: v.optional(v.string()),
      shortUrl: v.optional(v.string()),
      publishDate: v.optional(v.number()),
      expireDate: v.optional(v.number()),
      order: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { linkId, updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    // Check if user is the creator or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      link.createdBy !== identity.subject &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to update this link");
    }

    await ctx.db.patch(linkId, {
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: identity.subject,
    });

    return await ctx.db.get(linkId);
  },
});

// Delete a link
export const deleteLink = mutation({
  args: { linkId: v.id("links") },
  handler: async (ctx, { linkId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(linkId);
    if (!link) {
      throw new Error("Link not found");
    }

    // Check if user is the creator or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      link.createdBy !== identity.subject &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to delete this link");
    }

    await ctx.db.delete(linkId);
    return { success: true };
  },
});

// ==================== NOTIFICATIONS ====================

// Get notifications for a user
export const getUserNotifications = query({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .order("desc")
      .collect();
    return notifications;
  },
});

// Get unread notifications for a user
export const getUnreadNotifications = query({
  args: { authUserId: v.string() },
  handler: async (ctx, { authUserId }) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", authUserId).eq("read", false))
      .order("desc")
      .collect();
    return notifications;
  },
});

// Mark notification as read
export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== identity.subject) {
      throw new Error("Not authorized to update this notification");
    }

    await ctx.db.patch(notificationId, { read: true });
    return await ctx.db.get(notificationId);
  },
});

// Mark all notifications as read for a user
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    for (const notification of notifications) {
      if (!notification.read) {
        await ctx.db.patch(notification._id, { read: true });
      }
    }

    return { success: true };
  },
});

// Create a notification
export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.record(v.string(), v.any())),
    expiresAt: v.optional(v.number()),
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
      throw new Error("Not authorized to create notifications");
    }

    const notificationId = await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });

    return await ctx.db.get(notificationId);
  },
});

// ==================== PUBLIC PROFILES ====================

// Get public profiles (for leaderboard)
export const getPublicProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("publicProfiles")
      .withIndex("by_points", (q) => q)
      .order("desc")
      .take(500);
    return profiles;
  },
});

// Update public profile
export const updatePublicProfile = mutation({
  args: {
    updates: v.object({
      name: v.optional(v.string()),
      major: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const existingProfile = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!existingProfile) {
      throw new Error("Public profile not found");
    }

    await ctx.db.patch(existingProfile._id, args.updates);
    return await ctx.db.get(existingProfile._id);
  },
});

// ==================== CONSTITUTIONS ====================

// Get all constitutions
export const getConstitutions = query({
  args: {},
  handler: async (ctx) => {
    const constitutions = await ctx.db.query("constitutions").order("desc").collect();
    return constitutions;
  },
});

// Get constitutions by status
export const getConstitutionsByStatus = query({
  args: { status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")) },
  handler: async (ctx, { status }) => {
    const constitutions = await ctx.db
      .query("constitutions")
      .withIndex("by_status", (q) => q.eq("status", status))
      .order("desc")
      .collect();
    return constitutions;
  },
});

// Create a constitution
export const createConstitution = mutation({
  args: {
    title: v.string(),
    organizationName: v.string(),
    version: v.number(),
    isTemplate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const id = crypto.randomUUID();
    const constitutionId = await ctx.db.insert("constitutions", {
      id,
      ...args,
      status: "draft",
      createdAt: Date.now(),
      lastModified: Date.now(),
      lastModifiedBy: identity.subject,
      collaborators: [identity.subject],
    });

    return await ctx.db.get(constitutionId);
  },
});

// Update a constitution
export const updateConstitution = mutation({
  args: {
    constitutionId: v.id("constitutions"),
    updates: v.object({
      title: v.optional(v.string()),
      organizationName: v.optional(v.string()),
      version: v.optional(v.number()),
      status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
      collaborators: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { constitutionId, updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const constitution = await ctx.db.get(constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    // Check if user is a collaborator or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      !constitution.collaborators.includes(identity.subject) &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to update this constitution");
    }

    await ctx.db.patch(constitutionId, {
      ...updates,
      lastModified: Date.now(),
      lastModifiedBy: identity.subject,
    });

    return await ctx.db.get(constitutionId);
  },
});

// Delete a constitution
export const deleteConstitution = mutation({
  args: { constitutionId: v.id("constitutions") },
  handler: async (ctx, { constitutionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    const constitution = await ctx.db.get(constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    // Check if user is a collaborator or has officer/admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (
      !constitution.collaborators.includes(identity.subject) &&
      !user?.role?.includes("Officer") &&
      user?.role !== "Administrator"
    ) {
      throw new Error("Not authorized to delete this constitution");
    }

    await ctx.db.delete(constitutionId);
    return { success: true };
  },
});
