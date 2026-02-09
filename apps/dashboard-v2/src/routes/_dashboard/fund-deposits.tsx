import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/fund-deposits")({
  component: FundDepositsPage,
});

function FundDepositsPage() {
  const { hasOfficerAccess, logtoId } = usePermissions();
  const deposits = useQuery(api.fundDeposits.listAll, logtoId ? { logtoId } : "skip");
  const verify = useMutation(api.fundDeposits.verify);

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fund Deposits</h1>
        <p className="text-muted-foreground">Track and verify fund deposits.</p>
      </div>

      {!deposits ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : deposits.length > 0 ? (
        <div className="space-y-3">
          {deposits.map((d) => (
            <div
              key={d._id}
              className="rounded-xl border bg-card p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{d.title}</p>
                <p className="text-sm text-muted-foreground">
                  {d.source} &middot; ${d.amount.toFixed(2)} &middot;{" "}
                  {new Date(d.depositDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.status}</Badge>
                {d.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await verify({ logtoId: logtoId!, id: d._id, status: "verified" });
                        toast.success("Deposit verified");
                      } catch {
                        toast.error("Failed to verify");
                      }
                    }}
                  >
                    Verify
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12">
          No fund deposits.
        </p>
      )}
    </div>
  );
}
