import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Users } from "lucide-react";

export const Route = createFileRoute("/_dashboard/manage-users")({
  component: ManageUsersPage,
});

function ManageUsersPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const users = useQuery(api.users.list, logtoId ? { logtoId } : "skip");
  const [search, setSearch] = useState("");

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const filtered = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">View and manage user accounts and roles.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      {!users ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((u) => (
            <div key={u._id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.name}</p>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{u.role}</Badge>
                <Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No users found.</p>
        </div>
      )}
    </div>
  );
}
