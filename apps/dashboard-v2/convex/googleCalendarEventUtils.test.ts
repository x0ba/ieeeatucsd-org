import { describe, expect, it, vi } from "vitest";
import {
  filterValidGoogleCalendarEvents,
  getGoogleCalendarEventTimeRangeError,
} from "./googleCalendarEventUtils";

describe("getGoogleCalendarEventTimeRangeError", () => {
  it("accepts a valid Google Calendar event range", () => {
    expect(
      getGoogleCalendarEventTimeRangeError({
        id: "ieee-valid",
        summary: "Valid event",
        start: { dateTime: "2026-03-31T18:00:00.000Z" },
        end: { dateTime: "2026-03-31T19:00:00.000Z" },
      }),
    ).toBeNull();
  });

  it("rejects an empty Google Calendar event range", () => {
    expect(
      getGoogleCalendarEventTimeRangeError({
        id: "ieee-empty",
        summary: "Empty event",
        start: { dateTime: "2026-03-31T18:00:00.000Z" },
        end: { dateTime: "2026-03-31T18:00:00.000Z" },
      }),
    ).toContain("end must be after start");
  });
});

describe("filterValidGoogleCalendarEvents", () => {
  it("filters invalid events and logs them", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const validEvents = filterValidGoogleCalendarEvents("calendar-id", [
      {
        id: "ieee-valid",
        summary: "Valid event",
        start: { dateTime: "2026-03-31T18:00:00.000Z" },
        end: { dateTime: "2026-03-31T19:00:00.000Z" },
      },
      {
        id: "ieee-invalid",
        summary: "Invalid event",
        start: { dateTime: "2026-03-31T20:00:00.000Z" },
        end: { dateTime: "2026-03-31T19:00:00.000Z" },
      },
    ]);

    expect(validEvents).toHaveLength(1);
    expect(validEvents[0]?.id).toBe("ieee-valid");
    expect(errorSpy).toHaveBeenCalledOnce();

    errorSpy.mockRestore();
  });
});
