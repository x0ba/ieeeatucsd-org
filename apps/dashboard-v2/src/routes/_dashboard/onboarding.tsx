import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/onboarding")({
  component: OnboardingPage,
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

function OnboardingPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const invitations = useQuery(
    api.officerInvitations.list,
    logtoId ? { logtoId } : "skip",
  );
  const createInvitation = useMutation(api.officerInvitations.create);
  const resendInvitation = useMutation(api.officerInvitations.resend);

  const [view, setView] = useState<"list" | "create">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [position, setPosition] = useState("");
  const [message, setMessage] = useState("");
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("");
  const [leaderName, setLeaderName] = useState("");

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("");
    setPosition("");
    setMessage("");
    setAcceptanceDeadline("");
    setLeaderName("");
  };

  const handleCreate = async () => {
    if (!logtoId) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!role) {
      toast.error("Role is required");
      return;
    }
    if (!position.trim()) {
      toast.error("Position is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createInvitation({
        logtoId,
        name,
        email,
        role: role as any,
        position,
        message: message || undefined,
        acceptanceDeadline: acceptanceDeadline || undefined,
        leaderName: leaderName || undefined,
      });
      toast.success("Invitation sent!");
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (id: string) => {
    if (!logtoId) return;
    setResendingId(id);
    try {
      await resendInvitation({ logtoId, id: id as any });
      toast.success("Invitation resent!");
    } catch {
      toast.error("Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const stats = invitations
    ? {
        total: invitations.length,
        pending: invitations.filter((i) => i.status === "pending").length,
        accepted: invitations.filter((i) => i.status === "accepted").length,
      }
    : null;

  if (view === "create") {
    return (
      <div className="p-6 space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("list");
              resetForm();
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Send Invitation
            </h1>
            <p className="text-muted-foreground">
              Invite a new officer to the organization.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="officer@ucsd.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position *</Label>
              <Input
                placeholder="e.g. VP Internal, Project Lead"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Leader Name</Label>
              <Input
                placeholder="Name of inviting leader"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Acceptance Deadline</Label>
              <Input
                placeholder="e.g. January 15, 2026"
                value={acceptanceDeadline}
                onChange={(e) => setAcceptanceDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Personal Message</Label>
            <Textarea
              placeholder="Optional message to include in the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setView("list");
              resetForm();
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground">
            Manage officer invitations and onboarding.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Invitation
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Sent</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Accepted</p>
            <p className="text-2xl font-bold">{stats.accepted}</p>
          </div>
        </div>
      )}

      {!invitations ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : invitations.length > 0 ? (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const isExpanded = expandedId === inv._id;
            return (
              <div
                key={inv._id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : inv._id)
                  }
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{inv.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {inv.email} · {inv.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{inv.role}</Badge>
                    <Badge
                      className={statusColors[inv.status] || ""}
                      variant="secondary"
                    >
                      {inv.status}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t p-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{inv.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Role</p>
                        <p className="font-medium">{inv.role}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Position</p>
                        <p className="font-medium">{inv.position}</p>
                      </div>
                      {inv.invitedAt && (
                        <div>
                          <p className="text-muted-foreground">Invited</p>
                          <p className="font-medium">
                            {new Date(inv.invitedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {inv.expiresAt && (
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {inv.lastSentAt && (
                        <div>
                          <p className="text-muted-foreground">Last Sent</p>
                          <p className="font-medium">
                            {new Date(inv.lastSentAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {inv.acceptedAt && (
                        <div>
                          <p className="text-muted-foreground">Accepted</p>
                          <p className="font-medium">
                            {new Date(inv.acceptedAt).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    {inv.message && (
                      <div>
                        <p className="font-medium mb-1">Message</p>
                        <p className="text-muted-foreground">{inv.message}</p>
                      </div>
                    )}
                    {inv.status === "pending" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResend(inv._id)}
                          disabled={resendingId === inv._id}
                        >
                          {resendingId === inv._id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Resend Invitation
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
          <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No invitations sent</p>
          <p className="text-sm">
            Send an invitation to onboard a new officer.
          </p>
        </div>
      )}
    </div>
  );
}
