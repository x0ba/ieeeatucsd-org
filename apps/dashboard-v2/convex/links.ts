import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query('links').order('desc').collect();

    return links.map(link => ({
      _id: link._id,
      url: link.url,
      title: link.title,
      category: link.category,
      description: link.description,
      iconUrl: link.iconUrl,
      shortUrl: link.shortUrl,
      publishDate: link.publishDate,
      expireDate: link.expireDate,
      createdAt: link.createdAt,
      createdBy: link.createdBy,
      lastModified: link.lastModified,
      lastModifiedBy: link.lastModifiedBy,
    }));
  },
});

export const create = mutation({
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
    const userId = identity?.subject;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const now = Date.now();
    const linkId = await ctx.db.insert('links', {
      url: args.url,
      title: args.title,
      category: args.category,
      description: args.description,
      iconUrl: args.iconUrl,
      shortUrl: args.shortUrl,
      publishDate: args.publishDate,
      expireDate: args.expireDate,
      createdAt: now,
      createdBy: userId,
      lastModified: now,
      lastModifiedBy: userId,
    });

    return linkId;
  },
});

export const update = mutation({
  args: {
    linkId: v.id('links'),
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
    const userId = identity?.subject;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error('Link not found');
    }

    const now = Date.now();
    const updateData: any = {
      url: args.url,
      title: args.title,
      category: args.category,
      lastModified: now,
      lastModifiedBy: userId,
    };

    // Only update optional fields if they are provided
    if (args.description !== undefined) updateData.description = args.description;
    if (args.iconUrl !== undefined) updateData.iconUrl = args.iconUrl;
    if (args.shortUrl !== undefined) updateData.shortUrl = args.shortUrl;
    if (args.publishDate !== undefined) updateData.publishDate = args.publishDate;
    if (args.expireDate !== undefined) updateData.expireDate = args.expireDate;

    await ctx.db.patch(args.linkId, updateData);
  },
});

export const remove = mutation({
  args: {
    linkId: v.id('links'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) {
      throw new Error('Not authenticated');
    }

    await ctx.db.delete(args.linkId);
  },
});
