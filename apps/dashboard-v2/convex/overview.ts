import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const ACADEMIC_YEAR_START_MONTH = 8; // September (0-indexed)

type OverviewActivity =
  | {
      id: string;
      type: "event";
      title: string;
      description: string;
      points: number;
      date: number;
    }
  | {
      id: string;
      type: "reimbursement";
      title: string;
      description: string;
      date: number;
    }
  | {
      id: string;
      type: "fund_deposit";
      title: string;
      description: string;
      date: number;
    };

function academicYearRange(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start =
    month >= ACADEMIC_YEAR_START_MONTH
      ? new Date(year, 8, 1, 0, 0, 0, 0)
      : new Date(year - 1, 8, 1, 0, 0, 0, 0);
  const end =
    month >= ACADEMIC_YEAR_START_MONTH
      ? new Date(year + 1, 7, 31, 23, 59, 59, 999)
      : new Date(year, 7, 31, 23, 59, 59, 999);
  return { start, end };
}

export const getOverviewData = query({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    if (!user) {
      return null;
    }

    const [reimbursements, fundDeposits, attendeeRecords, publicProfiles] =
      await Promise.all([
        ctx.db
          .query("reimbursements")
          .withIndex("by_submittedBy", (q) => q.eq("submittedBy", args.authUserId))
          .collect(),
        ctx.db
          .query("fundDeposits")
          .withIndex("by_depositedBy", (q) => q.eq("depositedBy", args.authUserId))
          .order("desc")
          .take(100),
        ctx.db
          .query("eventAttendees")
          .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
          .order("desc")
          .take(200),
        ctx.db
          .query("publicProfiles")
          .withIndex("by_points", (q) => q)
          .order("desc")
          .take(500),
      ]);

    const uniqueEventIds: Id<"events">[] = Array.from(
      new Set(attendeeRecords.map((record) => record.eventId)),
    );

    const eventDocs = await Promise.all(uniqueEventIds.map((eventId) => ctx.db.get(eventId)));
    const events: Doc<"events">[] = eventDocs.filter(
      (event): event is Doc<"events"> => Boolean(event),
    );
    const eventsById = new Map<Id<"events">, Doc<"events">>(events.map((event) => [event._id, event]));

    const now = new Date();
    const { start, end } = academicYearRange(now);

    const attendedEvents: { event: Doc<"events">; record: Doc<"eventAttendees"> }[] =
      attendeeRecords
        .map((record) => {
          const event = eventsById.get(record.eventId);
          if (!event || !event.published) {
            return null;
          }
          return {
            event,
            record,
          };
        })
        .filter((item): item is { event: Doc<"events">; record: Doc<"eventAttendees"> } =>
          Boolean(item),
        );

    const academicYearEvents = attendedEvents.filter((item) => {
      if (!item.event.startDate) return false;
      const startDate = new Date(item.event.startDate as number);
      return startDate >= start && startDate <= end;
    });

    const totalPoints = academicYearEvents.reduce<number>(
      (sum, item) => sum + (item.event.pointsToReward || 0),
      0,
    );

    const reimbursementsApproved = reimbursements.filter((r) =>
      ["approved", "paid"].includes(r.status),
    ).length;

    const rankIndex = publicProfiles.findIndex(
      (profile) => profile.userId === (user._id as string),
    );

    const activity: OverviewActivity[] = [
      ...attendedEvents.map((item) => ({
        id: `event-${item.event._id}`,
        type: "event" as const,
        title: "Attended Event",
        description: item.event.eventName || "Event",
        points: item.event.pointsToReward || 0,
        date: item.event.startDate || item.record.checkedInAt,
      })),
      ...reimbursements.map((r) => ({
        id: `reimbursement-${r._id}`,
        type: "reimbursement" as const,
        title:
          r.status === "approved"
            ? "Reimbursement Approved"
            : r.status === "paid"
              ? "Reimbursement Paid"
              : "Reimbursement Submitted",
        description: r.title,
        date: r._creationTime,
      })),
      ...fundDeposits.map((deposit) => ({
        id: `fund-${deposit._id}`,
        type: "fund_deposit" as const,
        title: `Fund Deposit: $${deposit.amount.toFixed(2)}`,
        description: `Status: ${deposit.status}`,
        date: deposit.submittedAt ?? deposit._creationTime,
      })),
    ].sort((a, b) => b.date - a.date);

    const chronological = [...activity].sort((a, b) => a.date - b.date);
    let cumulative = 0;
    const pointsHistory = [
      {
        date: user.joinDate ?? user._creationTime,
        points: 0,
        cumulative: 0,
      },
    ];

    chronological.forEach((entry) => {
      const points = entry.type === "event" ? entry.points : 0;
      cumulative += points;
      pointsHistory.push({
        date: entry.date,
        points,
        cumulative,
      });
    });

    const publishedEvents = events.filter(
      (event): event is Doc<"events"> => Boolean(event.published),
    );

    return {
      user,
      stats: {
        totalPoints,
        eventsAttended: academicYearEvents.length,
        reimbursementsSubmitted: reimbursements.length,
        reimbursementsApproved,
      },
      events: publishedEvents.map((event) => ({
        id: event._id,
        eventName: event.eventName,
        eventDescription: event.eventDescription,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        pointsToReward: event.pointsToReward,
        hasFood: event.hasFood,
        eventCode: event.eventCode,
        files: event.files || [],
      })),
      fundDeposits: fundDeposits.map((deposit) => ({
        id: deposit._id,
        amount: deposit.amount,
        status: deposit.status,
        submittedAt: deposit.submittedAt ?? deposit._creationTime,
      })),
      reimbursements: reimbursements.map((r) => ({
        id: r._id,
        title: r.title,
        status: r.status,
        submittedAt: r._creationTime,
      })),
      recentActivity: activity,
      pointsHistory,
      rank: rankIndex >= 0 ? rankIndex + 1 : 0,
      totalMembers: publicProfiles.length,
    };
  },
});

