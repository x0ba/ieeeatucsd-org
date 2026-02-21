import { format } from "date-fns";
import {
  Calendar,
  Clock3,
  ExternalLink,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EventRequest } from "@/components/manage-events/types";
import {
  buildGoogleCalendarIcsUrl,
  buildGoogleCalendarSubscribeUrl,
  downloadEventIcs,
} from "@/lib/calendarLinks";

interface OfficerCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRequest | null;
  isInternalEvent: boolean;
  onEditInternalEvent?: () => void;
  publicCalendarId?: string | null;
}

export function OfficerCalendarEventModal({
  isOpen,
  onClose,
  event,
  isInternalEvent,
  onEditInternalEvent,
  publicCalendarId,
}: OfficerCalendarEventModalProps) {
  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const eventGoogleUrl = event.publicGoogleEventUrl || undefined;
  const subscribeUrl = publicCalendarId ? buildGoogleCalendarSubscribeUrl(publicCalendarId) : null;
  const publicIcsUrl = publicCalendarId ? buildGoogleCalendarIcsUrl(publicCalendarId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-0 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-2xl font-black tracking-tight leading-tight text-white">
              {event.eventName}
            </DialogTitle>
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={isInternalEvent ? "bg-amber-500/20 text-amber-200 border-amber-400/40" : "bg-cyan-500/20 text-cyan-100 border-cyan-400/40"}>
              {isInternalEvent ? "Internal Event" : "Published Event"}
            </Badge>
            <Badge variant="outline" className="border-slate-500 text-slate-200">
              {event.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2.5">
              <div className="flex items-center text-xs uppercase tracking-wide text-slate-300 gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date
              </div>
              <p className="text-sm text-white mt-1">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
            </div>
            <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2.5">
              <div className="flex items-center text-xs uppercase tracking-wide text-slate-300 gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Time
              </div>
              <p className="text-sm text-white mt-1">
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2.5">
            <div className="flex items-center text-xs uppercase tracking-wide text-slate-300 gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </div>
            <p className="text-sm text-white mt-1">{event.location || "TBD"}</p>
          </div>

          {event.eventDescription && (
            <div className="rounded-xl bg-slate-800/70 border border-slate-700 px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-slate-300">Details</p>
              <p className="text-sm text-slate-100 mt-1 whitespace-pre-wrap">{event.eventDescription}</p>
            </div>
          )}

          <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-3 space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-300">Add to Calendar</p>
            <div className="flex flex-wrap gap-2">
              {subscribeUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={subscribeUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Subscribe Public Calendar
                  </a>
                </Button>
              )}
              {publicIcsUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={publicIcsUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Public ICS Feed
                  </a>
                </Button>
              )}
              {eventGoogleUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={eventGoogleUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open This Event
                  </a>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadEventIcs(
                    {
                      id: event.publicGoogleEventId || event._id,
                      title: event.eventName,
                      description: event.eventDescription,
                      location: event.location,
                      startDate: event.startDate,
                      endDate: event.endDate,
                    },
                    `${event.eventName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "event"}.ics`,
                  )
                }
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Download Event ICS
              </Button>
            </div>
          </div>
        </div>

        {isInternalEvent && onEditInternalEvent && (
          <div className="pt-2">
            <Button onClick={onEditInternalEvent} className="w-full">
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Internal Event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
