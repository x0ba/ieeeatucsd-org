import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Plus,
  List,
  Calendar as CalendarIcon,
  FilePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  EventStatsCards,
  EventsFilters,
  EventsDataTable,
  EventCalendar,
  EventRequestWizardModal,
  EventViewModal,
  DraftEventModal,
  FileManagerModal,
  type EventRequest,
  type EventFilters,
  type SortConfig,
  type EventFormData,
} from "@/components/manage-events";

export const Route = createFileRoute("/_dashboard/manage-events")({
  component: ManageEventsPage,
});

// Map from Convex eventRequests to EventRequest type
function mapEventRequestToType(er: any): EventRequest {
  return {
    _id: er._id,
    _creationTime: er._creationTime,
    eventName: er.name || "Untitled Event",
    eventDescription: er.eventDescription || "",
    eventType: er.eventType || "General",
    department: er.department,
    location: er.location || "TBD",
    startDate: er.startDateTime || Date.now(),
    endDate: er.endDateTime || Date.now() + 3600000,
    capacity: er.expectedAttendance,
    eventCode: er.eventCode || `EVENT-${er._id.slice(-6)}`,
    hasFood: er.foodDrinksBeingServed || false,
    needsFlyers: er.flyersNeeded || false,
    needsGraphics: er.needsGraphics || false,
    needsASFunding: er.needsAsFunding || er.asFundingRequired || false,
    estimatedAttendance: er.expectedAttendance || 0,
    status: mapStatus(er.status),
    files: er.files || [],
    invoices: (er.invoices || []).map((inv: any) => ({
      _id: inv.id || crypto.randomUUID(),
      amount: inv.total || 0,
      vendor: inv.vendor || "Unknown",
      description: inv.items?.map((i: any) => i.description).join(", ") || "",
    })),
    createdBy: er.createdBy || "Unknown",
    _updatedAt: er._updatedAt,
  };
}

// Map from Convex events to EventRequest type (published events)
function mapEventToType(event: any): EventRequest {
  return {
    _id: event._id,
    _creationTime: event._creationTime,
    eventName: event.eventName || "Untitled Event",
    eventDescription: event.eventDescription || "",
    eventType: event.eventType || "General",
    department: event.department,
    location: event.location || "TBD",
    startDate: event.startDate || Date.now(),
    endDate: event.endDate || Date.now() + 3600000,
    capacity: event.capacity,
    eventCode: event.eventCode || `EVENT-${event._id.slice(-6)}`,
    hasFood: event.hasFood || false,
    needsFlyers: event.needsFlyers || false,
    needsGraphics: event.needsGraphics || false,
    needsASFunding: event.needsASFunding || false,
    estimatedAttendance: event.estimatedAttendance || 0,
    status: event.published ? "published" : "draft",
    files: event.files || [],
    invoices: event.invoices || [],
    createdBy: event.createdBy || "Unknown",
    _updatedAt: event._updatedAt,
  };
}

// Map Convex status to EventRequest status
function mapStatus(status: string): EventRequest["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "submitted":
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "declined":
      return "declined";
    case "completed":
    case "published":
      return "published";
    default:
      return "draft";
  }
}

