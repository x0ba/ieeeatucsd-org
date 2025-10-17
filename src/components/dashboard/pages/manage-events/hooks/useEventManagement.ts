import { useState, useEffect, useMemo } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { app } from "../../../../../firebase/client";
import { PublicProfileService } from "../../../shared/services/publicProfile";
import { EmailClient } from "../../../../../scripts/email/EmailClient";
import type { UserRole } from "../../../shared/types/firestore";
import type { EventStats } from "../types";

interface EventRequest {
  id: string;
  name: string;
  location: string;
  startDateTime: any;
  endDateTime: any;
  eventDescription: string;
  status: string;
  requestedUser: string;
  createdAt: any;
  needsGraphics?: boolean;
  needsAsFunding?: boolean;
  graphicsCompleted?: boolean;
  graphicsFiles?: string[];
  [key: string]: any;
}

export function useEventManagement(userId: string | undefined) {
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [users, setUsers] = useState<
    Record<string, { name: string; email: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("Member");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 10;

  const db = getFirestore(app);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const publicProfiles = await PublicProfileService.getLeaderboard();
      const usersMap: Record<string, { name: string; email: string }> = {};

      publicProfiles.forEach((profile) => {
        usersMap[profile.id] = {
          name: profile.name || "Unknown User",
          email: "",
        };
      });

      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);

        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          // Update existing entries with email data, or create new ones
          if (usersMap[doc.id]) {
            usersMap[doc.id].email = data.email || "";
          } else {
            usersMap[doc.id] = {
              name: data.name || data.email || "Unknown User",
              email: data.email || "",
            };
          }
        });
      } catch (fallbackError) {
        console.warn(
          "Could not fetch additional user data from users collection:",
          fallbackError,
        );
      }

      setUsers(usersMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Get user name helper
  const getUserName = (userId: string) => {
    try {
      if (!userId || !users) return userId || "Unknown User";
      return users[userId]?.name || userId;
    } catch (error) {
      console.error("Error getting user name:", error);
      return userId || "Unknown User";
    }
  };

  // Setup real-time listener and fetch user role
  useEffect(() => {
    if (!userId) return;

    fetchUsers();

    const fetchUserRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role || "Member");
        } else {
          setCurrentUserRole("Member");
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setCurrentUserRole("Member");
      }
    };

    fetchUserRole();

    const eventRequestsRef = collection(db, "event_requests");
    const q = query(eventRequestsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventRequestsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as EventRequest[];

        setEventRequests(eventRequestsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error in real-time listener:", error);
        setError("Failed to fetch event requests: " + error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [db, userId]);

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
      setError(null);

      const eventRequestDoc = await getDoc(
        doc(db, "event_requests", requestId),
      );
      const eventRequestData = eventRequestDoc.exists()
        ? eventRequestDoc.data()
        : null;

      let userData = null;
      if (eventRequestData?.requestedUser) {
        const userDoc = await getDoc(
          doc(db, "users", eventRequestData.requestedUser),
        );
        userData = userDoc.exists() ? userDoc.data() : null;
      }

      await deleteDoc(doc(db, "event_requests", requestId));

      const eventsRef = collection(db, "events");
      const eventsQuery = query(eventsRef, where("eventName", "==", eventName));
      const eventsSnapshot = await getDocs(eventsQuery);

      const deletePromises = eventsSnapshot.docs.map((eventDoc) =>
        deleteDoc(doc(db, "events", eventDoc.id)),
      );
      await Promise.all(deletePromises);

      if (eventRequestData && userData) {
        try {
          await EmailClient.notifyFirebaseEventDelete(
            requestId,
            eventName,
            eventRequestData.location || "",
            userData.name || userData.email || "Unknown User",
            userData.email || "",
            eventRequestData.status || "unknown",
          );
        } catch (emailError) {
          console.error("Failed to send deletion email:", emailError);
        }
      }

      setSuccess(`Event request "${eventName}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting event request:", error);
      setError("Failed to delete event request");
    }
  };

  // Update event status
  const handleUpdateEventStatus = async (
    requestId: string,
    newStatus: string,
    declinedReason?: string,
  ) => {
    try {
      setError(null);

      const currentEventRequest = eventRequests.find(
        (req) => req.id === requestId,
      );
      const previousStatus = currentEventRequest?.status;

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (declinedReason) {
        updateData.declinedReason = declinedReason;
      }

      await updateDoc(doc(db, "event_requests", requestId), updateData);

      const eventsQuery = query(
        collection(db, "events"),
        where("createdFrom", "==", requestId),
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        const eventDoc = eventsSnapshot.docs[0];
        const shouldPublish = newStatus === "approved";
        await updateDoc(doc(db, "events", eventDoc.id), {
          published: shouldPublish,
          updatedAt: new Date(),
        });
      }

      if (previousStatus && previousStatus !== newStatus) {
        try {
          await EmailClient.notifyFirebaseEventRequestStatusChange(
            requestId,
            newStatus,
            previousStatus,
            undefined,
            declinedReason,
          );
        } catch (emailError) {
          console.error("Failed to send status change email:", emailError);
        }
      }

      setSuccess(
        `Event request status updated to ${newStatus}${newStatus === "approved" ? " and published" : ""}`,
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      setError("Failed to update event status");
    }
  };

  // Filter and sort events
  const filteredEventRequests = useMemo(() => {
    return eventRequests.filter((request) => {
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

        return matchesSearch;
      } catch (error) {
        console.error("Error filtering event request:", error, request);
        return true;
      }
    });
  }, [eventRequests, searchTerm, users]);

  const sortedEventRequests = useMemo(() => {
    return [...filteredEventRequests].sort((a, b) => {
      switch (sortBy) {
        case "date-desc": {
          const aStart =
            a.startDateTime?.toDate?.() ||
            (a.startDateTime?.toMillis
              ? new Date(a.startDateTime.toMillis())
              : null);
          const bStart =
            b.startDateTime?.toDate?.() ||
            (b.startDateTime?.toMillis
              ? new Date(b.startDateTime.toMillis())
              : null);
          const aDate = aStart || a.createdAt?.toDate?.() || new Date(0);
          const bDate = bStart || b.createdAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        }
        case "date-asc": {
          const aStart =
            a.startDateTime?.toDate?.() ||
            (a.startDateTime?.toMillis
              ? new Date(a.startDateTime.toMillis())
              : null);
          const bStart =
            b.startDateTime?.toDate?.() ||
            (b.startDateTime?.toMillis
              ? new Date(b.startDateTime.toMillis())
              : null);
          const aDate = aStart || a.createdAt?.toDate?.() || new Date(0);
          const bDate = bStart || b.createdAt?.toDate?.() || new Date(0);
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
    const total = eventRequests.length;
    const published = eventRequests.filter(
      (req) => req.status === "approved",
    ).length;
    const drafts = eventRequests.filter(
      (req) => req.status === "submitted" || req.status === "pending",
    ).length;
    return { total, published, drafts, totalAttendees: 0 };
  }, [eventRequests]);

  return {
    eventRequests,
    paginatedEventRequests,
    sortedEventRequests,
    users,
    loading,
    error,
    success,
    currentUserRole,
    searchTerm,
    sortBy,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    eventsPerPage,
    stats,
    setError,
    setSuccess,
    setSearchTerm,
    setSortBy,
    setCurrentPage,
    handleDeleteRequest,
    handleUpdateEventStatus,
    getUserName,
  };
}
