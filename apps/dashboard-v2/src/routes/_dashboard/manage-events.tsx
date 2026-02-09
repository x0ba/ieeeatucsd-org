import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export const Route = createFileRoute("/_dashboard/manage-events")({
  component: ManageEventsPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-purple-100 text-purple-800",
  needs_review: "bg-orange-100 text-orange-800",
};

function ManageEventsPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const eventRequests = useQuery(api.eventRequests.listAll, logtoId ? { logtoId } : "skip");
  const events = useQuery(api.events.listAll, logtoId ? { logtoId } : "skip");
  const [search, setSearch] = useState("");

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground">
            Review event requests and manage published events.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Event Requests</h2>
        {!eventRequests ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : eventRequests.length > 0 ? (
          <div className="space-y-2">
            {eventRequests
              .filter((er) =>
                er.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((er) => (
                <div
                  key={er._id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{er.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {er.location} &middot;{" "}
                      {new Date(er.startDateTime).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    className={statusColors[er.status] || ""}
                    variant="secondary"
                  >
                    {er.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No event requests.</p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Published Events</h2>
        {!events ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events
              .filter((e) =>
                e.eventName.toLowerCase().includes(search.toLowerCase()),
              )
              .map((event) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{event.eventName}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.location} &middot;{" "}
                      {new Date(event.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={event.published ? "default" : "secondary"}>
                    {event.published ? "Published" : "Draft"}
                  </Badge>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No events yet.</p>
        )}
      </div>
    </div>
  );
}
