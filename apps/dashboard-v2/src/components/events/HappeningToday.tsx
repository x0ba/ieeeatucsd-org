import { UserCheck } from "lucide-react";
import { EventCard } from "./EventCard";
import { Event } from "./types";

interface HappeningTodayProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onCheckIn?: (event: Event) => void;
  checkedInEventIds?: Set<string>;
  checkingInEventId?: string | null;
}

export function HappeningToday({
  events,
  onEventClick,
  onCheckIn,
  checkedInEventIds = new Set(),
  checkingInEventId,
}: HappeningTodayProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
          <UserCheck className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold">Happening Today</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            isAttended={checkedInEventIds.has(event._id)}
            checkingIn={checkingInEventId === event._id}
            onClick={() => onEventClick?.(event)}
            onCheckIn={() => onCheckIn?.(event)}
          />
        ))}
      </div>
    </div>
  );
}
