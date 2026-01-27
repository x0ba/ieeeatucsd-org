import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const domains = await ctx.db.query("sponsorDomains").order("desc").collect();
    return domains.map((d) => ({
      _id: d._id,
      domain: d.domain,
      organizationName: d.organizationName,
      sponsorTier: d.sponsorTier,
      createdAt: d.createdAt,
      createdBy: d.createdBy,
      lastModified: d.lastModified,
      lastModifiedBy: d.lastModifiedBy,
    }));
  },
});

export const create = mutation({
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
  },
  handler: async (ctx, args) => {
    const identityData = await ctx.auth.getUserIdentity();
    const identity = identityData?.subject;
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check for duplicate domain
    const existing = await ctx.db
      .query("sponsorDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("This domain already exists");
    }

    const domainId = await ctx.db.insert("sponsorDomains", {
      domain: args.domain.toLowerCase(),
      organizationName: args.organizationName,
      sponsorTier: args.sponsorTier,
      createdAt: Date.now(),
      createdBy: identity,
    });

    return domainId;
  },
});

export const update = mutation({
  args: {
    id: v.id("sponsorDomains"),
    domain: v.string(),
    organizationName: v.string(),
    sponsorTier: v.union(
      v.literal("Bronze"),
      v.literal("Silver"),
      v.literal("Gold"),
      v.literal("Platinum"),
      v.literal("Diamond"),
    ),
  },
  handler: async (ctx, args) => {
    const identityData = await ctx.auth.getUserIdentity();
    const identity = identityData?.subject;
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Check for duplicate domain (excluding current)
    const existing = await ctx.db
      .query("sponsorDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain.toLowerCase()))
      .first();

    if (existing && existing._id !== args.id) {
      throw new Error("This domain already exists");
    }

    await ctx.db.patch(args.id, {
      domain: args.domain.toLowerCase(),
      organizationName: args.organizationName,
      sponsorTier: args.sponsorTier,
      lastModified: Date.now(),
      lastModifiedBy: identity,
    });

    return args.id;
  },
});

export const remove = mutation({
  args: {
    id: v.id("sponsorDomains"),
  },
  handler: async (ctx, args) => {
    const identityData = await ctx.auth.getUserIdentity();
    const identity = identityData?.subject;
    if (!identity) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
