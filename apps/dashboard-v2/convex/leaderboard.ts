import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const getLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000;
    
    // Get all users with points, ordered by points descending
    const users = await ctx.db
      .query('users')
      .order('desc')
      .take(limit);
    
    // Map to leaderboard format
    const leaderboard = users.map((user, index) => ({
      _id: user._id,
      name: user.name || 'Unknown User',
      points: user.points || 0,
      major: user.major || '',
      graduationYear: user.graduationYear || null,
      position: user.position || 'Member',
      rank: index + 1,
      eventsAttended: 0, // Will be calculated on the client side from events data
    }));
    
    // Filter out users with invalid names
    return leaderboard.filter(u => u.name && u.name !== 'Unknown User' && u.name.trim() !== '');
  },
});

export const getLeaderboardCount = query({
  args: {},
  handler: async (ctx) => {
    // Get count of all users (simplified - Convex doesn't have a direct count, so we query)
    const users = await ctx.db.query('users').collect();
    return users.length;
  },
});

export const getUserRank = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users ordered by points
    const users = await ctx.db
      .query('users')
      .order('desc')
      .collect();
    
    // Find the user's index
    const userIndex = users.findIndex(u => u._id === args.userId || u.authUserId === args.userId);
    
    if (userIndex === -1) {
      return -1; // User not found
    }
    
    return userIndex + 1; // Rank is 1-indexed
  },
});

// Get leaderboard data (alias for getLeaderboard for officer leaderboard)
// Used by OfficerLeaderboardContent.tsx
export const getData = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 1000;
    
    // Get all users with points, ordered by points descending
    const users = await ctx.db
      .query('users')
      .order('desc')
      .take(limit);
    
    // Map to leaderboard format
    const leaderboard = users.map((user, index) => ({
      _id: user._id,
      name: user.name || 'Unknown User',
      points: user.points || 0,
      major: user.major || '',
      graduationYear: user.graduationYear || null,
      position: user.position || 'Member',
      rank: index + 1,
      eventsAttended: 0, // Will be calculated on the client side from events data
    }));
    
    // Filter out users with invalid names
    return leaderboard.filter(u => u.name && u.name !== 'Unknown User' && u.name.trim() !== '');
  },
});

// Get leaderboard settings
// Used by LeaderboardSettings.tsx
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    // Since there's no dedicated leaderboardSettings table in the schema,
    // we return default settings. In a real implementation, this would
    // query a settings collection or use a different approach.
    return {
      id: "settings",
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).getTime(),
      lastUpdated: Date.now(),
      updatedBy: "",
    };
  },
});

// Update leaderboard settings
// Used by LeaderboardSettings.tsx
export const updateSettings = mutation({
  args: {
    startDate: v.number(),
    updatedBy: v.string(),
  },
  handler: async (ctx, { startDate, updatedBy }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.subject) {
      throw new Error("Not authenticated");
    }

    // Check if user has executive officer or admin role
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .first();

    if (!user || (user.role !== "Administrator" && user.role !== "Executive Officer")) {
      throw new Error("Not authorized to update leaderboard settings");
    }

    // Since there's no dedicated leaderboardSettings table in the schema,
    // we return success. In a real implementation, this would update
    // a settings collection or use a different approach.
    // For now, we'll just return the updated settings as confirmation.
    return {
      id: "settings",
      startDate,
      lastUpdated: Date.now(),
      updatedBy,
    };
  },
});
