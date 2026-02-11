import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Calendar,
  MapPin,
  Clock,
  Award,
  Search,
  ChevronDown,
  ChevronUp,
  Ticket,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/events")({
  component: EventsPage,
});

function EventsPage() {
  const { logtoId } = useAuth();
  const events = useQuery(api.events.listPublished);
  const checkIn = useMutation(api.events.checkIn);
  const [search, setSearch] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [foodChoice, setFoodChoice] = useState("none");
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const now = Date.now();

  const filteredEvents = events?.filter(
    (e) =>
      e.eventName.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase()),
  );

  const upcomingEvents = filteredEvents?.filter((e) => e.endDate >= now) ?? [];
  const pastEvents = filteredEvents?.filter((e) => e.endDate < now) ?? [];

  const handleCheckIn = async () => {
    if (!eventCode.trim() || !logtoId) return;
    setIsCheckingIn(true);
    try {
      const result = await checkIn({
        logtoId,
        eventCode: eventCode.trim(),
        food: foodChoice,
      });
      toast.success(
        `Checked in successfully! You earned ${result.points} points.`,
      );
      setEventCode("");
      setFoodChoice("none");
    } catch (error: any) {
      toast.error(error.message || "Failed to check in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const isEventActive = (event: { startDate: number; endDate: number }) => {
    return now >= event.startDate && now <= event.endDate;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-muted-foreground">
          Browse and check in to IEEE UCSD events.
        </p>
      </div>

      {/* Check-in Section */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Event Check-In</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="event-code" className="sr-only">
              Event Code
            </Label>
            <Input
              id="event-code"
              placeholder="Enter event code..."
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={foodChoice} onValueChange={setFoodChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Food preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No food</SelectItem>
                <SelectItem value="vegetarian">Vegetarian</SelectItem>
                <SelectItem value="vegan">Vegan</SelectItem>
                <SelectItem value="halal">Halal</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCheckIn}
            disabled={!eventCode.trim() || isCheckingIn || !logtoId}
          >
            {isCheckingIn ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Ticket className="h-4 w-4 mr-2" />
            )}
            Check In
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {!events ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="space-y-6">
          {/* Upcoming / Active Events */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming & Active</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => {
                  const active = isEventActive(event);
                  const expanded = expandedEvent === event._id;
                  return (
                    <div
                      key={event._id}
                      className={`rounded-xl border bg-card p-5 shadow-sm transition-shadow cursor-pointer ${
                        active
                          ? "border-green-500/50 ring-1 ring-green-500/20"
                          : "hover:shadow-md"
                      }`}
                      onClick={() =>
                        setExpandedEvent(expanded ? null : event._id)
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg leading-tight">
                          {event.eventName}
                        </h3>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          {active && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              Live
                            </Badge>
                          )}
                          <Badge variant="secondary">{event.eventType}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {event.eventDescription}
                      </p>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(event.startDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )}{" "}
                            –{" "}
                            {new Date(event.endDate).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5" />
                          <span>{event.pointsToReward} points</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        {event.hasFood && (
                          <Badge variant="outline">
                            <UtensilsCrossed className="h-3 w-3 mr-1" />
                            Food provided
                          </Badge>
                        )}
                      </div>
                      {expanded && (
                        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {event.eventDescription}
                          </p>
                          {event.files && event.files.length > 0 && (
                            <div>
                              <p className="font-medium mb-1">Files:</p>
                              <div className="flex flex-wrap gap-2">
                                {event.files.map((file, i) => (
                                  <a
                                    key={i}
                                    href={file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    File {i + 1}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                Past Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastEvents.map((event) => {
                  const expanded = expandedEvent === event._id;
                  return (
                    <div
                      key={event._id}
                      className="rounded-xl border bg-card/50 p-5 shadow-sm opacity-75 hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() =>
                        setExpandedEvent(expanded ? null : event._id)
                      }
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg leading-tight">
                          {event.eventName}
                        </h3>
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {event.eventType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {event.eventDescription}
                      </p>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {new Date(event.startDate).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5" />
                          <span>{event.pointsToReward} points</span>
                        </div>
                      </div>
                      {event.hasFood && (
                        <Badge variant="outline" className="mt-3">
                          <UtensilsCrossed className="h-3 w-3 mr-1" />
                          Food provided
                        </Badge>
                      )}
                      {expanded && (
                        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {event.eventDescription}
                          </p>
                        </div>
                      )}
                      <div className="flex justify-end mt-2">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No events found</p>
          <p className="text-sm">Check back later for upcoming events.</p>
        </div>
      )}
    </div>
  );
}