function ManageEventsPage() {
  const { hasOfficerAccess, hasAdminAccess, logtoId } = usePermissions();

  // Convex queries
  const eventRequestsData = useQuery(
    api.eventRequests.listAll,
    logtoId ? { logtoId } : "skip"
  );
  const eventsData = useQuery(
    api.events.listAll,
    logtoId ? { logtoId } : "skip"
  );

  // Convex mutations
  const createEventRequest = useMutation(api.eventRequests.create);
  const updateEventRequest = useMutation(api.eventRequests.update);
  const updateEventRequestStatus = useMutation(api.eventRequests.updateStatus);

  // View mode state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Filters state
  const [filters, setFilters] = useState<EventFilters>({
    search: "",
    status: "all",
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "startDate",
    direction: "desc",
  });

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(
    null
  );
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EventRequest | null>(
    null
  );

  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform data to EventRequest type
  const allEvents: EventRequest[] = useMemo(() => {
    const requests = (eventRequestsData || []).map(mapEventRequestToType);
    const events = (eventsData || []).map(mapEventToType);
    return [...requests, ...events];
  }, [eventRequestsData, eventsData]);

  // Compute stats
  const stats = useMemo(() => {
    return {
      totalEvents: allEvents.length,
      publishedEvents: allEvents.filter((e) => e.status === "published").length,
      totalAttendees: allEvents.reduce(
        (sum, e) => sum + (e.estimatedAttendance || 0),
        0
      ),
    };
  }, [allEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      // Search filter
      const searchMatch =
        !filters.search ||
        event.eventName.toLowerCase().includes(filters.search.toLowerCase()) ||
        event.eventDescription
          .toLowerCase()
          .includes(filters.search.toLowerCase()) ||
        event.location.toLowerCase().includes(filters.search.toLowerCase());

      // Status filter
      const statusMatch =
        filters.status === "all" || event.status === filters.status;

      // Date range filter
      const startDateMatch =
        !filters.startDate || event.startDate >= filters.startDate;
      const endDateMatch =
        !filters.endDate || event.endDate <= filters.endDate;

      return searchMatch && statusMatch && startDateMatch && endDateMatch;
    });
  }, [allEvents, filters]);

  // Sort events
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof EventRequest];
      const bValue = b[sortConfig.field as keyof EventRequest];

      if (aValue === undefined || bValue === undefined) return 0;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredEvents, sortConfig]);

  // Permission check
  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  // Sort handler
  const handleSort = (field: string) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Create event handler
  const handleCreateRequest = async (data: EventFormData) => {
    if (!logtoId) return;
    setIsProcessing(true);
    try {
      await createEventRequest({
        logtoId,
        name: data.eventName,
        location: data.location,
        startDateTime: data.startDate,
        endDateTime: data.endDate,
        eventDescription: data.eventDescription,
        expectedAttendance: data.estimatedAttendance,
        flyersNeeded: data.needsFlyers,
        needsGraphics: data.needsGraphics,
        needsAsFunding: data.needsASFunding,
        invoices: data.invoices.map((inv) => ({
          id: inv._id,
          vendor: inv.vendor,
          items: [{ description: inv.description, quantity: 1, unitPrice: inv.amount, total: inv.amount }],
          tax: 0,
          tip: 0,
          subtotal: inv.amount,
          total: inv.amount,
          additionalFiles: [] as string[],
        })),
        isDraft: false,
        flyersCompleted: false,
        photographyNeeded: false,
        requiredLogos: [] as string[],
        otherFlyerType: "",
        flyerAdvertisingStartDate: 0,
        flyerAdditionalRequests: "",
        advertisingFormat: "",
        otherLogos: [] as string[],
        asFundingRequired: data.needsASFunding,
        flyerType: [] as string[],
        willOrHaveRoomBooking: false,
        roomBookingFiles: [] as string[],
        foodDrinksBeingServed: false,
      });
      toast.success("Event request submitted successfully!");
      setIsWizardOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit event request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update event handler
  const handleUpdateRequest = async (data: EventFormData) => {
    if (!logtoId || !editingRequest) return;
    setIsProcessing(true);
    try {
      await updateEventRequest({
        logtoId,
        id: editingRequest._id,
        name: data.eventName,
        location: data.location,
        startDateTime: data.startDate,
        endDateTime: data.endDate,
        eventDescription: data.eventDescription,
        expectedAttendance: data.estimatedAttendance,
        flyersNeeded: data.needsFlyers,
        needsGraphics: data.needsGraphics,
        needsAsFunding: data.needsASFunding,
      });
      toast.success("Event request updated successfully!");
      setIsWizardOpen(false);
      setEditingRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete handler
  const handleDelete = async (event: EventRequest) => {
    if (!logtoId) return;
    if (!confirm("Are you sure you want to delete this event?")) return;
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: "declined",
        declinedReason: "Deleted by user",
      });
      toast.success("Event deleted successfully!");
      setIsViewModalOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert to draft handler
  const handleConvertToDraft = async (event: EventRequest) => {
    if (!logtoId) return;
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: "draft",
      });
      toast.success("Event converted to draft!");
    } catch (error: any) {
      toast.error(error.message || "Failed to convert to draft");
    } finally {
      setIsProcessing(false);
    }
  };

  // Publish handler
  const handlePublish = async (event: EventRequest) => {
    if (!logtoId) return;
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: "approved",
      });
      toast.success("Event approved successfully!");
      setIsViewModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve event");
    } finally {
      setIsProcessing(false);
    }
  };

  // Decline handler
  const handleDecline = async (event: EventRequest) => {
    if (!logtoId) return;
    const reason = prompt("Enter reason for declining:");
    if (!reason) return;
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: "declined",
        declinedReason: reason,
      });
      toast.success("Event declined");
      setIsViewModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to decline event");
    } finally {
      setIsProcessing(false);
    }
  };

  // Create draft handler
  const handleCreateDraft = async (data: Partial<EventRequest>) => {
    if (!logtoId) return;
    setIsProcessing(true);
    try {
      await createEventRequest({
        logtoId,
        name: data.eventName || "Draft Event",
        location: data.location || "TBD",
        startDateTime: data.startDate || Date.now(),
        endDateTime: data.endDate || Date.now() + 3600000,
        eventDescription: data.eventDescription || "",
        expectedAttendance: data.estimatedAttendance,
        isDraft: true,
        flyersNeeded: false,
        flyerType: [] as string[],
        flyersCompleted: false,
        photographyNeeded: false,
        requiredLogos: [] as string[],
        otherFlyerType: "",
        flyerAdvertisingStartDate: 0,
        flyerAdditionalRequests: "",
        advertisingFormat: "",
        otherLogos: [] as string[],
        willOrHaveRoomBooking: false,
        roomBookingFiles: [] as string[],
        asFundingRequired: false,
        foodDrinksBeingServed: false,
        invoices: [] as any[],
        needsGraphics: false,
        needsAsFunding: false,
      });
      toast.success("Draft event created!");
      setIsDraftModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create draft");
    } finally {
      setIsProcessing(false);
    }
  };

  // Calendar date click handler
  const handleCalendarDateClick = () => {
    setIsWizardOpen(true);
  };

  // Event click handler for calendar
  const handleCalendarEventClick = (event: EventRequest) => {
    setSelectedRequest(event);
    setIsViewModalOpen(true);
  };

  // Edit handler from view modal
  const handleEditFromView = (event: EventRequest) => {
    setEditingRequest(event);
    setIsViewModalOpen(false);
    setIsWizardOpen(true);
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground">
            Review event requests and manage published events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDraftModalOpen(true)}>
            <FilePlus className="h-4 w-4 mr-2" />
            Quick Draft
          </Button>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Event Request
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <EventStatsCards
        stats={stats}
        loading={!eventRequestsData || !eventsData}
      />

      {/* View Toggle Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Events List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Event Planning
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <EventsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Loading State */}
      {(!eventRequestsData || !eventsData) && (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      )}

      {/* Content */}
      {eventRequestsData && eventsData && (
        <>
          {viewMode === "list" ? (
            <EventsDataTable
              events={sortedEvents}
              sortConfig={sortConfig}
              onSort={handleSort}
              onView={(event) => {
                setSelectedRequest(event);
                setIsViewModalOpen(true);
              }}
              onEdit={(event) => {
                setEditingRequest(event);
                setIsWizardOpen(true);
              }}
              onDelete={handleDelete}
              onConvertToDraft={handleConvertToDraft}
            />
          ) : (
            <EventCalendar
              events={sortedEvents}
              onDateClick={handleCalendarDateClick}
              onEventClick={handleCalendarEventClick}
            />
          )}
        </>
      )}

      {/* Event Request Wizard Modal */}
      <EventRequestWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={editingRequest ? handleUpdateRequest : handleCreateRequest}
        initialData={editingRequest || undefined}
      />

      {/* Event View Modal */}
      <EventViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedRequest(null);
        }}
        event={selectedRequest}
        onEdit={handleEditFromView}
        onDelete={handleDelete}
        onPublish={hasAdminAccess ? handlePublish : undefined}
        onDecline={hasAdminAccess ? handleDecline : undefined}
      />

      {/* Draft Event Modal */}
      <DraftEventModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        onSubmit={handleCreateDraft}
      />

      {/* File Manager Modal */}
      {selectedRequest && (
        <FileManagerModal
          isOpen={isFileManagerOpen}
          onClose={() => setIsFileManagerOpen(false)}
          eventId={selectedRequest._id}
          files={[]}
          onUpload={() => {}}
          onDelete={() => {}}
        />
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}
