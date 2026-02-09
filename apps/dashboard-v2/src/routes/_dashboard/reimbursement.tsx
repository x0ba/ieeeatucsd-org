import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_dashboard/reimbursement")({
  component: ReimbursementPage,
});

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  paid: "bg-purple-100 text-purple-800",
};

function ReimbursementPage() {
  const { logtoId } = useAuth();
  const reimbursements = useQuery(api.reimbursements.listMine, logtoId ? { logtoId } : "skip");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reimbursements</h1>
          <p className="text-muted-foreground">
            Submit and track your reimbursement requests.
          </p>
        </div>
        <Button asChild>
          <a href="/reimbursement/new">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </a>
        </Button>
      </div>

      {!reimbursements ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : reimbursements.length > 0 ? (
        <div className="space-y-3">
          {reimbursements.map((r) => (
            <div
              key={r._id}
              className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.title}</p>
                <p className="text-sm text-muted-foreground">
                  {r.department} &middot; {r.paymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold">
                  ${r.totalAmount.toFixed(2)}
                </span>
                <Badge
                  className={statusColors[r.status] || ""}
                  variant="secondary"
                >
                  {r.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No reimbursements</p>
          <p className="text-sm">
            Submit a reimbursement request to get started.
          </p>
        </div>
      )}
    </div>
  );
}
