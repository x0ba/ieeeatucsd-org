import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard,
  Plus,
  ArrowLeft,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Receipt,
} from "lucide-react";
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
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/reimbursement")({
  component: ReimbursementPage,
});

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  paid: "bg-purple-100 text-purple-800",
};

interface LineItem {
  id: string;
  description: string;
  category: string;
  amount: number;
}

interface ReceiptEntry {
  id: string;
  vendorName: string;
  location: string;
  dateOfPurchase: string;
  lineItems: LineItem[];
  notes: string;
  subtotal: number;
  tax: number;
  tip: number;
  shipping: number;
  total: number;
}

const CATEGORIES = [
  "Food & Beverages",
  "Supplies",
  "Equipment",
  "Printing",
  "Transportation",
  "Venue",
  "Software",
  "Other",
];

function emptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    category: "Other",
    amount: 0,
  };
}

function emptyReceipt(): ReceiptEntry {
  return {
    id: crypto.randomUUID(),
    vendorName: "",
    location: "",
    dateOfPurchase: new Date().toISOString().split("T")[0],
    lineItems: [emptyLineItem()],
    notes: "",
    subtotal: 0,
    tax: 0,
    tip: 0,
    shipping: 0,
    total: 0,
  };
}

function recalcReceipt(r: ReceiptEntry): ReceiptEntry {
  const subtotal = r.lineItems.reduce((sum, li) => sum + (li.amount || 0), 0);
  const total = subtotal + (r.tax || 0) + (r.tip || 0) + (r.shipping || 0);
  return { ...r, subtotal, total };
}

