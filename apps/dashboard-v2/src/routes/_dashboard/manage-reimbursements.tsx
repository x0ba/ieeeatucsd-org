import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/manage-reimbursements")({
  component: ManageReimbursementsPage,
});

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  paid: "bg-purple-100 text-purple-800",
};

function ManageReimbursementsPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const reimbursements = useQuery(api.reimbursements.listAll, logtoId ? { logtoId } : "skip");
  const updateStatus = useMutation(api.reimbursements.updateStatus);

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const handleStatusChange = async (id: any, status: any) => {
    try {
      await updateStatus({ logtoId: logtoId!, id, status });
      toast.success(`Reimbursement ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manage Reimbursements
        </h1>
        <p className="text-muted-foreground">
          Review and process reimbursement requests.
        </p>
      </div>

      {!reimbursements ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : reimbursements.length > 0 ? (
        <div className="space-y-3">
          {reimbursements.map((r) => (
            <div
              key={r._id}
              className="rounded-xl border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.department} &middot; ${r.totalAmount.toFixed(2)}
                  </p>
                </div>
                <Badge
                  className={statusColors[r.status] || ""}
                  variant="secondary"
                >
                  {r.status}
                </Badge>
              </div>
              {r.status === "submitted" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(r._id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange(r._id, "declined")}
                  >
                    Decline
                  </Button>
                </div>
              )}
              {r.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(r._id, "paid")}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">
          No reimbursement requests.
        </p>
      )}
    </div>
  );
}
