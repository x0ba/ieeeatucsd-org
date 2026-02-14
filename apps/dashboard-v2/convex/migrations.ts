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
    // Dedup by eventName + requestedUser + startDate
    // eventRequests merged into events table
    const all = await ctx.db
      .query("events")
      .withIndex("by_requestedUser", (q) =>
        q.eq("requestedUser", args.data.requestedUser),
      )
      .collect();

    const existing = all.find(
      (r) =>
        r.eventName === args.data.eventName &&
        r.startDate === args.data.startDate,
    );

    if (existing) {
      await ctx.db.patch(existing._id, args.data);
      return { id: existing._id, action: "updated" as const };
    }

    const id = await ctx.db.insert("events", args.data);
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

// Migration: move eventRequests rows into the unified events table.
// Run once after deploying the merged schema. Safe to re-run (deduplicates).
export const migrateEventRequestsToEvents = mutation({
  args: {},
  handler: async (ctx) => {
    // Query the old eventRequests table via system table (schema no longer defines it)
    const oldRequests = await (ctx.db as any).query("eventRequests").collect();
    let migrated = 0;
    let skipped = 0;

    for (const req of oldRequests) {
      // Dedup: check if an event with same name + requestedUser + startDate already exists
      const existing = await ctx.db
        .query("events")
        .withIndex("by_requestedUser", (q: any) =>
          q.eq("requestedUser", req.requestedUser),
        )
        .collect();

      const alreadyMigrated = existing.some(
        (e: any) =>
          e.eventName === (req.name || req.eventName) &&
          e.startDate === (req.startDateTime || req.startDate),
      );

      if (alreadyMigrated) {
        skipped++;
        continue;
      }

      // Map old eventRequests fields to new events fields
      await ctx.db.insert("events", {
        eventName: req.name || req.eventName || "Untitled Event",
        eventDescription: req.eventDescription || "",
        location: req.location || "TBD",
        startDate: req.startDateTime || req.startDate || Date.now(),
        endDate: req.endDateTime || req.endDate || Date.now() + 3600000,
        eventType: req.eventType || "other",
        eventCode: req.eventCode,
        hasFood: req.foodDrinksBeingServed || req.hasFood || false,
        published: req.published || false,
        createdAt: req.createdAt || req._creationTime,
        // Request workflow fields
        department: req.department,
        flyersNeeded: req.flyersNeeded,
        flyerType: req.flyerType,
        otherFlyerType: req.otherFlyerType,
        flyerAdvertisingStartDate: req.flyerAdvertisingStartDate,
        flyerAdditionalRequests: req.flyerAdditionalRequests,
        flyersCompleted: req.flyersCompleted || false,
        photographyNeeded: req.photographyNeeded,
        requiredLogos: req.requiredLogos,
        otherLogos: req.otherLogos,
        advertisingFormat: req.advertisingFormat,
        additionalSpecifications: req.additionalSpecifications,
        graphicsUploadNote: req.graphicsUploadNote,
        willOrHaveRoomBooking: req.willOrHaveRoomBooking,
        expectedAttendance: req.expectedAttendance,
        roomBookingFiles: req.roomBookingFiles,
        asFundingRequired: req.asFundingRequired,
        foodDrinksBeingServed: req.foodDrinksBeingServed,
        invoices: req.invoices,
        needsGraphics: req.needsGraphics,
        needsAsFunding: req.needsAsFunding,
        status: req.status || "draft",
        declinedReason: req.declinedReason,
        reviewFeedback: req.reviewFeedback,
        requestedUser: req.requestedUser,
        auditLogs: req.auditLogs,
        isDraft: req.isDraft,
        graphicsCompleted: req.graphicsCompleted,
        graphicsFiles: req.graphicsFiles,
        submittedAt: req.submittedAt,
      });
      migrated++;
    }

    return { migrated, skipped, total: oldRequests.length };
  },
});

