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
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  EventsFilters,
  EventsDataTable,
  EventCalendar,
  EventRequestWizardModal,
  EventViewModal,
  DraftViewModal,
  DraftEventModal,
  FileManagerModal,
  type EventRequest,
  type EventFilters,
  type SortConfig,
  type EventFormData,
  type EventStatus,
} from "@/components/manage-events";
import {
  normalizeDepartment,
  normalizeEventType,
} from "@/components/manage-events/constants";

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
    eventType: normalizeEventType(er.eventType),
    department: normalizeDepartment(er.department),
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
      vendor: inv.vendor || "Unknown",
      items: inv.items || [],
      tax: inv.tax || 0,
      tip: inv.tip || 0,
      invoiceFile: inv.invoiceFile,
      additionalFiles: inv.additionalFiles || [],
      subtotal: inv.subtotal || 0,
      total: inv.total || 0,
      amount: inv.total || 0,
      description: inv.items?.map((i: any) => i.description).join(", ") || "",
      fileUrl: inv.invoiceFile,
    })),
    createdBy: er.submitterName || er.requestedUser || er.createdBy || "Unknown",
    requestedUser: er.requestedUser,
    _updatedAt: er._updatedAt,
    // Preserve all Convex fields for editing
    willOrHaveRoomBooking: er.willOrHaveRoomBooking || false,
    roomBookingFiles: er.roomBookingFiles || [],
    foodDrinksBeingServed: er.foodDrinksBeingServed || false,
    asFundingRequired: er.asFundingRequired || false,
    flyerType: er.flyerType || [],
    otherFlyerType: er.otherFlyerType || "",
    flyerAdvertisingStartDate: er.flyerAdvertisingStartDate || 0,
    flyerAdditionalRequests: er.flyerAdditionalRequests || "",
    photographyNeeded: er.photographyNeeded || false,
    requiredLogos: er.requiredLogos || [],
    otherLogos: er.otherLogos || [],
    advertisingFormat: er.advertisingFormat || "",
    additionalSpecifications: er.additionalSpecifications || "",
    flyersCompleted: er.flyersCompleted || false,
    graphicsUploadNote: er.graphicsUploadNote || "",
  };
}

