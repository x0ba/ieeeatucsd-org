import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/fund-requests")({
  component: FundRequestsPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-purple-100 text-purple-800",
};

function FundRequestsPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const requests = useQuery(
    api.fundRequests.listMine,
    logtoId ? { logtoId } : "skip",
  );
  const createFundRequest = useMutation(api.fundRequests.create);

  const [view, setView] = useState<"list" | "create">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setDepartment("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!logtoId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      await createFundRequest({
        logtoId,
        title,
        description,
        amount: parseFloat(amount),
        department: department || undefined,
        notes: notes || undefined,
      });
      toast.success("Fund request submitted!");
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit fund request");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              New Fund Request
            </h1>
            <p className="text-muted-foreground">
              Request funding for your project or event.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. Workshop materials for PCB Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-7"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="external">External</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              placeholder="Describe what the funds will be used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Submit Fund Request
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
          <h1 className="text-2xl font-bold tracking-tight">Fund Requests</h1>
          <p className="text-muted-foreground">
            Submit and track fund requests.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>
      {!requests ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-2">
          {requests.map((r) => {
            const isExpanded = expandedId === r._id;
            return (
              <div
                key={r._id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : r._id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.title}</p>
                    <p className="text-sm text-muted-foreground">
                      ${r.amount.toFixed(2)}
                      {r.department && ` · ${r.department}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={statusColors[r.status] || ""}
                      variant="secondary"
                    >
                      {r.status}
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
                    <div>
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {r.description}
                      </p>
                    </div>
                    {r.notes && (
                      <div>
                        <p className="font-medium mb-1">Notes</p>
                        <p className="text-muted-foreground">{r.notes}</p>
                      </div>
                    )}
                    {r.reviewNotes && (
                      <div className="rounded-lg border p-3 bg-muted/50">
                        <p className="font-medium mb-1">Review Notes</p>
                        <p className="text-muted-foreground">
                          {r.reviewNotes}
                        </p>
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
          <Wallet className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No fund requests</p>
          <p className="text-sm">
            Submit a fund request to get started.
          </p>
        </div>
      )}
    </div>
  );
}
