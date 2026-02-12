import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess, requireOfficerAccess } from "./permissions";

const constitutionSectionType = v.union(
  v.literal("preamble"),
  v.literal("article"),
  v.literal("section"),
  v.literal("subsection"),
  v.literal("amendment"),
);

export const list = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    return await ctx.db.query("constitutions").collect();
  },
});

export const get = query({
  args: { id: v.id("constitutions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("constitutions")
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();
  },
});

export const getPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("constitutions")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .first();
  },
});

export const getSections = query({
  args: { constitutionId: v.id("constitutions") },
  handler: async (ctx, args) => {
    const constitution = await ctx.db.get(args.constitutionId);
    if (!constitution) return [];
    return constitution.sections || [];
  },
});

export const create = mutation({
  args: {
    logtoId: v.string(),
    title: v.string(),
    organizationName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminAccess(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";

    return await ctx.db.insert("constitutions", {
      title: args.title,
      organizationName: args.organizationName,
      sections: [],
      version: 1,
      status: "draft",
      lastModifiedBy: userId,
      collaborators: [userId],
      isTemplate: false,
    });
  },
});

export const update = mutation({
  args: {
    logtoId: v.string(),
    id: v.id("constitutions"),
    title: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    sections: v.optional(v.any()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAdminAccess(ctx, args.logtoId);
    const userId = user.logtoId ?? user.authUserId ?? "";
    const { id, logtoId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {
      lastModifiedBy: userId,
    };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

// Section operations
export const addSection = mutation({
  args: {
    logtoId: v.string(),
    constitutionId: v.id("constitutions"),
    type: constitutionSectionType,
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    parentId: v.optional(v.string()),
    articleNumber: v.optional(v.number()),
    sectionNumber: v.optional(v.number()),
    subsectionLetter: v.optional(v.string()),
    amendmentNumber: v.optional(v.number()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    const user = await ctx.auth.getUserIdentity();
    const userId = user?.subject || args.logtoId;

    const constitution = await ctx.db.get(args.constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    const section = {
      id: crypto.randomUUID(),
      type: args.type,
      title: args.title ?? "",
      content: args.content ?? "",
      order: args.order,
      parentId: args.parentId,
      articleNumber: args.articleNumber,
      sectionNumber: args.sectionNumber,
      subsectionLetter: args.subsectionLetter,
      amendmentNumber: args.amendmentNumber,
      createdAt: Date.now(),
      lastModified: Date.now(),
      lastModifiedBy: userId,
    };

    const updatedSections = [...(constitution.sections || []), section];

    // Create audit entry
    await createAuditEntryInternal(ctx, {
      constitutionId: args.constitutionId,
      sectionId: section.id,
      changeType: "create",
      changeDescription: `Created ${section.type}: ${section.title || "Untitled"}`,
      afterValue: section,
      userId,
      userName: user?.name || user?.email || "Unknown User",
    });

    await ctx.db.patch(args.constitutionId, { sections: updatedSections });
    return section;
  },
});

export const updateSection = mutation({
  args: {
    logtoId: v.string(),
    constitutionId: v.id("constitutions"),
    sectionId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    order: v.optional(v.number()),
    parentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    const user = await ctx.auth.getUserIdentity();
    const userId = user?.subject || args.logtoId;

    const constitution = await ctx.db.get(args.constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    const section = constitution.sections?.find((s: any) => s.id === args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const cleanUpdates: Record<string, unknown> = {};
    if (args.title !== undefined) cleanUpdates.title = args.title;
    if (args.content !== undefined) cleanUpdates.content = args.content;
    if (args.order !== undefined) cleanUpdates.order = args.order;
    if (args.parentId !== undefined) cleanUpdates.parentId = args.parentId;

    const updatedSection = {
      ...section,
      ...cleanUpdates,
      lastModified: Date.now(),
      lastModifiedBy: userId,
    };

    const updatedSections = constitution.sections?.map((s: any) =>
      s.id === args.sectionId ? updatedSection : s
    );

    // Create audit entry
    await createAuditEntryInternal(ctx, {
      constitutionId: args.constitutionId,
      sectionId: args.sectionId,
      changeType: "update",
      changeDescription: `Updated ${section.type}: ${section.title || "Untitled"}`,
      beforeValue: section,
      afterValue: updatedSection,
      userId,
      userName: user?.name || user?.email || "Unknown User",
    });

    await ctx.db.patch(args.constitutionId, { sections: updatedSections });
    return updatedSection;
  },
});

export const deleteSection = mutation({
  args: {
    logtoId: v.string(),
    constitutionId: v.id("constitutions"),
    sectionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    const user = await ctx.auth.getUserIdentity();
    const userId = user?.subject || args.logtoId;

    const constitution = await ctx.db.get(args.constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    const section = constitution.sections?.find((s: any) => s.id === args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const updatedSections = constitution.sections?.filter((s: any) => s.id !== args.sectionId);

    // Create audit entry
    await createAuditEntryInternal(ctx, {
      constitutionId: args.constitutionId,
      sectionId: args.sectionId,
      changeType: "delete",
      changeDescription: `Deleted ${section.type}: ${section.title || "Untitled"}`,
      beforeValue: section,
      userId,
      userName: user?.name || user?.email || "Unknown User",
    });

    await ctx.db.patch(args.constitutionId, { sections: updatedSections });

    // Also delete child sections recursively
    if (updatedSections) {
      const sectionIdsToDelete = new Set([args.sectionId]);
      let foundNew = true;
      while (foundNew) {
        foundNew = false;
        for (const s of updatedSections) {
          if (s.parentId && sectionIdsToDelete.has(s.parentId) && !sectionIdsToDelete.has(s.id)) {
            sectionIdsToDelete.add(s.id);
            foundNew = true;
          }
        }
      }

      const finalSections = updatedSections.filter((s: any) => !sectionIdsToDelete.has(s.id));
      await ctx.db.patch(args.constitutionId, { sections: finalSections });
    }

    return { success: true };
  },
});

export const reorderSection = mutation({
  args: {
    logtoId: v.string(),
    constitutionId: v.id("constitutions"),
    sectionId: v.string(),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    const user = await ctx.auth.getUserIdentity();
    const userId = user?.subject || args.logtoId;

    const constitution = await ctx.db.get(args.constitutionId);
    if (!constitution) {
      throw new Error("Constitution not found");
    }

    const section = constitution.sections?.find((s: any) => s.id === args.sectionId);
    if (!section) {
      throw new Error("Section not found");
    }

    const updatedSections = constitution.sections?.map((s: any) => {
      if (s.id === args.sectionId) {
        return { ...s, order: args.newOrder, lastModified: Date.now(), lastModifiedBy: userId };
      }
      return s;
    });

    await ctx.db.patch(args.constitutionId, { sections: updatedSections });

    // Create audit entry
    await createAuditEntryInternal(ctx, {
      constitutionId: args.constitutionId,
      sectionId: args.sectionId,
      changeType: "reorder",
      changeDescription: `Reordered ${section.type}: ${section.title || "Untitled"}`,
      beforeValue: section,
      afterValue: { ...section, order: args.newOrder },
      userId,
      userName: user?.name || user?.email || "Unknown User",
    });

    return { success: true };
  },
});

// Audit log operations
async function createAuditEntryInternal(
  ctx: any,
  args: {
    constitutionId: any;
    sectionId?: string;
    changeType: "create" | "update" | "delete" | "reorder";
    changeDescription: string;
    beforeValue?: any;
    afterValue?: any;
    userId: string;
    userName: string;
  },
) {
  const auditLog = await ctx.db
    .query("constitutionAuditLogs")
    .withIndex("by_constitutionId", (q: any) => q.eq("constitutionId", args.constitutionId))
    .first();

  const entry = {
    id: crypto.randomUUID(),
    constitutionId: args.constitutionId._id,
    sectionId: args.sectionId,
    changeType: args.changeType,
    changeDescription: args.changeDescription,
    beforeValue: args.beforeValue,
    afterValue: args.afterValue,
    userId: args.userId,
    userName: args.userName,
    timestamp: Date.now(),
    ipAddress: "Not tracked",
    userAgent: "Browser",
  };

  if (auditLog) {
    await ctx.db.patch(auditLog._id, {
      entries: [entry, ...(auditLog.entries || [])],
      totalEntries: (auditLog.totalEntries || 0) + 1,
    });
  } else {
    await ctx.db.insert("constitutionAuditLogs", {
      constitutionId: args.constitutionId,
      entries: [entry],
      totalEntries: 1,
    });
  }
}

export const getAuditLog = query({
  args: { constitutionId: v.id("constitutions") },
  handler: async (ctx, args) => {
    const auditLog = await ctx.db
      .query("constitutionAuditLogs")
      .withIndex("by_constitutionId", (q: any) => q.eq("constitutionId", args.constitutionId))
      .first();
    return auditLog?.entries || [];
  },
});

// Get default constitution
export const getDefault = query({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireOfficerAccess(ctx, args.logtoId);
    
    return await ctx.db
      .query("constitutions")
      .filter((q) => q.eq(q.field("title"), "IEEE at UC San Diego Constitution"))
      .first();
  },
});

// Ensure default constitution exists
export const ensureDefaultConstitution = mutation({
  args: { logtoId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx, args.logtoId);
    
    const existing = await ctx.db
      .query("constitutions")
      .filter((q) => q.eq(q.field("title"), "IEEE at UC San Diego Constitution"))
      .first();

    if (existing) {
      return existing;
    }

    // Create default constitution
    const user = await ctx.auth.getUserIdentity();
    const userId = user?.subject || args.logtoId;

    return await ctx.db.insert("constitutions", {
      title: "IEEE at UC San Diego Constitution",
      organizationName: "IEEE at UC San Diego",
      sections: [],
      version: 1,
      status: "draft",
      lastModifiedBy: userId,
      collaborators: [userId],
      isTemplate: false,
    });
  },
});
