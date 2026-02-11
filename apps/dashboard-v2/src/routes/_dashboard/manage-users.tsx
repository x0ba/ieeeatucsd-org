import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/manage-users")({
  component: ManageUsersPage,
});

const ROLES = [
  "Member",
  "General Officer",
  "Executive Officer",
  "Member at Large",
  "Past Officer",
  "Sponsor",
  "Administrator",
] as const;

const TEAMS = ["Internal", "Events", "Projects"] as const;

const roleColors: Record<string, string> = {
  Member: "bg-gray-100 text-gray-800",
  "General Officer": "bg-blue-100 text-blue-800",
  "Executive Officer": "bg-purple-100 text-purple-800",
  "Member at Large": "bg-teal-100 text-teal-800",
  "Past Officer": "bg-orange-100 text-orange-800",
  Sponsor: "bg-yellow-100 text-yellow-800",
  Administrator: "bg-red-100 text-red-800",
};

function ManageUsersPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const users = useQuery(api.users.list, logtoId ? { logtoId } : "skip");
  const updateRole = useMutation(api.users.updateRole);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const startEdit = (user: any) => {
    setEditingId(user._id);
    setEditRole(user.role);
    setEditPosition(user.position || "");
    setEditTeam(user.team || "");
  };

  const handleSaveRole = async (userId: string) => {
    if (!logtoId || !editRole) return;
    setSavingId(userId);
    try {
      await updateRole({
        logtoId,
        userId: userId as any,
        role: editRole as any,
        position: editPosition || undefined,
        team: editTeam ? (editTeam as any) : undefined,
      });
      toast.success("User role updated");
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = users?.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = users
    ? {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        officers: users.filter(
          (u) =>
            u.role === "General Officer" ||
            u.role === "Executive Officer" ||
            u.role === "Administrator",
        ).length,
      }
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">
          View and manage user accounts and roles.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Officers</p>
            <p className="text-2xl font-bold">{stats.officers}</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User count */}
      {filtered && (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {!users ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isExpanded = expandedId === u._id;
            const isEditing = editingId === u._id;
            return (
              <div
                key={u._id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : u._id)
                  }
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={roleColors[u.role] || ""}
                      variant="secondary"
                    >
                      {u.role}
                    </Badge>
                    <Badge
                      variant={
                        u.status === "active" ? "default" : "destructive"
                      }
                    >
                      {u.status}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-medium">{u.role}</p>
                      </div>
                      {u.position && (
                        <div>
                          <p className="text-muted-foreground">Position</p>
                          <p className="font-medium">{u.position}</p>
                        </div>
                      )}
                      {u.team && (
                        <div>
                          <p className="text-muted-foreground">Team</p>
                          <p className="font-medium">{u.team}</p>
                        </div>
                      )}
                      {u.major && (
                        <div>
                          <p className="text-muted-foreground">Major</p>
                          <p className="font-medium">{u.major}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Points</p>
                        <p className="font-medium">{u.points || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Events Attended</p>
                        <p className="font-medium">
                          {u.eventsAttended || 0}
                        </p>
                      </div>
                      {u.lastLogin && (
                        <div>
                          <p className="text-muted-foreground">Last Login</p>
                          <p className="font-medium">
                            {new Date(u.lastLogin).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Role Edit Form */}
                    {isEditing ? (
                      <div className="rounded-lg border p-4 space-y-3">
                        <p className="font-medium text-sm">Edit Role</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                              value={editRole}
                              onValueChange={setEditRole}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Position</Label>
                            <Input
                              placeholder="e.g. VP Internal"
                              value={editPosition}
                              onChange={(e) =>
                                setEditPosition(e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Team</Label>
                            <Select
                              value={editTeam || "none"}
                              onValueChange={(v) =>
                                setEditTeam(v === "none" ? "" : v)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select team" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {TEAMS.map((team) => (
                                  <SelectItem key={team} value={team}>
                                    {team}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(u._id)}
                            disabled={savingId === u._id}
                          >
                            {savingId === u._id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(u)}
                        >
                          Edit Role
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
