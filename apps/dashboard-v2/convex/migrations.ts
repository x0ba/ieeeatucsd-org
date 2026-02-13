import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration-only mutations. These are public so ConvexHttpClient can call them.
// Safe on self-hosted Convex where ctx.auth is not enforced.
// Remove this file after migration is complete.

export const upsertUser = mutation({
  args: {
    email: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("users", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertEvent = mutation({
  args: {
    eventCode: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("events", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertAttendee = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attendees")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("attendees", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertEventRequest = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Dedup by name + requestedUser + startDateTime
    const all = await ctx.db
      .query("eventRequests")
      .withIndex("by_requestedUser", (q) =>
        q.eq("requestedUser", args.data.requestedUser),
      )
      .collect();

    const existing = all.find(
      (r) =>
        r.name === args.data.name &&
        r.startDateTime === args.data.startDateTime,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("eventRequests", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertReimbursement = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("reimbursements")
      .withIndex("by_submittedBy", (q) =>
        q.eq("submittedBy", args.data.submittedBy),
      )
      .collect();

    const existing = all.find(
      (r) =>
        r.title === args.data.title &&
        r.totalAmount === args.data.totalAmount,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("reimbursements", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertFundRequest = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("fundRequests")
      .withIndex("by_requestedBy", (q) =>
        q.eq("requestedBy", args.data.requestedBy),
      )
      .collect();

    const existing = all.find(
      (r) =>
        r.title === args.data.title &&
        r.amount === args.data.amount,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("fundRequests", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertFundDeposit = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("fundDeposits")
      .withIndex("by_depositedBy", (q) =>
        q.eq("depositedBy", args.data.depositedBy),
      )
      .collect();

    const existing = all.find(
      (r) =>
        r.depositDate === args.data.depositDate &&
        r.amount === args.data.amount,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("fundDeposits", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertLink = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("links").collect();
    const existing = all.find(
      (r) => r.url === args.data.url && r.title === args.data.title,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("links", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertConstitution = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("constitutions").collect();
    const existing = all.find(
      (r) =>
        r.title === args.data.title &&
        r.organizationName === args.data.organizationName,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("constitutions", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertConstitutionAuditLog = mutation({
  args: {
    constitutionId: v.id("constitutions"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("constitutionAuditLogs")
      .withIndex("by_constitutionId", (q) =>
        q.eq("constitutionId", args.constitutionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("constitutionAuditLogs", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertOfficerInvitation = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("officerInvitations")
      .withIndex("by_email", (q) => q.eq("email", args.data.email))
      .collect();

    const existing = all.find(
      (r) => r.invitedAt === args.data.invitedAt,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("officerInvitations", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertSponsorDomain = mutation({
  args: {
    domain: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sponsorDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("sponsorDomains", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertOrgSettings = mutation({
  args: {
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("organizationSettings").first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("organizationSettings", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertNotification = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.data.userId))
      .collect();

    const existing = all.find(
      (r) => r.title === args.data.title && r.message === args.data.message,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("notifications", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertGoogleGroupAssignment = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("googleGroupAssignments")
      .withIndex("by_email", (q) => q.eq("email", args.data.email))
      .collect();

    const existing = all.find(
      (r) =>
        r.googleGroup === args.data.googleGroup &&
        r.assignedAt === args.data.assignedAt,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("googleGroupAssignments", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertDirectOnboarding = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("directOnboardings")
      .withIndex("by_email", (q) => q.eq("email", args.data.email))
      .collect();

    const existing = all.find(
      (r) => r.onboardedAt === args.data.onboardedAt,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("directOnboardings", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertInvite = mutation({
  args: {
    dedupKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("invites")
      .withIndex("by_email", (q) => q.eq("email", args.data.email))
      .collect();

    const existing = all.find(
      (r) => r.invitedAt === args.data.invitedAt,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("invites", args.data);
    return { id, action: "inserted" as const };
  },
});

export const upsertPublicProfile = mutation({
  args: {
    userId: v.id("users"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("publicProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("publicProfiles", args.data);
    return { id, action: "inserted" as const };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateDocumentField = mutation({
  args: {
    table: v.string(),
    docId: v.string(),
    field: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const update: Record<string, unknown> = {};
    update[args.field] = args.value;
    await ctx.db.patch(args.docId as any, update);
  },
});

export const clearTable = mutation({
  args: { table: v.string() },
  handler: async (ctx, args) => {
    const tableName = args.table as any;
    const docs = await ctx.db.query(tableName).collect();
    for (const doc of docs) {
      await ctx.db.delete(doc._id);
    }
    // Also clear storage files if requested
    if (args.table === "_storage") {
      // Storage is handled separately via ctx.storage
      return { deleted: 0, table: args.table };
    }
    return { deleted: docs.length, table: args.table };
  },
});

export const clearStorage = mutation({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.system.query("_storage").collect();
    for (const file of files) {
      await ctx.storage.delete(file._id);
    }
    return { deleted: files.length };
  },
});

export const deduplicateUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const seen = new Map<string, string>();
    let deleted = 0;

    for (const user of allUsers) {
      const key = user.email;
      if (seen.has(key)) {
        // Keep the first one, delete this duplicate
        await ctx.db.delete(user._id);
        deleted++;
      } else {
        seen.set(key, user._id);
      }
    }

    return { deleted, total: allUsers.length };
  },
});

export const getUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getEventByCode = mutation({
  args: { eventCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_eventCode", (q) => q.eq("eventCode", args.eventCode))
      .first();
  },
});
