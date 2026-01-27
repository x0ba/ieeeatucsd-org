import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from '../../../../../../convex/_generated/api';
import type { UserRole } from "../../shared/types/constitution";
import type { EventStats } from "../types";
import { showToast } from "../../../shared/utils/toast";
import { useCurrentUser } from "../../../hooks/useConvexAuth";

interface EventRequest {
  id: string;
  name: string;
  location: string;
  startDateTime: number;
  endDateTime: number;
  eventDescription: string;
  status: string;
  requestedUser: string;
  createdAt: number;
  needsGraphics?: boolean;
  needsAsFunding?: boolean;
  graphicsCompleted?: boolean;
  graphicsFiles?: string[];
  published?: boolean;
  isDraft?: boolean;
  [key: string]: any;
}

export function useEventManagement(userId: string | undefined) {
  const currentUser = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const eventsPerPage = 10;

  // Fetch event requests from Convex
  const eventRequests = useQuery(api.eventManagement.getAllEventRequests);
  
  // Fetch users for name/email mapping
  const users = useQuery(api.users.getUsers) || [];

  // Fetch event attendees for attendance stats
  const allAttendees = useQuery(api.events.getEventAttendees, { 
    eventId: "000000000000000000000000" as any 
  }) || [];

  // Mutations
  const deleteRequest = useMutation(api.eventManagement.deleteEventRequest);
  const updateStatus = useMutation(api.eventManagement.updateEventRequest);

  // Calculate attendance stats
  const attendanceStats = useMemo(() => {
    const totalAttendees = allAttendees.length;
    const uniqueUserIds = new Set(allAttendees.map((a: any) => a.authUserId));
    return {
      totalAttendees,
      uniqueAttendees: uniqueUserIds.size,
    };
  }, [allAttendees]);

  const currentUserRole = currentUser?.role || "Member";

  // Get user name helper
  const getUserName = (userAuthId: string) => {
    try {
      if (!userAuthId || !users) return userAuthId || "Unknown User";
      const user = users.find((u: any) => u.authUserId === userAuthId);
      return user?.name || userAuthId;
    } catch (error) {
      console.error("Error getting user name:", error);
      return userAuthId || "Unknown User";
    }
  };

  // Helper function to get date range based on filter
  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case "last7days":
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        };
      case "last30days":
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now
        };
      case "last3months":
        return {
          start: new Date(today.getFullYear(), today.getMonth() - 3, today.getDate()),
          end: now
        };
      case "all":
      default:
        return null;
    }
  };

  // Filter and sort events
  const filteredEventRequests = useMemo(() => {
    return (eventRequests || []).filter((request: any) => {
      try {
        const matchesSearch =
          searchTerm === "" ||
          (request.name &&
            request.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (request.location &&
            request.location
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (request.requestedUser &&
            getUserName(request.requestedUser)
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        // Check date range filter
        let matchesDateRange = true;
        if (dateRangeFilter !== "all") {
          const dateRange = getDateRange(dateRangeFilter);
          if (dateRange) {
            const eventDate = request.startDateTime
              ? new Date(request.startDateTime)
              : request.createdAt
              ? new Date(request.createdAt)
              : new Date(0);

            matchesDateRange = eventDate >= dateRange.start && eventDate <= dateRange.end;
          }
        }

        // Check status filter
        let matchesStatus = true;
        if (statusFilter !== "all") {
          matchesStatus = request.status === statusFilter;
        }

        return matchesSearch && matchesDateRange && matchesStatus;
      } catch (error) {
        console.error("Error filtering event request:", error, request);
        return true;
      }
    });
  }, [eventRequests, searchTerm, users, dateRangeFilter, statusFilter]);

  const sortedEventRequests = useMemo(() => {
    return [...filteredEventRequests].sort((a: any, b: any) => {
      switch (sortBy) {
        case "date-desc": {
          const aStart = a.startDateTime ? new Date(a.startDateTime) : null;
          const bStart = b.startDateTime ? new Date(b.startDateTime) : null;
          const aDate = aStart || (a.createdAt ? new Date(a.createdAt) : new Date(0));
          const bDate = bStart || (b.createdAt ? new Date(b.createdAt) : new Date(0));
          return bDate.getTime() - aDate.getTime();
        }
        case "date-asc": {
          const aStart = a.startDateTime ? new Date(a.startDateTime) : null;
          const bStart = b.startDateTime ? new Date(b.startDateTime) : null;
          const aDate = aStart || (a.createdAt ? new Date(a.createdAt) : new Date(0));
          const bDate = bStart || (b.createdAt ? new Date(b.createdAt) : new Date(0));
          return aDate.getTime() - bDate.getTime();
        }
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "status-asc":
          return a.status.localeCompare(b.status);
        case "status-desc":
          return b.status.localeCompare(a.status);
        default:
          return 0;
      }
    });
  }, [filteredEventRequests, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedEventRequests.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const paginatedEventRequests = sortedEventRequests.slice(
    startIndex,
    endIndex,
  );

  // Calculate stats
  const stats: EventStats = useMemo(() => {
    const total = (eventRequests || []).length;
    const published = (eventRequests || []).filter(
      (req: any) => req.status === "approved",
    ).length;
    const drafts = (eventRequests || []).filter(
      (req: any) => req.status === "submitted" || req.status === "pending",
    ).length;

    const { totalAttendees, uniqueAttendees } = attendanceStats;

    return {
      total,
      published,
      drafts,
      totalAttendees,
      uniqueAttendees,
    };
  }, [eventRequests, attendanceStats]);

  // Delete event request
  const handleDeleteRequest = async (requestId: string, eventName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the event request "${eventName}"? This will also delete any corresponding published event.`,
      )
    ) {
      return;
    }

    try {
      await deleteRequest({ requestId });
      showToast.success(`Event request "${eventName}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting event request:", error);
      showToast.error("Failed to delete event request");
    }
  };

  // Update event status
  const handleUpdateEventStatus = async (
    requestId: string,
    newStatus: string,
    declinedReason?: string,
  ) => {
    try {
      const updateData: any = {
        requestId,
        status: newStatus as any,
        updatedBy: currentUser?.authUserId || "",
      };

      if (declinedReason) {
        updateData.declinedReason = declinedReason;
      }

      await updateStatus(updateData);

      showToast.success(
        `Event request status updated to ${newStatus}${newStatus === "approved" ? " and published" : ""}`,
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      showToast.error("Failed to update event status");
    }
  };

  return {
    eventRequests: eventRequests || [],
    paginatedEventRequests,
    sortedEventRequests,
    users: users.reduce((acc: any, user: any) => {
      acc[user.authUserId] = {
        name: user.name || user.email || "Unknown User",
        email: user.email || "",
        pid: user.pid,
      };
      return acc;
    }, {}),
    loading: eventRequests === undefined,
    attendanceLoading: allAttendees === undefined,
    currentUserRole,
    searchTerm,
    sortBy,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    eventsPerPage,
    stats,
    dateRangeFilter,
    statusFilter,
    setSearchTerm,
    setSortBy,
    setCurrentPage,
    setDateRangeFilter,
    setStatusFilter,
    handleDeleteRequest,
    handleUpdateEventStatus,
    getUserName,
  };
}
