import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get constitution by ID
export const getConstitution = query({
  args: {
    constitutionId: v.string(),
  },
  handler: async (ctx, args) => {
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const constitution = constitutions.find(c => c.id === args.constitutionId);
    return constitution;
  },
});

// Get all sections for a constitution
export const getSections = query({
  args: {
    constitutionId: v.string(),
  },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query("sections")
      .withIndex("by_constitutionId", (q) => q.eq("constitutionId", args.constitutionId))
      .order("asc")
      .collect();

    return sections;
  },
});

// Create or initialize constitution
export const initializeConstitution = mutation({
  args: {
    constitutionId: v.string(),
    title: v.string(),
    organizationName: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const existingConstitution = constitutions.find(c => c.id === args.constitutionId);

    if (existingConstitution) {
      return existingConstitution;
    }

    const now = Date.now();
    const constitutionId = await ctx.db.insert("constitutions", {
      id: args.constitutionId,
      title: args.title,
      organizationName: args.organizationName,
      version: 1,
      status: "draft",
      createdAt: now,
      lastModified: now,
      lastModifiedBy: args.createdBy,
      collaborators: [],
    });

    return await ctx.db.get(constitutionId);
  },
});

// Add section to constitution
export const addSection = mutation({
  args: {
    constitutionId: v.string(),
    type: v.union(v.literal("article"), v.literal("section"), v.literal("amendment")),
    title: v.string(),
    content: v.string(),
    order: v.number(),
    parentId: v.optional(v.string()),
    articleNumber: v.optional(v.number()),
    sectionNumber: v.optional(v.number()),
    amendmentNumber: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sectionId = await ctx.db.insert("sections", {
      constitutionId: args.constitutionId,
      type: args.type,
      title: args.title,
      content: args.content,
      order: args.order,
      parentId: args.parentId,
      articleNumber: args.articleNumber,
      sectionNumber: args.sectionNumber,
      amendmentNumber: args.amendmentNumber,
      createdAt: now,
      lastModified: now,
      lastModifiedBy: args.createdBy,
    });

    // Update constitution's lastModified time
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const constitution = constitutions.find(c => c.id === args.constitutionId);

    if (constitution) {
      await ctx.db.patch(constitution._id, {
        lastModified: now,
        lastModifiedBy: args.createdBy,
      });
    }

    return await ctx.db.get(sectionId);
  },
});

// Update section
export const updateSection = mutation({
  args: {
    sectionId: v.id("sections"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);

    if (!section) {
      throw new Error("Section not found");
    }

    const now = Date.now();
    const updateData: any = {
      lastModified: now,
      lastModifiedBy: args.updatedBy,
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.content !== undefined) updateData.content = args.content;

    await ctx.db.patch(args.sectionId, updateData);

    // Update constitution's lastModified time
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const constitution = constitutions.find(c => c.id === section.constitutionId);

    if (constitution) {
      await ctx.db.patch(constitution._id, {
        lastModified: now,
        lastModifiedBy: args.updatedBy,
      });
    }

    return await ctx.db.get(args.sectionId);
  },
});

// Delete section
export const deleteSection = mutation({
  args: {
    sectionId: v.id("sections"),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);

    if (!section) {
      throw new Error("Section not found");
    }

    await ctx.db.delete(args.sectionId);

    // Update constitution's lastModified time
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const constitution = constitutions.find(c => c.id === section.constitutionId);

    if (constitution) {
      const now = Date.now();
      await ctx.db.patch(constitution._id, {
        lastModified: now,
      });
    }

    return { success: true };
  },
});

// Update section order
export const updateSectionOrder = mutation({
  args: {
    sectionId: v.id("sections"),
    newOrder: v.number(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);

    if (!section) {
      throw new Error("Section not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.sectionId, {
      order: args.newOrder,
      lastModified: now,
      lastModifiedBy: args.updatedBy,
    });

    // Update constitution's lastModified time
    const constitutions = await ctx.db
      .query("constitutions")
      .collect();

    const constitution = constitutions.find(c => c.id === section.constitutionId);

    if (constitution) {
      await ctx.db.patch(constitution._id, {
        lastModified: now,
        lastModifiedBy: args.updatedBy,
      });
    }

    return await ctx.db.get(args.sectionId);
  },
});

// Get section by ID
export const getSection = query({
  args: {
    sectionId: v.id("sections"),
  },
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    return section;
  },
});

// Get all audit logs for a constitution
export const getAuditLogs = query({
  args: {
    constitutionId: v.string(),
  },
  handler: async (ctx, args) => {
    const auditLogs = await ctx.db
      .query("constitutionAuditLogs")
      .withIndex("by_constitutionId", (q) => q.eq("constitutionId", args.constitutionId))
      .order("desc")
      .collect();

    return auditLogs;
  },
});

// Create audit log entry
export const createAuditLog = mutation({
  args: {
    constitutionId: v.string(),
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    sectionId: v.string(),
    beforeState: v.optional(v.any()),
    afterState: v.optional(v.any()),
    performedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const auditLogId = await ctx.db.insert("constitutionAuditLogs", {
      constitutionId: args.constitutionId,
      action: args.action,
      sectionId: args.sectionId,
      beforeState: args.beforeState,
      afterState: args.afterState,
      performedBy: args.performedBy,
      timestamp: now,
    });

    return await ctx.db.get(auditLogId);
  },
});