// Map from Convex events to EventRequest type (published events)
function mapEventToType(event: any): EventRequest {
  return {
    _id: event._id,
    _creationTime: event._creationTime,
    eventName: event.eventName || "Untitled Event",
    eventDescription: event.eventDescription || "",
    eventType: normalizeEventType(event.eventType),
    department: normalizeDepartment(event.department),
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
      return "submitted";
    case "pending":
      return "pending";
    case "needs_review":
      return "needs_review";
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
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "startDate",
    direction: "desc",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(
    null
  );
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDraftViewModalOpen, setIsDraftViewModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<EventRequest | null>(
    null
  );
  const [editingDraft, setEditingDraft] = useState<EventRequest | null>(null);

  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Transform data to EventRequest type
  const allEvents: EventRequest[] = useMemo(() => {
    const requests = (eventRequestsData || []).map(mapEventRequestToType);
    const events = (eventsData || []).map(mapEventToType);
    return [...requests, ...events];
  }, [eventRequestsData, eventsData]);

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

      // Date range filter
      const startDateMatch =
        !filters.startDate || event.startDate >= filters.startDate;
      const endDateMatch =
        !filters.endDate || event.endDate <= filters.endDate;

      return searchMatch && startDateMatch && endDateMatch;
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

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedEvents, currentPage, itemsPerPage]);

  // Reset page on filter/sort change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

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
        eventType: normalizeEventType(data.eventType),
        department: data.department,
        expectedAttendance: data.estimatedAttendance,
        flyersNeeded: data.needsFlyers,
        needsGraphics: data.needsGraphics,
        needsAsFunding: data.needsASFunding,
        invoices: data.invoices.map((inv) => ({
          id: inv._id,
          vendor: inv.vendor,
          items: inv.items.length > 0 ? inv.items : [{ description: inv.description, quantity: 1, unitPrice: inv.amount, total: inv.amount }],
          tax: inv.tax || 0,
          tip: inv.tip || 0,
          subtotal: inv.subtotal || inv.amount,
          total: inv.total || inv.amount,
          additionalFiles: inv.additionalFiles || ([] as string[]),
          invoiceFile: inv.invoiceFile,
        })),
        isDraft: false,
        flyersCompleted: data.flyersCompleted,
        photographyNeeded: data.photographyNeeded,
        requiredLogos: data.requiredLogos,
        otherFlyerType: data.otherFlyerType,
        flyerAdvertisingStartDate: data.flyerAdvertisingStartDate,
        flyerAdditionalRequests: data.flyerAdditionalRequests,
        advertisingFormat: data.advertisingFormat,
        otherLogos: data.otherLogos,
        asFundingRequired: data.asFundingRequired,
        flyerType: data.flyerType,
        willOrHaveRoomBooking: data.willOrHaveRoomBooking,
        roomBookingFiles: data.roomBookingFiles,
        foodDrinksBeingServed: data.foodDrinksBeingServed,
        additionalSpecifications: data.additionalSpecifications,
        graphicsUploadNote: data.graphicsUploadNote || undefined,
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
        eventType: normalizeEventType(data.eventType),
        department: data.department,
        expectedAttendance: data.estimatedAttendance,
        flyersNeeded: data.needsFlyers,
        needsGraphics: data.needsGraphics,
        needsAsFunding: data.needsASFunding,
        invoices: data.invoices.map((inv) => ({
          id: inv._id,
          vendor: inv.vendor,
          items: inv.items.length > 0 ? inv.items : [{ description: inv.description, quantity: 1, unitPrice: inv.amount, total: inv.amount }],
          tax: inv.tax || 0,
          tip: inv.tip || 0,
          subtotal: inv.subtotal || inv.amount,
          total: inv.total || inv.amount,
          additionalFiles: inv.additionalFiles || [],
          invoiceFile: inv.invoiceFile,
        })),
        flyerType: data.flyerType,
        otherFlyerType: data.otherFlyerType,
        flyerAdvertisingStartDate: data.flyerAdvertisingStartDate,
        flyerAdditionalRequests: data.flyerAdditionalRequests,
        photographyNeeded: data.photographyNeeded,
        requiredLogos: data.requiredLogos,
        otherLogos: data.otherLogos,
        advertisingFormat: data.advertisingFormat,
        willOrHaveRoomBooking: data.willOrHaveRoomBooking,
        roomBookingFiles: data.roomBookingFiles,
        asFundingRequired: data.asFundingRequired,
        foodDrinksBeingServed: data.foodDrinksBeingServed,
        additionalSpecifications: data.additionalSpecifications,
        flyersCompleted: data.flyersCompleted,
        graphicsUploadNote: data.graphicsUploadNote || undefined,
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

  // Status change handler (from EventViewModal dropdown)
  const handleStatusChange = async (event: EventRequest, newStatus: EventStatus) => {
    if (!logtoId) return;
    if (newStatus === "declined") {
      handleDecline(event);
      return;
    }
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: newStatus === "needs_review" ? "needs_review" : newStatus as any,
      });
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      // Update local state so the modal reflects the change
      setSelectedRequest((prev) =>
        prev && prev._id === event._id ? { ...prev, status: newStatus } : prev
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle publish handler
  const handleTogglePublish = async (event: EventRequest, shouldPublish: boolean) => {
    if (!logtoId) return;
    setIsProcessing(true);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: event._id,
        status: shouldPublish ? ("completed" as any) : "approved",
      });
      toast.success(shouldPublish ? "Event published!" : "Event unpublished");
      setSelectedRequest((prev) =>
        prev && prev._id === event._id
          ? { ...prev, status: shouldPublish ? "published" : "approved" }
          : prev
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle publish");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateGraphics = async (
    event: EventRequest,
    updates: { flyersCompleted: boolean; graphicsUploadNote?: string }
  ) => {
    if (!logtoId) return;
    if (event.status === "published") {
      toast.error("Graphics updates are only available for event requests.");
      return;
    }

    setIsProcessing(true);
    try {
      await updateEventRequest({
        logtoId,
        id: event._id,
        flyersCompleted: updates.flyersCompleted,
        graphicsUploadNote: updates.graphicsUploadNote,
      });
      setSelectedRequest((prev) =>
        prev && prev._id === event._id ? { ...prev, ...updates } : prev
      );
      toast.success("Graphics status updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update graphics status");
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
        eventType: normalizeEventType((data.eventType as string | undefined) || "other"),
        department: normalizeDepartment(data.department),
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
        graphicsUploadNote: "",
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
    if (event.status === "draft") {
      setIsDraftViewModalOpen(true);
    } else {
      setIsViewModalOpen(true);
    }
  };

  // Edit handler from view modal
  const handleEditFromView = (event: EventRequest) => {
    setIsViewModalOpen(false);
    if (event.status === "draft") {
      setEditingDraft(event);
      setIsDraftModalOpen(true);
    } else {
      setEditingRequest(event);
      setIsWizardOpen(true);
    }
  };

  // Update draft handler
  const handleUpdateDraft = async (data: Partial<EventRequest>) => {
    if (!logtoId || !editingDraft) return;
    setIsProcessing(true);
    try {
      await updateEventRequest({
        logtoId,
        id: editingDraft._id,
        name: data.eventName || editingDraft.eventName,
        location: data.location || editingDraft.location,
        startDateTime: data.startDate || editingDraft.startDate,
        endDateTime: data.endDate || editingDraft.endDate,
        eventDescription: data.eventDescription || editingDraft.eventDescription,
        eventType: normalizeEventType((data.eventType as string | undefined) || editingDraft.eventType),
        department: normalizeDepartment(data.department || editingDraft.department),
        expectedAttendance: data.estimatedAttendance,
        flyersNeeded: data.needsFlyers ?? false,
        needsGraphics: data.needsGraphics ?? false,
        needsAsFunding: data.needsASFunding ?? false,
        flyerType: data.flyerType || [],
        willOrHaveRoomBooking: data.willOrHaveRoomBooking ?? false,
        roomBookingFiles: data.roomBookingFiles || [],
        asFundingRequired: data.asFundingRequired ?? false,
        foodDrinksBeingServed: data.foodDrinksBeingServed ?? false,
        photographyNeeded: data.photographyNeeded ?? false,
        requiredLogos: data.requiredLogos || [],
        graphicsUploadNote: data.graphicsUploadNote || editingDraft.graphicsUploadNote || "",
      });
      toast.success("Draft updated successfully!");
      setIsDraftModalOpen(false);
      setEditingDraft(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update draft");
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear filters handler
  const handleClearFilters = () => {
    setFilters({
      search: "",
      startDate: undefined,
      endDate: undefined,
    });
    setCurrentPage(1);
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

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <List className="h-4 w-4" />
          Events List
        </button>
        <button
          onClick={() => setViewMode("calendar")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "calendar"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
          Event Planning
        </button>
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
              events={paginatedEvents}
              sortConfig={sortConfig}
              onSort={handleSort}
              onView={(event) => {
                setSelectedRequest(event);
                if (event.status === "draft") {
                  setIsDraftViewModalOpen(true);
                } else {
                  setIsViewModalOpen(true);
                }
              }}
              onEdit={(event) => {
                if (event.status === "draft") {
                  setEditingDraft(event);
                  setIsDraftModalOpen(true);
                } else {
                  setEditingRequest(event);
                  setIsWizardOpen(true);
                }
              }}
              onDelete={handleDelete}
              onConvertToDraft={handleConvertToDraft}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: setCurrentPage,
              }}
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
        onDecline={hasAdminAccess ? handleDecline : undefined}
        onStatusChange={hasAdminAccess ? handleStatusChange : undefined}
        onTogglePublish={hasAdminAccess ? handleTogglePublish : undefined}
        canManageStatus={hasAdminAccess}
        onUpdateGraphics={handleUpdateGraphics}
      />

      {/* Draft View Modal */}
      <DraftViewModal
        isOpen={isDraftViewModalOpen}
        onClose={() => {
          setIsDraftViewModalOpen(false);
          setSelectedRequest(null);
        }}
        event={selectedRequest}
        onEdit={(event) => {
          setIsDraftViewModalOpen(false);
          setEditingDraft(event);
          setIsDraftModalOpen(true);
        }}
        onDelete={handleDelete}
        onConvertToRequest={(event) => {
          setIsDraftViewModalOpen(false);
          setSelectedRequest(null);
          setEditingRequest({
            ...event,
            status: "draft",
          } as EventRequest);
          setIsWizardOpen(true);
        }}
      />

      {/* Draft Event Modal */}
      <DraftEventModal
        isOpen={isDraftModalOpen}
        onClose={() => {
          setIsDraftModalOpen(false);
          setEditingDraft(null);
        }}
        onSubmit={editingDraft ? handleUpdateDraft : handleCreateDraft}
        initialData={editingDraft || undefined}
        onConvertToRequest={(data) => {
          setIsDraftModalOpen(false);
          setEditingDraft(null);
          // Open wizard with draft data prefilled
          setEditingRequest({
            ...data,
            _id: editingDraft?._id,
            _creationTime: editingDraft?._creationTime || Date.now(),
            status: "draft",
            createdBy: editingDraft?.createdBy || "Unknown",
          } as EventRequest);
          setIsWizardOpen(true);
        }}
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
