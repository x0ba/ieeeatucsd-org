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
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Receipt,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
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
  const reimbursements = useQuery(
    api.reimbursements.listAll,
    logtoId ? { logtoId } : "skip",
  );
  const updateStatus = useMutation(api.reimbursements.updateStatus);
  const updatePaymentDetails = useMutation(
    api.reimbursements.updatePaymentDetails,
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Payment form state
  const [payingId, setPayingId] = useState<string | null>(null);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMemo, setPaymentMemo] = useState("");

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const handleStatusChange = async (id: any, status: any) => {
    setProcessingId(id);
    try {
      await updateStatus({ logtoId: logtoId!, id, status });
      toast.success(`Reimbursement ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsPaid = async (id: string, totalAmount: number) => {
    if (!confirmationNumber.trim()) {
      toast.error("Confirmation number is required");
      return;
    }
    setProcessingId(id);
    try {
      await updatePaymentDetails({
        logtoId: logtoId!,
        id: id as any,
        paymentDetails: {
          confirmationNumber: confirmationNumber.trim(),
          paymentDate: new Date(paymentDate).getTime(),
          amountPaid: parseFloat(paymentAmount) || totalAmount,
          memo: paymentMemo || undefined,
        },
      });
      toast.success("Reimbursement marked as paid");
      setPayingId(null);
      setConfirmationNumber("");
      setPaymentAmount("");
      setPaymentMemo("");
    } catch {
      toast.error("Failed to mark as paid");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = reimbursements?.filter((r) => {
    const matchesSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = reimbursements
    ? {
        total: reimbursements.length,
        submitted: reimbursements.filter((r) => r.status === "submitted")
          .length,
        approved: reimbursements.filter((r) => r.status === "approved").length,
        paid: reimbursements.filter((r) => r.status === "paid").length,
        totalAmount: reimbursements
          .filter((r) => r.status === "approved" || r.status === "paid")
          .reduce((sum, r) => sum + r.totalAmount, 0),
      }
    : null;

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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-bold">{stats.submitted}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold">{stats.paid}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold font-mono">
              ${stats.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reimbursements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {["all", "submitted", "approved", "declined", "paid"].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {!reimbursements ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isExpanded = expandedId === r._id;
            const isPaymentForm = payingId === r._id;
            return (
              <div
                key={r._id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : r._id)
                  }
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
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Department</p>
                        <p className="font-medium">{r.department}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{r.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Amount</p>
                        <p className="font-medium font-mono">
                          ${r.totalAmount.toFixed(2)}
                        </p>
                      </div>
                      {r.dateOfPurchase && (
                        <div>
                          <p className="text-muted-foreground">
                            Date of Purchase
                          </p>
                          <p className="font-medium">
                            {new Date(r.dateOfPurchase).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    {r.additionalInfo && (
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Additional Information
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {r.additionalInfo}
                        </p>
                      </div>
                    )}

                    {/* Receipts */}
                    {r.receipts && (r.receipts as any[]).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          Receipts ({(r.receipts as any[]).length})
                        </p>
                        <div className="space-y-3">
                          {(r.receipts as any[]).map(
                            (receipt: any, idx: number) => (
                              <div
                                key={receipt.id || idx}
                                className="rounded-lg border p-4 space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {receipt.vendorName ||
                                        `Receipt ${idx + 1}`}
                                    </p>
                                    {receipt.location && (
                                      <p className="text-xs text-muted-foreground">
                                        {receipt.location}
                                      </p>
                                    )}
                                    {receipt.dateOfPurchase && (
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(
                                          receipt.dateOfPurchase,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <p className="font-mono font-semibold">
                                    ${(receipt.total || 0).toFixed(2)}
                                  </p>
                                </div>

                                {/* Line Items Table */}
                                {receipt.lineItems &&
                                  receipt.lineItems.length > 0 && (
                                    <div className="rounded border overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                          <tr>
                                            <th className="text-left p-2 font-medium">
                                              Description
                                            </th>
                                            <th className="text-left p-2 font-medium">
                                              Category
                                            </th>
                                            <th className="text-right p-2 font-medium">
                                              Amount
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {receipt.lineItems.map(
                                            (li: any, liIdx: number) => (
                                              <tr
                                                key={li.id || liIdx}
                                                className="border-t"
                                              >
                                                <td className="p-2">
                                                  {li.description}
                                                </td>
                                                <td className="p-2 text-muted-foreground">
                                                  {li.category}
                                                </td>
                                                <td className="p-2 text-right font-mono">
                                                  ${(li.amount || 0).toFixed(2)}
                                                </td>
                                              </tr>
                                            ),
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                {/* Receipt Totals */}
                                <div className="flex justify-end">
                                  <div className="space-y-1 text-sm text-right">
                                    <div className="flex justify-between gap-8">
                                      <span className="text-muted-foreground">
                                        Subtotal
                                      </span>
                                      <span className="font-mono">
                                        $
                                        {(receipt.subtotal || 0).toFixed(2)}
                                      </span>
                                    </div>
                                    {receipt.tax > 0 && (
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground">
                                          Tax
                                        </span>
                                        <span className="font-mono">
                                          ${receipt.tax.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {receipt.tip > 0 && (
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground">
                                          Tip
                                        </span>
                                        <span className="font-mono">
                                          ${receipt.tip.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {receipt.shipping > 0 && (
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground">
                                          Shipping
                                        </span>
                                        <span className="font-mono">
                                          ${receipt.shipping.toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between gap-8 font-semibold border-t pt-1">
                                      <span>Total</span>
                                      <span className="font-mono">
                                        ${(receipt.total || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {receipt.notes && (
                                  <p className="text-xs text-muted-foreground italic">
                                    Note: {receipt.notes}
                                  </p>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Audit Log */}
                    {r.auditLogs && (r.auditLogs as any[]).length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Audit Log
                        </p>
                        <div className="space-y-1">
                          {(r.auditLogs as any[]).map(
                            (log: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                              >
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                                <span>
                                  {log.action} —{" "}
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Details (if paid) */}
                    {r.paymentDetails && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950/20 dark:border-green-800">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Payment Confirmed
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-green-600 dark:text-green-400">
                              Confirmation #
                            </p>
                            <p className="font-medium text-green-800 dark:text-green-200">
                              {(r.paymentDetails as any).confirmationNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-green-600 dark:text-green-400">
                              Amount Paid
                            </p>
                            <p className="font-medium font-mono text-green-800 dark:text-green-200">
                              $
                              {(
                                (r.paymentDetails as any).amountPaid || 0
                              ).toFixed(2)}
                            </p>
                          </div>
                          {(r.paymentDetails as any).paymentDate && (
                            <div>
                              <p className="text-green-600 dark:text-green-400">
                                Payment Date
                              </p>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                {new Date(
                                  (r.paymentDetails as any).paymentDate,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          {(r.paymentDetails as any).memo && (
                            <div>
                              <p className="text-green-600 dark:text-green-400">
                                Memo
                              </p>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                {(r.paymentDetails as any).memo}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payment Form (for approved reimbursements) */}
                    {r.status === "approved" && isPaymentForm && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <p className="font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Payment Confirmation
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Confirmation Number *</Label>
                            <Input
                              placeholder="e.g. TXN-12345"
                              value={confirmationNumber}
                              onChange={(e) =>
                                setConfirmationNumber(e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Payment Date</Label>
                            <Input
                              type="date"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount Paid</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                className="pl-7"
                                placeholder={r.totalAmount.toFixed(2)}
                                value={paymentAmount}
                                onChange={(e) =>
                                  setPaymentAmount(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Memo (optional)</Label>
                            <Input
                              placeholder="Payment notes..."
                              value={paymentMemo}
                              onChange={(e) => setPaymentMemo(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleMarkAsPaid(r._id, r.totalAmount)
                            }
                            disabled={processingId === r._id}
                          >
                            {processingId === r._id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Confirm Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPayingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t">
                      {r.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleStatusChange(r._id, "approved")
                            }
                            disabled={processingId === r._id}
                          >
                            {processingId === r._id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleStatusChange(r._id, "declined")
                            }
                            disabled={processingId === r._id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {r.status === "approved" && !isPaymentForm && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPayingId(r._id);
                            setPaymentAmount(r.totalAmount.toFixed(2));
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No reimbursement requests</p>
          <p className="text-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting your filters."
              : "Reimbursement requests will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
