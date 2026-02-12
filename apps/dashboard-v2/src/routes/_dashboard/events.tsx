import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Calendar,
  Clock,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  UserStatsCards,
  EventCard,
  EventDetailModal,
  CheckInModal,
  HappeningToday,
  type Event as EventType,
} from "@/components/events";

export const Route = createFileRoute("/_dashboard/events")({
  component: EventsPage,
});

const PAST_EVENTS_PER_PAGE = 9;

function EventsPage() {
  const { logtoId } = useAuth();
  const events = useQuery(api.events.listPublished);
  const user = useQuery(api.users.getMe, logtoId ? { logtoId } : "skip");
  const attendedEventIdsData = useQuery(
    api.events.getAttendedEventIds,
    logtoId ? { logtoId } : "skip"
  );
  const checkIn = useMutation(api.events.checkIn);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [pastPage, setPastPage] = useState(1);

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInEvent, setCheckInEvent] = useState<EventType | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const now = Date.now();

  // Get user's attended event IDs
  const attendedEventIds = useMemo(() => {
    if (!attendedEventIdsData) return new Set<string>();
    return new Set(attendedEventIdsData);
  }, [attendedEventIdsData]);

  const filteredEvents = useMemo(() => {
    return events?.filter(
      (e) =>
        e.eventName.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase()),
    );
  }, [events, search]);

  const upcomingEvents = useMemo(() =>
    (filteredEvents?.filter((e) => e.endDate >= now && e.startDate > now) ?? []).sort((a, b) => a.startDate - b.startDate),
    [filteredEvents, now],
  );

  const pastEvents = useMemo(() =>
    (filteredEvents?.filter((e) => e.endDate < now) ?? []).sort((a, b) => b.startDate - a.startDate),
    [filteredEvents, now],
  );

  const pastTotalPages = Math.ceil(pastEvents.length / PAST_EVENTS_PER_PAGE);
  const paginatedPast = pastEvents.slice((pastPage - 1) * PAST_EVENTS_PER_PAGE, pastPage * PAST_EVENTS_PER_PAGE);

  // Get events happening today (live events)
  const todayEvents = useMemo(() => {
    return upcomingEvents.filter((e) => e.startDate <= now && e.endDate >= now);
  }, [upcomingEvents, now]);

  // Get latest attended event for stats
  const latestAttendedEvent = useMemo(() => {
    if (!events || attendedEventIds.size === 0) return undefined;
    const attended = events
      .filter((e) => attendedEventIds.has(e._id))
      .sort((a, b) => b.startDate - a.startDate)[0];
    return attended ? { eventName: attended.eventName, eventDate: attended.startDate } : undefined;
  }, [events, attendedEventIds]);

  const handleEventClick = (event: EventType) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(true);
  };

  const handleCheckInClick = (event: EventType) => {
    setCheckInEvent(event);
    setIsCheckInModalOpen(true);
  };

  const handleCheckInSubmit = async (code: string, foodPreference?: string) => {
    if (!logtoId) return;
    setIsCheckingIn(true);
    try {
      const result = await checkIn({
        logtoId,
        eventCode: code,
        food: foodPreference || "none",
      });
      toast.success(
        `Checked in successfully! You earned ${result.points} points.`,
      );
      setIsCheckInModalOpen(false);
      setCheckInEvent(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to check in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckInFromDetail = () => {
    if (selectedEvent) {
      setIsEventDetailOpen(false);
      setCheckInEvent(selectedEvent);
      setIsCheckInModalOpen(true);
    }
  };

  // Convert Convex event to EventType
  const toEventType = (event: any): EventType => ({
    _id: event._id,
    eventName: event.eventName,
    eventDescription: event.eventDescription,
    eventCode: event.eventCode,
    location: event.location,
    files: event.files || [],
    pointsToReward: event.pointsToReward,
    startDate: event.startDate,
    endDate: event.endDate,
    published: event.published,
    eventType: event.eventType,
    hasFood: event.hasFood,
  });

  return (
    <div className="p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">
          Browse and check in to IEEE UCSD events.
        </p>
      </div>

      {/* User Stats Cards */}
      <UserStatsCards
        latestEvent={latestAttendedEvent}
        totalPoints={user?.points || 0}
        eventsAttended={user?.eventsAttended || 0}
        loading={!user}
      />

      {/* Happening Today */}
      {todayEvents.length > 0 && (
        <HappeningToday
          events={todayEvents.map(toEventType)}
          onEventClick={handleEventClick}
          onCheckIn={handleCheckInClick}
          checkedInEventIds={attendedEventIds}
          checkingInEventId={isCheckingIn ? checkInEvent?._id || null : null}
        />
      )}


      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("upcoming")}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Upcoming ({upcomingEvents.length})
          </Button>
          <Button
            variant={activeTab === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveTab("past"); setPastPage(1); }}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Past ({pastEvents.length})
          </Button>
        </div>
      </div>

      {!events ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : activeTab === "upcoming" ? (
        upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <EventCard
                key={event._id}
                event={toEventType(event)}
                isAttended={attendedEventIds.has(event._id)}
                isPast={false}
                checkingIn={isCheckingIn && checkInEvent?._id === event._id}
                onClick={() => handleEventClick(toEventType(event))}
                onCheckIn={() => handleCheckInClick(toEventType(event))}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No upcoming events</p>
            <p className="text-sm">Check back later for upcoming events.</p>
          </div>
        )
      ) : (
        paginatedPast.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedPast.map((event) => (
                <EventCard
                  key={event._id}
                  event={toEventType(event)}
                  isAttended={attendedEventIds.has(event._id)}
                  isPast={true}
                  onClick={() => handleEventClick(toEventType(event))}
                />
              ))}
            </div>
            <Pagination currentPage={pastPage} totalPages={pastTotalPages} onPageChange={setPastPage} />
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No past events</p>
            <p className="text-sm">Events you've missed will appear here.</p>
          </div>
        )
      )}

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventDetailOpen}
        onClose={() => setIsEventDetailOpen(false)}
        onCheckIn={handleCheckInFromDetail}
        userHasAttended={selectedEvent ? attendedEventIds.has(selectedEvent._id) : false}
      />

      {/* Check In Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setCheckInEvent(null);
        }}
        onSubmit={handleCheckInSubmit}
        eventHasFood={checkInEvent?.hasFood || false}
        eventName={checkInEvent?.eventName}
        isSubmitting={isCheckingIn}
      />
    </div>
  );
}
