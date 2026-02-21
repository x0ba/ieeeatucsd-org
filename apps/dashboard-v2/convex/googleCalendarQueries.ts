import { internalQuery } from "./_generated/server";

// Internal queries for Google Calendar sync actions
export const getPublishedEventsForSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_published", (q) => q.eq("published", true))
      .collect();
  },
});

export const getInternalEventsForSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("internalEvents")
      .withIndex("by_startDate")
      .collect();
  },
});
