export interface SyncableGoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

function parseGoogleCalendarDateTime(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getGoogleCalendarEventTimeRangeError(
  event: SyncableGoogleCalendarEvent,
): string | null {
  const start = parseGoogleCalendarDateTime(event.start.dateTime);
  const end = parseGoogleCalendarDateTime(event.end.dateTime);

  if (start === null || end === null) {
    return `invalid event timestamps (start=${event.start.dateTime}, end=${event.end.dateTime})`;
  }

  if (end <= start) {
    return `end must be after start (start=${event.start.dateTime}, end=${event.end.dateTime})`;
  }

  return null;
}

export function filterValidGoogleCalendarEvents<T extends SyncableGoogleCalendarEvent>(
  calendarId: string,
  events: T[],
): T[] {
  return events.filter((event) => {
    const error = getGoogleCalendarEventTimeRangeError(event);
    if (!error) {
      return true;
    }

    console.error(
      `Skipping Google Calendar sync for calendar ${calendarId}, event ${event.id} (${event.summary}): ${error}`,
    );
    return false;
  });
}
