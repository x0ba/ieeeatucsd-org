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
import { sendNotification } from "@/lib/send-notification";
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
		sourceType: "request",
		requestId: er._id,
		eventId: er.eventId,
		_creationTime: er._creationTime,
		eventName: er.name || "Untitled Event",
		eventDescription: er.eventDescription || "",
		eventType: normalizeEventType(er.eventType),
		department: normalizeDepartment(er.department),
		location: er.location || "TBD",
		startDate: er.startDateTime || Date.now(),
		endDate: er.endDateTime || Date.now() + 3600000,
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
		createdBy:
			er.submitterName || er.requestedUser || er.createdBy || "Unknown",
		requestedUser: er.requestedUser,
		_updatedAt: er._updatedAt,
		attendeeCount: 0,
		attendees: [],
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
		sourceType: "event",
		eventId: event._id,
		_creationTime: event._creationTime,
		eventName: event.eventName || "Untitled Event",
		eventDescription: event.eventDescription || "",
		eventType: normalizeEventType(event.eventType),
		department: normalizeDepartment(event.department),
		location: event.location || "TBD",
		startDate: event.startDate || Date.now(),
		endDate: event.endDate || Date.now() + 3600000,
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
		attendeeCount: event.attendeeCount || 0,
		attendees: event.attendees || [],
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

function normalizeMatchText(value?: string) {
	return (value || "").trim().toLowerCase();
}

function normalizeMatchTime(value?: number) {
	if (!value) return 0;
	// Tolerate small timestamp drifts by matching at minute precision.
	return Math.floor(value / 60000);
}

function getMatchKeys(event: Pick<EventRequest, "eventCode" | "eventName" | "location" | "startDate" | "endDate">) {
	const keys: string[] = [];
	const code = normalizeMatchText(event.eventCode);
	if (code) {
		keys.push(`code:${code}`);
	}

	keys.push(
		`meta:${normalizeMatchText(event.eventName)}|${normalizeMatchText(
			event.location,
		)}|${normalizeMatchTime(event.startDate)}|${normalizeMatchTime(
			event.endDate,
		)}`,
	);

	return keys;
}