// Dedup: remove duplicate events created by migration.
// Original events (pre-merge) lack requestedUser/status fields.
// Migrated eventRequests have those fields. Keep the richer record,
// reassign attendees, then delete the duplicate.
export const deduplicateEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const allEvents = await ctx.db.query("events").collect();

    // Group by normalized eventName + approximate startDate (within 1 day)
    const groups = new Map<string, typeof allEvents>();
    for (const event of allEvents) {
      const name = (event.eventName || "").trim().toLowerCase();
      // Round startDate to the nearest day for fuzzy matching
      const dayBucket = Math.floor((event.startDate || 0) / 86400000);
      const key = `${name}|${dayBucket}`;

      const group = groups.get(key);
      if (group) {
        group.push(event);
      } else {
        groups.set(key, [event]);
      }
    }

    let deleted = 0;
    let attendeesReassigned = 0;
    const duplicateGroups: string[] = [];

    for (const [key, group] of groups) {
      if (group.length <= 1) continue;

      duplicateGroups.push(`${key} (${group.length} items)`);

      // Sort: prefer records with requestedUser (migrated from eventRequests),
      // then prefer records with status field, then prefer newer _creationTime
      group.sort((a: any, b: any) => {
        const aHasRequest = a.requestedUser ? 1 : 0;
        const bHasRequest = b.requestedUser ? 1 : 0;
        if (aHasRequest !== bHasRequest) return bHasRequest - aHasRequest;

        const aHasStatus = a.status ? 1 : 0;
        const bHasStatus = b.status ? 1 : 0;
        if (aHasStatus !== bHasStatus) return bHasStatus - aHasStatus;

        // Keep the one with more fields populated
        const aFields = Object.values(a).filter((v) => v != null).length;
        const bFields = Object.values(b).filter((v) => v != null).length;
        if (aFields !== bFields) return bFields - aFields;

        return (b._creationTime || 0) - (a._creationTime || 0);
      });

      const keeper = group[0];
      const duplicates = group.slice(1);

      for (const dup of duplicates) {
        // Reassign attendees from the duplicate to the keeper
        const attendees = await ctx.db
          .query("attendees")
          .withIndex("by_eventId", (q: any) => q.eq("eventId", dup._id))
          .collect();

        for (const att of attendees) {
          // Check if this attendee already exists on the keeper
          const existingAtt = await ctx.db
            .query("attendees")
            .withIndex("by_eventId", (q: any) => q.eq("eventId", keeper._id))
            .collect();
          const alreadyExists = existingAtt.some(
            (ea: any) => ea.userId === att.userId,
          );

          if (alreadyExists) {
            await ctx.db.delete(att._id);
          } else {
            await ctx.db.patch(att._id, { eventId: keeper._id });
            attendeesReassigned++;
          }
        }

        // Merge useful fields from dup into keeper if keeper is missing them
        const mergeFields: Record<string, any> = {};
        if (!keeper.eventCode && dup.eventCode) mergeFields.eventCode = dup.eventCode;
        if (!keeper.pointsToReward && (dup as any).pointsToReward) mergeFields.pointsToReward = (dup as any).pointsToReward;
        if (!keeper.files && (dup as any).files) mergeFields.files = (dup as any).files;
        if (keeper.published !== true && (dup as any).published === true) mergeFields.published = true;

        if (Object.keys(mergeFields).length > 0) {
          await ctx.db.patch(keeper._id, mergeFields);
        }

        await ctx.db.delete(dup._id);
        deleted++;
      }
    }

    return {
      deleted,
      attendeesReassigned,
      duplicateGroups: duplicateGroups.length,
      details: duplicateGroups.slice(0, 20),
    };
  },
});

// Diagnostic: check events health after migration
export const diagnoseEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const allEvents = await ctx.db.query("events").collect();
    const missingCode = allEvents.filter((e: any) => !e.eventCode);
    const missingPublished = allEvents.filter((e: any) => e.published === undefined);
    const publishedEvents = allEvents.filter((e: any) => e.published === true);
    const withStatus = allEvents.filter((e: any) => e.status);
    const withRequestedUser = allEvents.filter((e: any) => e.requestedUser);

    return {
      total: allEvents.length,
      missingEventCode: missingCode.length,
      missingEventCodeNames: missingCode.slice(0, 10).map((e: any) => e.eventName),
      missingPublished: missingPublished.length,
      publishedCount: publishedEvents.length,
      withStatus: withStatus.length,
      withRequestedUser: withRequestedUser.length,
    };
  },
});

export const backfillFundSource = mutation({
  args: { defaultSource: v.union(v.literal("ece"), v.literal("ieee"), v.literal("other")) },
  handler: async (ctx, args) => {
    const requests = await ctx.db.query("fundRequests").collect();
    let updated = 0;

    for (const request of requests) {
      if (!request.fundSource) {
        await ctx.db.patch(request._id, { fundSource: args.defaultSource });
        updated++;
      }
    }

    return { updated, total: requests.length };
  },
});
