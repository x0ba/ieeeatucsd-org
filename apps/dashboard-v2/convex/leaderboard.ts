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
