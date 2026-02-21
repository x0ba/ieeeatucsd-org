import { createFileRoute } from "@tanstack/react-router";
import { useAuthedQuery, useAuthedMutation } from "@/hooks/useAuthedConvex";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  ExternalLink,
  Download,
} from "lucide-react";
import { EventCalendar } from "@/components/manage-events/calendar/EventCalendar";
import { InternalEventModal } from "@/components/manage-events/modals/InternalEventModal";
import { OfficerCalendarEventModal } from "@/components/manage-events/modals/OfficerCalendarEventModal";
import type { EventRequest, EventStatus } from "@/components/manage-events/types";
import {
  buildGoogleCalendarIcsUrl,
  buildGoogleCalendarSubscribeUrl,
} from "@/lib/calendarLinks";

export const Route = createFileRoute("/_dashboard/officer-calendar")({
  component: OfficerCalendarPage,
});

type InternalEventType =
  | "meeting"
  | "tabling"
  | "workshop"
  | "social"
  | "outreach"
  | "other";

interface InternalEvent {
  _id: string;
  _creationTime: number;
  name: string;
  description?: string;
  location: string;
  startDate: number;
  endDate: number;
  eventType: InternalEventType;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
  updatedBy?: string;
}

const internalEventTypeToStatus: Record<InternalEventType, EventStatus> = {
  meeting: "approved",
  tabling: "approved",
  workshop: "approved",
  social: "approved",
  outreach: "approved",
  other: "approved",
};

function OfficerCalendarPage() {
  const { logtoId, hasOfficerAccess } = usePermissions();

  const eventsData = useAuthedQuery(
    api.events.listAll,
    logtoId ? { logtoId } : "skip",
  );

  const internalEvents = useAuthedQuery(
    api.internalEvents.list,
    logtoId ? { logtoId, authToken: "" } : "skip",
  );

  const createInternalEvent = useAuthedMutation(api.internalEvents.create);
  const updateInternalEvent = useAuthedMutation(api.internalEvents.update);
  const deleteInternalEvent = useAuthedMutation(api.internalEvents.remove);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<InternalEvent | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<EventRequest | null>(null);

  const calendarEvents = useMemo(() => {
    const events: EventRequest[] = [];

    if (eventsData) {
      for (const event of eventsData) {
        const eventWithCalendar = event as typeof event & {
          publicGoogleEventId?: string | null;
          publicGoogleEventUrl?: string | null;
          publicGoogleCalendarId?: string | null;
          publicGoogleCalendarSubscribeUrl?: string | null;
          publicGoogleCalendarIcsUrl?: string | null;
        };
        if (event.published) {
          events.push({
            _id: event._id,
            _creationTime: event._creationTime,
            eventName: event.eventName || "Untitled",
            eventDescription: event.eventDescription || "",
            eventType: event.eventType as any,
            department: event.department as any,
            location: event.location || "TBD",
            startDate: event.startDate,
            endDate: event.endDate,
            eventCode: event.eventCode || "",
            hasFood: event.hasFood || false,
            needsFlyers: event.flyersNeeded || false,
            needsGraphics: event.needsGraphics || false,
            needsASFunding: event.needsAsFunding || false,
            estimatedAttendance: event.expectedAttendance || 0,
            status: "published" as EventStatus,
            files: event.files || [],
            invoices: [],
            createdBy: event.requestedUser || "",
            publicGoogleEventId: eventWithCalendar.publicGoogleEventId ?? null,
            publicGoogleEventUrl: eventWithCalendar.publicGoogleEventUrl ?? null,
            publicGoogleCalendarId: eventWithCalendar.publicGoogleCalendarId ?? null,
            publicGoogleCalendarSubscribeUrl: eventWithCalendar.publicGoogleCalendarSubscribeUrl ?? null,
            publicGoogleCalendarIcsUrl: eventWithCalendar.publicGoogleCalendarIcsUrl ?? null,
          });
        }
      }
    }

    if (internalEvents) {
      for (const event of internalEvents) {
        events.push({
          _id: event._id,
          _creationTime: event._creationTime,
          eventName: event.name,
          eventDescription: event.description || "",
          eventType: event.eventType as any,
          department: "internal" as any,
          location: event.location,
          startDate: event.startDate,
          endDate: event.endDate,
          eventCode: "",
          hasFood: false,
          needsFlyers: false,
          needsGraphics: false,
          needsASFunding: false,
          estimatedAttendance: 0,
          status: internalEventTypeToStatus[event.eventType] || "approved",
          files: [],
          invoices: [],
          createdBy: event.createdBy,
        });
      }
    }

    return events.sort((a, b) => a.startDate - b.startDate);
  }, [eventsData, internalEvents]);

  const handleSubmit = async (data: {
    name: string;
    description?: string;
    location: string;
    startDate: number;
    endDate: number;
    eventType: InternalEventType;
  }) => {
    if (!logtoId) return;

    if (editingEvent) {
      await updateInternalEvent({
        logtoId,
        authToken: "",
        id: editingEvent._id as any,
        ...data,
      });
      toast.success("Event updated successfully");
    } else {
      await createInternalEvent({
        logtoId,
        authToken: "",
        ...data,
      });
      toast.success("Event created successfully");
    }
    setEditingEvent(null);
  };

  const handleDelete = async (event: InternalEvent) => {
    if (!logtoId) return;
    await deleteInternalEvent({
      logtoId,
      authToken: "",
      id: event._id as any,
    });
    toast.success("Event deleted successfully");
    setEditingEvent(null);
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: InternalEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: EventRequest) => {
    setSelectedCalendarEvent(event);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const publicCalendarId = useMemo(
    () =>
      ((eventsData?.find((event) => event.published && "publicGoogleCalendarId" in event) as
        | ({ publicGoogleCalendarId?: string | null } & Record<string, unknown>)
        | undefined)?.publicGoogleCalendarId ?? null),
    [eventsData],
  );

  const isLoading = eventsData === undefined || internalEvents === undefined;

  if (!hasOfficerAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Officer Calendar</h1>
          <p className="text-muted-foreground">
            View published events and manage internal officer events
          </p>
        </div>
        <div className="flex gap-2">
          {publicCalendarId && (
            <>
              <Button variant="outline" asChild>
                <a
                  href={buildGoogleCalendarSubscribeUrl(publicCalendarId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Subscribe Public Calendar
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={buildGoogleCalendarIcsUrl(publicCalendarId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Public ICS Feed
                </a>
              </Button>
            </>
          )}
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Internal Event
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <EventCalendar
          events={calendarEvents}
          onDateClick={() => openCreateModal()}
          onEventClick={handleEventClick}
          todayHighlightMode="background"
        />
      )}

      <InternalEventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        editingEvent={editingEvent}
      />

      <OfficerCalendarEventModal
        isOpen={!!selectedCalendarEvent}
        onClose={() => setSelectedCalendarEvent(null)}
        event={selectedCalendarEvent}
        isInternalEvent={selectedCalendarEvent?.department === "internal"}
        onEditInternalEvent={() => {
          if (!selectedCalendarEvent || !internalEvents) return;
          const internalEvent = internalEvents.find((candidate) => candidate._id === selectedCalendarEvent._id);
          if (!internalEvent) return;
          setSelectedCalendarEvent(null);
          openEditModal(internalEvent);
        }}
        publicCalendarId={publicCalendarId}
      />
    </div>
  );
}
