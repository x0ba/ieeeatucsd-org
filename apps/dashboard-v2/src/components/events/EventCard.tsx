import { Calendar, Clock, MapPin, Award, UserCheck, Utensils } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Event, getEventStatus, formatEventDate, formatEventTime } from "./types";

interface EventCardProps {
  event: Event;
  isAttended?: boolean;
  isPast?: boolean;
  checkingIn?: boolean;
  onClick?: () => void;
  onCheckIn?: () => void;
}

export function EventCard({
  event,
  isAttended = false,
  isPast = false,
  checkingIn = false,
  onClick,
  onCheckIn,
}: EventCardProps) {
  const status = getEventStatus(event);
  const isLive = status === "live";
  const isUpcoming = status === "upcoming";

  const statusBadge = () => {
    if (isAttended) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
          <UserCheck className="w-3 h-3 mr-1" />
          Attended
        </Badge>
      );
    }
    if (isLive) {
      return (
        <Badge className="bg-green-500 text-white animate-pulse hover:bg-green-500">
          Happening Now
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Upcoming
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
        Ended
      </Badge>
    );
  };

  const actionButton = () => {
    if (isPast) {
      return (
        <Button variant="outline" size="sm" disabled className="w-full">
          Event Ended
        </Button>
      );
    }
    if (isAttended) {
      return (
        <Button variant="secondary" size="sm" disabled className="w-full">
          <UserCheck className="w-4 h-4 mr-2" />
          Checked In
        </Button>
      );
    }
    if (isLive) {
      return (
        <Button
          size="sm"
          className="w-full shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onCheckIn?.();
          }}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <>
              <span className="animate-spin mr-2">⟳</span>
              Checking In...
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              Check In Now
            </>
          )}
        </Button>
      );
    }
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        Check-in Not Open
      </Button>
    );
  };

  return (
    <Card
      className={`w-full h-full border-none shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
        isPast ? "opacity-80 hover:opacity-100" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5 flex flex-col gap-4 justify-between h-full">
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-3">
            <h3 className="font-bold text-xl leading-tight line-clamp-2 text-foreground">
              {event.eventName}
            </h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {event.hasFood && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  <Utensils className="w-3 h-3 mr-1" />
                  Food
                </Badge>
              )}
              {statusBadge()}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{formatEventDate(event.startDate)}</span>
              <span className="text-muted-foreground/50">•</span>
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatEventTime(event.startDate)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">{event.location}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-foreground">
                {event.pointsToReward} Points
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 mt-auto" onClick={(e) => e.stopPropagation()}>
          {actionButton()}
        </div>
      </CardContent>
    </Card>
  );
}
