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
  Plus,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/fund-deposits")({
  component: FundDepositsPage,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function FundDepositsPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const deposits = useQuery(
    api.fundDeposits.listAll,
    logtoId ? { logtoId } : "skip",
  );
  const createDeposit = useMutation(api.fundDeposits.create);
  const verify = useMutation(api.fundDeposits.verify);

  const [view, setView] = useState<"list" | "create">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [depositDate, setDepositDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [description, setDescription] = useState("");

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setSource("");
    setDepositDate(new Date().toISOString().split("T")[0]);
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!logtoId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (!source.trim()) {
      toast.error("Source is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await createDeposit({
        logtoId,
        title,
        amount: parseFloat(amount),
        source,
        depositDate: new Date(depositDate).getTime(),
        description: description || undefined,
      });
      toast.success("Fund deposit created!");
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to create deposit");
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
              New Fund Deposit
            </h1>
            <p className="text-muted-foreground">
              Record a new fund deposit.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. AS Funding Q2 2026"
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
              <Label>Source *</Label>
              <Input
                placeholder="e.g. AS Funding, Sponsorship, Donation"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit Date</Label>
              <Input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Additional details about this deposit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
            Create Deposit
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
          <h1 className="text-2xl font-bold tracking-tight">Fund Deposits</h1>
          <p className="text-muted-foreground">
            Track and verify fund deposits.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Deposit
        </Button>
      </div>

      {!deposits ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : deposits.length > 0 ? (
        <div className="space-y-3">
          {deposits.map((d) => {
            const isExpanded = expandedId === d._id;
            return (
              <div
                key={d._id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : d._id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{d.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {d.source} · ${d.amount.toFixed(2)} ·{" "}
                      {new Date(d.depositDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={statusColors[d.status] || ""}
                      variant="secondary"
                    >
                      {d.status}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-medium font-mono">
                          ${d.amount.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Source</p>
                        <p className="font-medium">{d.source}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deposit Date</p>
                        <p className="font-medium">
                          {new Date(d.depositDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {d.description && (
                      <div>
                        <p className="font-medium mb-1">Description</p>
                        <p className="text-muted-foreground">{d.description}</p>
                      </div>
                    )}
                    {d.notes && (
                      <div>
                        <p className="font-medium mb-1">Notes</p>
                        <p className="text-muted-foreground">{d.notes}</p>
                      </div>
                    )}
                    {d.verifiedBy && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950/20 dark:border-green-800">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Verified
                          {d.verifiedAt &&
                            ` on ${new Date(d.verifiedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    )}
                    {d.status === "pending" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              await verify({
                                logtoId: logtoId!,
                                id: d._id,
                                status: "verified",
                              });
                              toast.success("Deposit verified");
                            } catch {
                              toast.error("Failed to verify");
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Verify
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
          <Banknote className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No fund deposits</p>
          <p className="text-sm">Create a deposit to get started.</p>
        </div>
      )}
    </div>
  );
}
