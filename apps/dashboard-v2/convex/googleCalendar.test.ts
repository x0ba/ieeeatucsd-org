import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import {
  type CalendarEvent,
  fetchGoogleCalendarEvents,
  syncCalendar,
} from "./googleCalendar";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

const activeEvent: CalendarEvent = {
  id: "ieeepublishedactive",
  summary: "Active event",
  start: {
    dateTime: "2026-03-31T18:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
  end: {
    dateTime: "2026-03-31T19:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
};

const staleManagedEvent: CalendarEvent = {
  id: "ieeepublishedstale",
  summary: "Stale event",
  start: {
    dateTime: "2026-04-01T18:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
  end: {
    dateTime: "2026-04-01T19:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
};

const staleInternalEvent: CalendarEvent = {
  id: "ieeeinternalstale",
  summary: "Stale internal event",
  start: {
    dateTime: "2026-04-02T18:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
  end: {
    dateTime: "2026-04-02T19:00:00.000Z",
    timeZone: "America/Los_Angeles",
  },
};

function asSourceEvent(
  event: CalendarEvent,
  sourceKind: "published" | "internal" = "published",
  sourceId = event.id,
): CalendarEvent {
  return {
    ...event,
    sourceKind,
    sourceId,
    sourceStartDate: Date.parse(event.start.dateTime),
  };
}

function syncStateFor(event: CalendarEvent, index: number) {
  return {
    _id: `state-${index}` as Id<"googleCalendarSyncState">,
    calendarKey: "private" as const,
    calendarId: "calendar-id",
    googleEventId: event.id,
    sourceKind: event.sourceKind ?? ("published" as const),
    sourceId: event.sourceId ?? event.id,
    sourceStartDate: event.sourceStartDate ?? Date.parse(event.start.dateTime),
    lastSyncedAt: 1,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchGoogleCalendarEvents", () => {
  it("fetches every Google Calendar list page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({
        items: [activeEvent],
        nextPageToken: "page-2",
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [staleManagedEvent],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const events = await fetchGoogleCalendarEvents("access-token", "calendar-id");

    expect(events.map((event) => event.id)).toEqual([
      "ieeepublishedactive",
      "ieeepublishedstale",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(firstUrl.searchParams.get("maxResults")).toBe("2500");
    expect(firstUrl.searchParams.get("singleEvents")).toBe("true");
    expect(firstUrl.searchParams.get("orderBy")).toBe("startTime");
    expect(firstUrl.searchParams.get("showDeleted")).toBe("false");
    expect(firstUrl.searchParams.has("pageToken")).toBe(false);

    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(secondUrl.searchParams.get("pageToken")).toBe("page-2");
  });
});

describe("syncCalendar", () => {
  it("records sync state after successful upserts", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const recordedStates: unknown[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const url = String(input);
      calls.push({ method, url });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [asSourceEvent(activeEvent, "published", "event-1")],
      {
        allowEmptyPrune: false,
        recordSyncStates: async (states) => {
          recordedStates.push(...states);
        },
      },
    );

    expect(stats).toMatchObject({
      calendarKey: "private",
      calendarId: "calendar-id",
      sourceCount: 1,
      stateCount: 0,
      staleStateCount: 0,
      upsertCount: 1,
      deletedCount: 0,
      deferredDeleteCount: 0,
    });
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(1);
    expect(recordedStates).toMatchObject([
      {
        calendarKey: "private",
        calendarId: "calendar-id",
        googleEventId: "ieeepublishedactive",
        sourceKind: "published",
        sourceId: "event-1",
        sourceStartDate: Date.parse(activeEvent.start.dateTime),
      },
    ]);
  });

  it("deletes stale Google events from previously recorded sync state", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const deletedStateIds: Id<"googleCalendarSyncState">[] = [];
    const activeSourceEvent = asSourceEvent(activeEvent, "published", "event-active");
    const staleSourceEvent = asSourceEvent(staleManagedEvent, "published", "event-stale");
    const staleState = syncStateFor(staleSourceEvent, 2);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const url = String(input);
      calls.push({ method, url });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [activeSourceEvent],
      {
        allowEmptyPrune: false,
        syncState: [
          syncStateFor(activeSourceEvent, 1),
          staleState,
        ],
        deleteSyncStates: async (ids) => {
          deletedStateIds.push(...ids);
        },
      },
    );

    expect(stats).toMatchObject({
      calendarId: "calendar-id",
      sourceCount: 1,
      stateCount: 2,
      staleStateCount: 1,
      upsertCount: 1,
      deletedCount: 1,
      deferredDeleteCount: 0,
    });
    expect(calls.some((call) => call.method === "DELETE" && call.url.includes("/events/ieeepublishedstale"))).toBe(
      true,
    );
    expect(deletedStateIds).toEqual([staleState._id]);
  });

  it("skips deletion when an empty source would prune tracked events", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const staleSourceEvent = asSourceEvent(staleManagedEvent, "published", "event-stale");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const url = String(input);
      calls.push({ method, url });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [],
      {
        allowEmptyPrune: false,
        syncState: [syncStateFor(staleSourceEvent, 1)],
      },
    );

    expect(stats).toMatchObject({
      calendarId: "calendar-id",
      sourceCount: 0,
      stateCount: 1,
      staleStateCount: 1,
      upsertCount: 0,
      deletedCount: 0,
      deferredDeleteCount: 1,
      pruneSkippedReason: "empty_source_would_delete_tracked_events",
    });
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });

  it("refuses to delete every tracked event unless explicit pruning is requested", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const replacementEvent: CalendarEvent = {
      ...asSourceEvent(activeEvent, "published", "replacement-event"),
      id: "ieeepublishedreplacement",
    };
    const stalePublished = asSourceEvent(staleManagedEvent, "published", "event-stale");
    const staleInternal = asSourceEvent(staleInternalEvent, "internal", "internal-stale");
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const url = String(input);
      calls.push({ method, url });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [replacementEvent],
      {
        allowEmptyPrune: false,
        syncState: [
          syncStateFor(stalePublished, 1),
          syncStateFor(staleInternal, 2),
        ],
      },
    );

    expect(stats).toMatchObject({
      calendarId: "calendar-id",
      sourceCount: 1,
      stateCount: 2,
      staleStateCount: 2,
      upsertCount: 1,
      deletedCount: 0,
      deferredDeleteCount: 2,
      pruneSkippedReason: "refusing_to_delete_all_tracked_events",
    });
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);

    const explicitStats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [replacementEvent],
      {
        allowEmptyPrune: true,
        syncState: [
          syncStateFor(stalePublished, 1),
          syncStateFor(staleInternal, 2),
        ],
      },
    );

    expect(explicitStats).toMatchObject({
      stateCount: 2,
      staleStateCount: 2,
      deletedCount: 2,
      deferredDeleteCount: 0,
    });
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(2);
  });

  it("does not delete when Google Calendar listing returns zero events", async () => {
    const calls: Array<{ method: string; url: string }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET";
      const url = String(input);
      calls.push({ method, url });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const stats = await syncCalendar(
      "access-token",
      "private",
      "calendar-id",
      [asSourceEvent(activeEvent, "published", "event-active")],
      { allowEmptyPrune: false },
    );

    expect(stats).toMatchObject({
      calendarId: "calendar-id",
      sourceCount: 1,
      stateCount: 0,
      staleStateCount: 0,
      upsertCount: 1,
      deletedCount: 0,
      deferredDeleteCount: 0,
    });
    expect(calls.some((call) => call.method === "PUT")).toBe(true);
    expect(calls.some((call) => call.method === "GET")).toBe(false);
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  });
});