function ManageEventsPage() {
	const { hasOfficerAccess, hasAdminAccess, logtoId, user } = usePermissions();

	// Convex queries
	const eventRequestsData = useQuery(
		api.eventRequests.listAll,
		logtoId ? { logtoId } : "skip",
	);
	const eventsData = useQuery(
		api.events.listAll,
		logtoId ? { logtoId } : "skip",
	);

	// Convex mutations
	const createEventRequest = useMutation(api.eventRequests.create);
	const updateEventRequest = useMutation(api.eventRequests.update);
	const updateEventRequestStatus = useMutation(api.eventRequests.updateStatus);
	const removeEventRequest = useMutation(api.eventRequests.remove);
	const removeEvent = useMutation(api.events.remove);
	const updateEvent = useMutation(api.events.update);

	// View mode state
	const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

	// Filters state
	const [filters, setFilters] = useState<EventFilters>({
		search: "",
		statuses: [],
		teamPreset: undefined,
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
		null,
	);
	const [isWizardOpen, setIsWizardOpen] = useState(false);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [isDraftViewModalOpen, setIsDraftViewModalOpen] = useState(false);
	const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
	const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
	const [editingRequest, setEditingRequest] = useState<EventRequest | null>(
		null,
	);
	const [editingDraft, setEditingDraft] = useState<EventRequest | null>(null);

	// Loading state
	const [isProcessing, setIsProcessing] = useState(false);

	// Transform data to EventRequest type
	const allEvents: EventRequest[] = useMemo(() => {
		const requests = (eventRequestsData || []).map(mapEventRequestToType);
		const events = (eventsData || []).map(mapEventToType);
		const eventsById = new Map(events.map((event) => [event._id, event]));

		const eventBuckets = new Map<string, EventRequest[]>();
		for (const event of events) {
			for (const key of getMatchKeys(event)) {
				const bucket = eventBuckets.get(key);
				if (bucket) {
					bucket.push(event);
				} else {
					eventBuckets.set(key, [event]);
				}
			}
		}

		const consumedEventIds = new Set<string>();
		const mergedRows: EventRequest[] = requests.map((request) => {
			const linkedEvent =
				request.eventId && eventsById.get(request.eventId as string);

			if (linkedEvent && !consumedEventIds.has(linkedEvent._id)) {
				consumedEventIds.add(linkedEvent._id);
				return {
					...request,
					sourceType: "merged_published",
					eventId: linkedEvent.eventId,
					status:
						linkedEvent.status === "published"
							? "published"
							: request.status,
					attendeeCount: linkedEvent.attendeeCount || 0,
					attendees: linkedEvent.attendees || [],
				};
			}

			const candidateEvents = getMatchKeys(request).flatMap(
				(key) => eventBuckets.get(key) || [],
			);
			let matchedEvent = candidateEvents.find(
				(event) => !consumedEventIds.has(event._id),
			);
			if (!matchedEvent) {
				const requestName = normalizeMatchText(request.eventName);
				const requestCode = normalizeMatchText(request.eventCode);
				matchedEvent = events.find((event) => {
					if (consumedEventIds.has(event._id)) return false;
					const eventCode = normalizeMatchText(event.eventCode);
					if (requestCode && eventCode && requestCode === eventCode) return true;
					const eventName = normalizeMatchText(event.eventName);
					const startsWithinOneDay =
						Math.abs((event.startDate || 0) - (request.startDate || 0)) <=
						24 * 60 * 60 * 1000;
					return requestName && eventName === requestName && startsWithinOneDay;
				});
			}

			if (!matchedEvent) {
				// Published/completed items should be rendered from the canonical
				// events table row so attendee counts stay accurate.
				if (request.status === "published") {
					return null;
				}
				return request;
			}

			consumedEventIds.add(matchedEvent._id);
			return {
				...request,
				sourceType: "merged_published",
				eventId: matchedEvent.eventId,
				status: matchedEvent.status === "published" ? "published" : request.status,
				attendeeCount: matchedEvent.attendeeCount || 0,
				attendees: matchedEvent.attendees || [],
			};
		});

		const unmatchedEvents = events.filter(
			(event) => !consumedEventIds.has(event._id),
		);

		return [...mergedRows.filter(Boolean), ...unmatchedEvents] as EventRequest[];
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

			// Status multi-select filter
			const statusMatch =
				!filters.statuses || filters.statuses.length === 0
					? true
					: filters.statuses.includes(event.status);

			// Team presets
			let teamPresetMatch = true;
			if (filters.teamPreset === "for_internal") {
				const hasMarketingNeed = Boolean(
					event.needsGraphics || event.needsFlyers || event.photographyNeeded,
				);
				teamPresetMatch =
					(event.status === "approved" || event.status === "published") &&
					hasMarketingNeed;
			} else if (filters.teamPreset === "for_operations") {
				teamPresetMatch = ["submitted", "pending", "needs_review"].includes(
					event.status,
				);
			}

			return searchMatch && statusMatch && teamPresetMatch;
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
					items:
						inv.items.length > 0
							? inv.items
							: [
									{
										description: inv.description,
										quantity: 1,
										unitPrice: inv.amount,
										total: inv.amount,
									},
								],
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

			// Fire-and-forget email notification
			if (logtoId) {
				sendNotification(logtoId, "event_request_submitted", {
					eventRequestId: "(new)",
					name: data.eventName,
					location: data.location,
					startDateTime: data.startDate,
					endDateTime: data.endDate,
					eventDescription: data.eventDescription,
					department: data.department,
					expectedAttendance: data.estimatedAttendance,
					needsGraphics: data.needsGraphics,
					needsAsFunding: data.needsASFunding,
					flyersNeeded: data.needsFlyers,
					photographyNeeded: data.photographyNeeded,
					submitterName: user?.name || "Unknown",
					submitterEmail: user?.email || "",
				});
			}

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
			if (editingRequest.requestId) {
				await updateEventRequest({
					logtoId,
					id: editingRequest.requestId,
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
						items:
							inv.items.length > 0
								? inv.items
								: [
										{
											description: inv.description,
											quantity: 1,
											unitPrice: inv.amount,
											total: inv.amount,
										},
									],
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
			} else if (editingRequest.eventId) {
				await updateEvent({
					logtoId,
					id: editingRequest.eventId,
					eventName: data.eventName,
					eventDescription: data.eventDescription,
					eventCode: data.eventCode,
					location: data.location,
					startDate: data.startDate,
					endDate: data.endDate,
					eventType: normalizeEventType(data.eventType),
					hasFood: data.hasFood,
				});
				toast.success("Event updated successfully!");
			} else {
				throw new Error("Could not determine whether this row is a request or event.");
			}
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
			if (event.eventId) {
				await removeEvent({
					logtoId,
					id: event.eventId,
				});
				// If this row is tied to a request, keep the request but move it out of published state.
				if (event.requestId) {
					await updateEventRequestStatus({
						logtoId,
						id: event.requestId,
						status: "approved",
					});
				}
				toast.success("Event deleted successfully!");
			} else if (event.requestId) {
				await removeEventRequest({
					logtoId,
					id: event.requestId,
				});
				toast.success("Event request deleted successfully!");
			} else {
				throw new Error("Unable to determine what to delete");
			}
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
			if (event.requestId) {
				await updateEventRequestStatus({
					logtoId,
					id: event.requestId,
					status: "draft",
				});
			}
			if (event.eventId && !event.requestId) {
				await updateEvent({
					logtoId,
					id: event.eventId,
					published: false,
				});
			}
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
		if (!event.requestId) {
			toast.error("Only event requests can be declined");
			return;
		}
		const reason = prompt("Enter reason for declining:");
		if (!reason) return;
		setIsProcessing(true);
		try {
			await updateEventRequestStatus({
				logtoId,
				id: event.requestId,
				status: "declined",
				declinedReason: reason,
			});
			toast.success("Event declined");

			sendNotification(logtoId, "event_request_status_changed", {
				eventRequestId: event.requestId,
				name: event.eventName,
				location: event.location,
				startDateTime: event.startDate,
				newStatus: "declined",
				previousStatus: event.status,
				declinedReason: reason,
				changedByName: user?.name || "Admin",
				requestedUser: event.requestedUser,
			});

			setIsViewModalOpen(false);
		} catch (error: any) {
			toast.error(error.message || "Failed to decline event");
		} finally {
			setIsProcessing(false);
		}
	};

	// Status change handler (from EventViewModal dropdown)
	const handleStatusChange = async (
		event: EventRequest,
		newStatus: EventStatus,
	) => {
		if (!logtoId) return;
		if (newStatus === "declined") {
			handleDecline(event);
			return;
		}
		setIsProcessing(true);
		try {
			let statusUpdated = false;
			if (event.requestId) {
				await updateEventRequestStatus({
					logtoId,
					id: event.requestId,
					status:
						newStatus === "needs_review" ? "needs_review" : (newStatus as any),
				});
				statusUpdated = true;
			}

			if (event.eventId) {
				if (newStatus === "published") {
					await updateEvent({
						logtoId,
						id: event.eventId,
						published: true,
					});
				} else if (newStatus === "approved" || newStatus === "draft") {
					await updateEvent({
						logtoId,
						id: event.eventId,
						published: false,
					});
				} else if (!statusUpdated) {
					throw new Error("Selected status is not valid for a published event");
				}
			} else if (!statusUpdated) {
				throw new Error("Unable to update status for this item");
			}

			toast.success(`Status updated to ${newStatus.replace("_", " ")}`);

			if (event.requestId) {
				sendNotification(logtoId, "event_request_status_changed", {
					eventRequestId: event.requestId,
					name: event.eventName,
					location: event.location,
					startDateTime: event.startDate,
					newStatus,
					previousStatus: event.status,
					changedByName: user?.name || "Admin",
					requestedUser: event.requestedUser,
				});
			}

			// Update local state so the modal reflects the change
			setSelectedRequest((prev) =>
				prev && prev._id === event._id ? { ...prev, status: newStatus } : prev,
			);
		} catch (error: any) {
			toast.error(error.message || "Failed to update status");
		} finally {
			setIsProcessing(false);
		}
	};

	// Toggle publish handler
	const handleTogglePublish = async (
		event: EventRequest,
		shouldPublish: boolean,
	) => {
		if (!logtoId) return;
		setIsProcessing(true);
		try {
			if (event.requestId) {
				await updateEventRequestStatus({
					logtoId,
					id: event.requestId,
					status: shouldPublish ? ("completed" as any) : "approved",
				});
			}
			if (event.eventId) {
				await updateEvent({
					logtoId,
					id: event.eventId,
					published: shouldPublish,
				});
			}
			toast.success(shouldPublish ? "Event published!" : "Event unpublished");
			setSelectedRequest((prev) =>
				prev && prev._id === event._id
					? { ...prev, status: shouldPublish ? "published" : "approved" }
					: prev,
			);
		} catch (error: any) {
			toast.error(error.message || "Failed to toggle publish");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleUpdateGraphics = async (
		event: EventRequest,
		updates: { flyersCompleted: boolean; graphicsUploadNote?: string },
	) => {
		if (!logtoId) return;
		if (!event.requestId) {
			toast.error("Graphics updates are only available for event requests.");
			return;
		}
		if (event.status === "published") {
			toast.error("Graphics updates are only available for event requests.");
			return;
		}

		setIsProcessing(true);
		try {
			await updateEventRequest({
				logtoId,
				id: event.requestId,
				flyersCompleted: updates.flyersCompleted,
				graphicsUploadNote: updates.graphicsUploadNote,
			});
			setSelectedRequest((prev) =>
				prev && prev._id === event._id ? { ...prev, ...updates } : prev,
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
				eventType: normalizeEventType(
					(data.eventType as string | undefined) || "other",
				),
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
			if (editingDraft.requestId) {
				await updateEventRequest({
					logtoId,
					id: editingDraft.requestId,
					name: data.eventName || editingDraft.eventName,
					location: data.location || editingDraft.location,
					startDateTime: data.startDate || editingDraft.startDate,
					endDateTime: data.endDate || editingDraft.endDate,
					eventDescription:
						data.eventDescription || editingDraft.eventDescription,
					eventType: normalizeEventType(
						(data.eventType as string | undefined) || editingDraft.eventType,
					),
					department: normalizeDepartment(
						data.department || editingDraft.department,
					),
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
					graphicsUploadNote:
						data.graphicsUploadNote || editingDraft.graphicsUploadNote || "",
				});
				toast.success("Draft updated successfully!");
			} else if (editingDraft.eventId) {
				await updateEvent({
					logtoId,
					id: editingDraft.eventId,
					eventName: data.eventName || editingDraft.eventName,
					eventDescription:
						data.eventDescription || editingDraft.eventDescription,
					eventCode: data.eventCode || editingDraft.eventCode,
					location: data.location || editingDraft.location,
					startDate: data.startDate || editingDraft.startDate,
					endDate: data.endDate || editingDraft.endDate,
					eventType: normalizeEventType(
						(data.eventType as string | undefined) || editingDraft.eventType,
					),
					hasFood:
						data.hasFood ??
						data.foodDrinksBeingServed ??
						editingDraft.hasFood ??
						false,
				});
				toast.success("Event updated successfully!");
			} else {
				throw new Error("Could not determine whether this draft is request-backed or event-backed.");
			}
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
			statuses: [],
			teamPreset: undefined,
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
					<div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
					<div className="h-64 bg-gray-200 rounded animate-pulse" />
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
					<div className="bg-white rounded-lg p-6 flex items-center gap-3">
						<Loader2 className="h-5 w-5 animate-spin" />
						<span>Processing...</span>
					</div>
				</div>
			)}
		</div>
	);
}