function ReimbursementPage() {
  const { logtoId } = useAuth();
  const reimbursements = useQuery(
    api.reimbursements.listMine,
    logtoId ? { logtoId } : "skip",
  );
  const createReimbursement = useMutation(api.reimbursements.create);

  const [view, setView] = useState<"list" | "create">("list");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [dateOfPurchase, setDateOfPurchase] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([emptyReceipt()]);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDepartment("");
    setPaymentMethod("");
    setAdditionalInfo("");
    setDateOfPurchase(new Date().toISOString().split("T")[0]);
    setReceipts([emptyReceipt()]);
    setExpandedReceipt(null);
  };

  const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);

  const updateReceipt = (id: string, updates: Partial<ReceiptEntry>) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...updates };
        return recalcReceipt(updated);
      }),
    );
  };

  const updateLineItem = (
    receiptId: string,
    lineItemId: string,
    updates: Partial<LineItem>,
  ) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const updated = {
          ...r,
          lineItems: r.lineItems.map((li) =>
            li.id === lineItemId ? { ...li, ...updates } : li,
          ),
        };
        return recalcReceipt(updated);
      }),
    );
  };

  const addLineItem = (receiptId: string) => {
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId
          ? { ...r, lineItems: [...r.lineItems, emptyLineItem()] }
          : r,
      ),
    );
  };

  const removeLineItem = (receiptId: string, lineItemId: string) => {
    setReceipts((prev) =>
      prev.map((r) => {
        if (r.id !== receiptId) return r;
        const updated = {
          ...r,
          lineItems: r.lineItems.filter((li) => li.id !== lineItemId),
        };
        return recalcReceipt(updated);
      }),
    );
  };

  const handleSubmit = async () => {
    if (!logtoId) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!department) {
      toast.error("Department is required");
      return;
    }
    if (!paymentMethod) {
      toast.error("Payment method is required");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedReceipts = receipts.map((r) => ({
        id: r.id,
        vendorName: r.vendorName,
        location: r.location,
        dateOfPurchase: new Date(r.dateOfPurchase).getTime(),
        lineItems: r.lineItems.filter((li) => li.description.trim()),
        notes: r.notes || undefined,
        subtotal: r.subtotal,
        tax: r.tax || undefined,
        tip: r.tip || undefined,
        shipping: r.shipping || undefined,
        total: r.total,
      }));

      await createReimbursement({
        logtoId,
        title,
        totalAmount,
        paymentMethod,
        additionalInfo,
        department: department as any,
        receipts: formattedReceipts,
        dateOfPurchase: new Date(dateOfPurchase).getTime(),
      });

      toast.success("Reimbursement request submitted!");
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit reimbursement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "create") {
    return (
      <div className="p-6 space-y-6 max-w-4xl">
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
              New Reimbursement Request
            </h1>
            <p className="text-muted-foreground">
              Fill out the details below to submit a reimbursement.
            </p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Workshop supplies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Zelle">Zelle</SelectItem>
                  <SelectItem value="Venmo">Venmo</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfPurchase">Date of Purchase</Label>
              <Input
                id="dateOfPurchase"
                type="date"
                value={dateOfPurchase}
                onChange={(e) => setDateOfPurchase(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              placeholder="Any additional details about this reimbursement..."
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Receipts */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Receipts</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setReceipts((prev) => [...prev, emptyReceipt()])
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Receipt
            </Button>
          </div>

          {receipts.map((receipt, rIdx) => {
            const isExpanded = expandedReceipt === receipt.id;
            return (
              <div
                key={receipt.id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() =>
                    setExpandedReceipt(isExpanded ? null : receipt.id)
                  }
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      Receipt {rIdx + 1}
                      {receipt.vendorName && ` — ${receipt.vendorName}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      ${receipt.total.toFixed(2)}
                    </span>
                    {receipts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceipts((prev) =>
                            prev.filter((r) => r.id !== receipt.id),
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Vendor Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Vendor Name</Label>
                        <Input
                          placeholder="e.g. Amazon"
                          value={receipt.vendorName}
                          onChange={(e) =>
                            updateReceipt(receipt.id, {
                              vendorName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          placeholder="e.g. Online"
                          value={receipt.location}
                          onChange={(e) =>
                            updateReceipt(receipt.id, {
                              location: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Purchase</Label>
                        <Input
                          type="date"
                          value={receipt.dateOfPurchase}
                          onChange={(e) =>
                            updateReceipt(receipt.id, {
                              dateOfPurchase: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Line Items</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addLineItem(receipt.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {receipt.lineItems.map((li) => (
                          <div
                            key={li.id}
                            className="flex items-center gap-2"
                          >
                            <Input
                              placeholder="Description"
                              className="flex-1"
                              value={li.description}
                              onChange={(e) =>
                                updateLineItem(receipt.id, li.id, {
                                  description: e.target.value,
                                })
                              }
                            />
                            <Select
                              value={li.category}
                              onValueChange={(val) =>
                                updateLineItem(receipt.id, li.id, {
                                  category: val,
                                })
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                $
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-7"
                                value={li.amount || ""}
                                onChange={(e) =>
                                  updateLineItem(receipt.id, li.id, {
                                    amount: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            {receipt.lineItems.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeLineItem(receipt.id, li.id)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Tax</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            value={receipt.tax || ""}
                            onChange={(e) =>
                              updateReceipt(receipt.id, {
                                tax: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tip</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            value={receipt.tip || ""}
                            onChange={(e) =>
                              updateReceipt(receipt.id, {
                                tip: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Shipping</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-7"
                            value={receipt.shipping || ""}
                            onChange={(e) =>
                              updateReceipt(receipt.id, {
                                shipping: parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Subtotal</Label>
                        <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 font-mono text-sm">
                          ${receipt.subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Receipt Total
                        </p>
                        <p className="text-xl font-bold font-mono">
                          ${receipt.total.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Any notes about this receipt..."
                        value={receipt.notes}
                        onChange={(e) =>
                          updateReceipt(receipt.id, { notes: e.target.value })
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary & Submit */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Summary</h2>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold font-mono">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} &middot;{" "}
            {receipts.reduce((sum, r) => sum + r.lineItems.length, 0)} line
            item{receipts.reduce((sum, r) => sum + r.lineItems.length, 0) !== 1 ? "s" : ""}
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
              Submit Reimbursement
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
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reimbursements</h1>
          <p className="text-muted-foreground">
            Submit and track your reimbursement requests.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
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
          {reimbursements.map((r) => {
            const isExpanded = expandedId === r._id;
            return (
              <div key={r._id} className="rounded-xl border bg-card overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : r._id)}
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
                {isExpanded && (
                  <div className="border-t p-4 space-y-3 text-sm">
                    {r.additionalInfo && (
                      <div>
                        <p className="font-medium mb-1">Additional Info</p>
                        <p className="text-muted-foreground">{r.additionalInfo}</p>
                      </div>
                    )}
                    {r.dateOfPurchase && (
                      <p className="text-muted-foreground">
                        Date of Purchase:{" "}
                        {new Date(r.dateOfPurchase).toLocaleDateString()}
                      </p>
                    )}
                    {r.receipts && (r.receipts as any[]).length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Receipts</p>
                        {(r.receipts as any[]).map((receipt: any, idx: number) => (
                          <div
                            key={receipt.id || idx}
                            className="rounded-lg border p-3 mb-2 space-y-2"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">
                                {receipt.vendorName || `Receipt ${idx + 1}`}
                              </span>
                              <span className="font-mono">
                                ${(receipt.total || 0).toFixed(2)}
                              </span>
                            </div>
                            {receipt.location && (
                              <p className="text-muted-foreground text-xs">
                                {receipt.location}
                              </p>
                            )}
                            {receipt.lineItems?.map((li: any, liIdx: number) => (
                              <div
                                key={li.id || liIdx}
                                className="flex justify-between text-xs text-muted-foreground"
                              >
                                <span>
                                  {li.description} ({li.category})
                                </span>
                                <span>${(li.amount || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {r.paymentDetails && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950/20 dark:border-green-800">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                          Payment Details
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Confirmation: {(r.paymentDetails as any).confirmationNumber}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Amount Paid: ${(r.paymentDetails as any).amountPaid?.toFixed(2)}
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
