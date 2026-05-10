import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type CalendarKey = "private" | "public";
type SourceKind = "published" | "internal";

interface CalendarSyncState {
  _id: Id<"googleCalendarSyncState">;
  calendarKey: CalendarKey;
  calendarId: string;
  googleEventId: string;
  sourceKind: SourceKind;
  sourceId: string;
  sourceStartDate: number;
  lastSyncedAt: number;
}

const calendarKeyValidator = v.union(v.literal("private"), v.literal("public"));
const sourceKindValidator = v.union(v.literal("published"), v.literal("internal"));
const syncStateInputValidator = v.object({
  calendarKey: calendarKeyValidator,
  calendarId: v.string(),
  googleEventId: v.string(),
  sourceKind: sourceKindValidator,
  sourceId: v.string(),
  sourceStartDate: v.number(),
  lastSyncedAt: v.number(),
});

export const listForCalendar = internalQuery({
  args: {
    calendarKey: calendarKeyValidator,
    calendarId: v.string(),
  },
  handler: async (ctx, args): Promise<CalendarSyncState[]> => {
    return await ctx.db
      .query("googleCalendarSyncState")
      .withIndex("by_calendarKey", (q) => q.eq("calendarKey", args.calendarKey))
      .filter((q) => q.eq(q.field("calendarId"), args.calendarId))
      .collect();
  },
});

export const upsertBatch = internalMutation({
  args: {
    states: v.array(syncStateInputValidator),
  },
  handler: async (ctx, args): Promise<void> => {
    for (const state of args.states) {
      const existing = await ctx.db
        .query("googleCalendarSyncState")
        .withIndex("by_googleEventId", (q) =>
          q.eq("calendarKey", state.calendarKey).eq("googleEventId", state.googleEventId),
        )
        .filter((q) => q.eq(q.field("calendarId"), state.calendarId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, state);
      } else {
        await ctx.db.insert("googleCalendarSyncState", state);
      }
    }
  },
});

export const deleteBatch = internalMutation({
  args: {
    ids: v.array(v.id("googleCalendarSyncState")),
  },
  handler: async (ctx, args): Promise<void> => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});
