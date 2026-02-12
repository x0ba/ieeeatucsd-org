import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination } from "@/components/ui/pagination";
import ReceiptViewer from "@/components/reimbursement/ReceiptViewer";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Receipt,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  CreditCard,
  Eye,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_dashboard/manage-reimbursements")({
  component: ManageReimbursementsPage,
});

const ITEMS_PER_PAGE = 10;

type ReimbursementStatus = "submitted" | "approved" | "declined" | "paid";
type SortField = "title" | "totalAmount" | "_creationTime" | "status" | "department" | "submittedBy";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const statusColors: Record<ReimbursementStatus, string> = {
  submitted:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const statusLabels: Record<ReimbursementStatus, string> = {
  submitted: "Pending Review",
  approved: "Approved (Not Paid)",
  paid: "Approved (Paid)",
  declined: "Declined",
};

const getStatusIcon = (status: ReimbursementStatus) => {
  switch (status) {
    case "submitted":
      return <AlertCircle className="w-4 h-4" />;
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "paid":
      return <CreditCard className="w-4 h-4" />;
    case "declined":
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
};

function ManageReimbursementsPage() {
  const { hasAdminAccess, logtoId } = usePermissions();
  const reimbursements = useQuery(
    api.reimbursements.listAll,
    logtoId ? { logtoId } : "skip"
  );
  const updateStatus = useMutation(api.reimbursements.updateStatus);
  const updatePaymentDetails = useMutation(api.reimbursements.updatePaymentDetails);

  // Table state
  type Reimbursement = typeof reimbursements extends infer R ? R extends Array<infer T> ? T : never : never;
  const [selectedReimbursement, setSelectedReimbursement] = useState<Reimbursement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<ReimbursementStatus>>(new Set(["submitted", "approved", "paid"]));
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "_creationTime",
    direction: "desc",
  });
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Paid confirmation modal state
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [paidConfirmationNumber, setPaidConfirmationNumber] = useState("");
  const [paidProofFile, setPaidProofFile] = useState<File | null>(null);
  const [paymentReviewData, setPaymentReviewData] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMemo, setPaymentMemo] = useState("");
  const [uploadedProofUrl, setUploadedProofUrl] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);

  // Receipt viewer state
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);

  // Handle paste for file upload
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isPaidModalOpen || paymentReviewData) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setPaidProofFile(file);
            toast.success("Image pasted successfully");
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isPaidModalOpen, paymentReviewData]);

  const handleSort = useCallback(
    (field: SortField) => {
      setSortConfig((prev) => ({
        field,
        direction:
          prev.field === field
            ? prev.direction === "asc"
              ? "desc"
              : "asc"
            : "asc",
      }));
    },
    []
  );

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field === field) {
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      );
    }
    return <ChevronsUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />;
  };

  // Calculate receipt total
  const calculateReceiptTotal = (receipt: any) => {
    if (receipt.total && receipt.total > 0) {
      return receipt.total;
    }
    let subtotal = receipt.subtotal || 0;
    if (subtotal === 0 && receipt.lineItems && receipt.lineItems.length > 0) {
      subtotal = receipt.lineItems.reduce(
        (sum: number, item: any) => sum + (item.amount || 0),
        0
      );
    }
    return (
      subtotal +
      (receipt.tax || 0) +
      (receipt.tip || 0) +
      (receipt.shipping || 0)
    );
  };

  // Calculate total amount for a reimbursement
  const calculateTotalAmount = (reimbursement: any) => {
    if (reimbursement.approvedAmount) return reimbursement.approvedAmount;
    if (reimbursement.receipts && reimbursement.receipts.length > 0) {
      return reimbursement.receipts.reduce(
        (sum: number, receipt: any) => sum + calculateReceiptTotal(receipt),
        0
      );
    }
    return reimbursement.totalAmount || 0;
  };

  // Filter and sort reimbursements
  const filtered = useMemo(() => {
    if (!reimbursements) return [];

    return reimbursements
      .filter((r) => {
        const matchesSearch =
          !search ||
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.department.toLowerCase().includes(search.toLowerCase()) ||
          r.additionalInfo.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          statusFilter.size === 0 || statusFilter.has(r.status);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.field) {
          case "title":
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case "totalAmount":
            aValue = calculateTotalAmount(a);
            bValue = calculateTotalAmount(b);
            break;
          case "_creationTime":
            aValue = a._creationTime;
            bValue = b._creationTime;
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "department":
            aValue = a.department.toLowerCase();
            bValue = b.department.toLowerCase();
            break;
          case "submittedBy":
            aValue = a.submittedBy.toLowerCase();
            bValue = b.submittedBy.toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [reimbursements, search, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Calculate stats
  const stats = useMemo(() => {
    if (!reimbursements) return null;

    const submitted = reimbursements.filter((r) => r.status === "submitted");
    const approved = reimbursements.filter((r) => r.status === "approved");
    const paid = reimbursements.filter((r) => r.status === "paid");
    const totalAmount = reimbursements
      .filter((r) => r.status === "approved" || r.status === "paid")
      .reduce((sum, r) => sum + calculateTotalAmount(r), 0);

    return {
      total: reimbursements.length,
      submitted: submitted.length,
      approved: approved.length,
      paid: paid.length,
      totalAmount,
    };
  }, [reimbursements]);

  // Action handlers
  const handleStatusChange = async (id: string, status: ReimbursementStatus) => {
    setProcessingId(id);
    try {
      await updateStatus({ logtoId: logtoId!, id: id as any, status });
      toast.success(`Reimbursement ${status}`);
      if (selectedReimbursement && selectedReimbursement._id === id) {
        setViewMode("list");
        setSelectedReimbursement(null);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveFull = async () => {
    if (!selectedReimbursement) return;
    setProcessingId(selectedReimbursement._id);
    try {
      await updateStatus({
        logtoId: logtoId!,
        id: selectedReimbursement._id,
        status: "approved",
      });
      toast.success("Reimbursement approved");
    } catch {
      toast.error("Failed to approve reimbursement");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePaidSubmit = async () => {
    if (!selectedReimbursement) return;

    // Step 2: Final Confirmation
    if (paymentReviewData) {
      if (!paidConfirmationNumber.trim()) {
        toast.error("Missing Information", {
          description: "Please provide a confirmation number.",
        });
        return;
      }

      setProcessingId(selectedReimbursement._id);
      try {
        await updatePaymentDetails({
          logtoId: logtoId!,
          id: selectedReimbursement._id,
          paymentDetails: {
            confirmationNumber: paidConfirmationNumber.trim(),
            paymentDate: new Date(paymentDate || Date.now()).getTime(),
            amountPaid: parseFloat(paymentAmount) || calculateTotalAmount(selectedReimbursement),
            proofFileUrl: uploadedProofUrl || undefined,
            memo: paymentMemo || undefined,
          },
        });
        toast.success("Reimbursement marked as paid");
        setIsPaidModalOpen(false);
        resetPaidModal();
        setViewMode("list");
        setSelectedReimbursement(null);
      } catch {
        toast.error("Failed to mark as paid");
      } finally {
        setProcessingId(null);
      }
      return;
    }

    // Step 1: Initial Processing (Upload & AI)
    if (!paidProofFile) {
      toast.error("Missing File", {
        description: "Please upload a proof of payment.",
      });
      return;
    }

    setProcessingId(selectedReimbursement._id);
    setAiProcessing(true);

    // Simulate AI extraction (replace with actual implementation)
    setTimeout(() => {
      setPaymentReviewData({
        confirmationNumber: "TXN-" + Math.random().toString(36).substr(2, 8).toUpperCase(),
        paymentDate: new Date().toISOString().split("T")[0],
        amountPaid: calculateTotalAmount(selectedReimbursement).toFixed(2),
        memo: "",
      });
      setPaidConfirmationNumber("TXN-" + Math.random().toString(36).substr(2, 8).toUpperCase());
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentAmount(calculateTotalAmount(selectedReimbursement).toFixed(2));
      setAiProcessing(false);
      setProcessingId(null);
      toast.success("Details extracted", {
        description: "Please review the payment details.",
      });
    }, 1500);
  };

  const resetPaidModal = () => {
    setPaidConfirmationNumber("");
    setPaidProofFile(null);
    setPaymentReviewData(null);
    setPaymentDate("");
    setPaymentAmount("");
    setPaymentMemo("");
    setUploadedProofUrl("");
    setAiProcessing(false);
  };

  const handleViewDetails = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setActiveReceiptIndex(0);
    setViewMode("detail");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedReimbursement(null);
  };

  if (!hasAdminAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const currentReceipt =
    selectedReimbursement?.receipts?.[activeReceiptIndex] || null;

  // Detail View - Split Pane Layout
  if (viewMode === "detail" && selectedReimbursement) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col -m-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-950 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToList}
              className="-ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold">
                  {selectedReimbursement.title}
                </h2>
                <Badge
                  className={
                    statusColors[selectedReimbursement.status as ReimbursementStatus]
                  }
                  variant="secondary"
                >
                  {statusLabels[selectedReimbursement.status as ReimbursementStatus]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted on{" "}
                {format(selectedReimbursement._creationTime, "MMM d, yyyy")}{" "}
                by {selectedReimbursement.submittedBy}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Total Amount
            </p>
            <p className="text-xl font-bold">
              ${calculateTotalAmount(selectedReimbursement).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Split Pane Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel (5/12) */}
          <div className="w-5/12 flex flex-col border-r overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Actions Section */}
                {(selectedReimbursement.status === "submitted" ||
                  selectedReimbursement.status === "approved") && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedReimbursement.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            onClick={handleApproveFull}
                            disabled={processingId === selectedReimbursement._id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === selectedReimbursement._id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve Full
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleStatusChange(
                                selectedReimbursement._id,
                                "declined"
                              )
                            }
                            disabled={
                              processingId === selectedReimbursement._id
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {selectedReimbursement.status === "approved" &&
                        !selectedReimbursement.paymentDetails && (
                          <Button
                            size="sm"
                            onClick={() => setIsPaidModalOpen(true)}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Mark as Paid
                          </Button>
                        )}
                    </div>
                  </div>
                )}

                {/* Request Details */}
                <div>
                  <h3 className="text-sm font-bold mb-4">Request Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Department</span>
                      <span className="col-span-2 font-medium">
                        {selectedReimbursement.department}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        Payment Method
                      </span>
                      <span className="col-span-2 font-medium">
                        {selectedReimbursement.paymentMethod}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">
                        Total Amount
                      </span>
                      <span className="col-span-2 font-medium font-mono">
                        ${calculateTotalAmount(selectedReimbursement).toFixed(2)}
                      </span>
                    </div>
                    {selectedReimbursement.additionalInfo && (
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">
                          Payment Details
                        </span>
                        <span className="col-span-2 font-medium bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded text-blue-800 dark:text-blue-300">
                          {selectedReimbursement.additionalInfo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>



                {/* Receipts List */}
                {selectedReimbursement.receipts &&
                  selectedReimbursement.receipts.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-4 flex justify-between">
                        <span>Receipts</span>
                        <span className="text-muted-foreground font-normal text-xs">
                          {selectedReimbursement.receipts.length} items
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {selectedReimbursement.receipts.map(
                          (receipt: any, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => setActiveReceiptIndex(idx)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                activeReceiptIndex === idx
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/20"
                                  : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm">
                                  {receipt.vendorName || "Unknown Vendor"}
                                </span>
                                <span className="font-bold text-sm font-mono">
                                  ${calculateReceiptTotal(receipt).toFixed(2)}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground flex justify-between">
                                <span>
                                  {receipt.dateOfPurchase
                                    ? format(receipt.dateOfPurchase, "MMM d, yyyy")
                                    : "No date"}
                                </span>
                                <span>
                                  {receipt.receiptFile
                                    ? "View File"
                                    : "No File"}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Audit History */}
                {selectedReimbursement.auditLogs &&
                  selectedReimbursement.auditLogs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-4">
                        Audit History
                      </h3>
                      <div className="space-y-4 relative pl-4 border-l-2 border-muted">
                        {selectedReimbursement.auditLogs.map(
                          (log: any, i: number) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-muted-foreground/30 border-2 border-background" />
                              <p className="text-sm">{log.action}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(log.timestamp, "MMM d, yyyy h:mm a")}
                                {log.createdBy && ` • ${log.createdBy}`}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Payment Details */}
                {selectedReimbursement.paymentDetails && (
                  <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Payment Confirmed
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-green-600 dark:text-green-400">
                          Confirmation #
                        </span>
                        <span className="font-medium text-green-800 dark:text-green-300">
                          {selectedReimbursement.paymentDetails.confirmationNumber}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <span className="text-green-600 dark:text-green-400">
                          Amount Paid
                        </span>
                        <span className="font-medium font-mono text-green-800 dark:text-green-300">
                          $
                          {selectedReimbursement.paymentDetails.amountPaid.toFixed(
                            2
                          )}
                        </span>
                      </div>
                      {selectedReimbursement.paymentDetails.paymentDate && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-green-600 dark:text-green-400">
                            Payment Date
                          </span>
                          <span className="font-medium text-green-800 dark:text-green-300">
                            {format(
                              selectedReimbursement.paymentDetails.paymentDate,
                              "MMM d, yyyy"
                            )}
                          </span>
                        </div>
                      )}
                      {selectedReimbursement.paymentDetails.memo && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-green-600 dark:text-green-400">
                            Memo
                          </span>
                          <span className="font-medium text-green-800 dark:text-green-300">
                            {selectedReimbursement.paymentDetails.memo}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel (7/12) - Receipt Viewer */}
          <div className="w-7/12 flex flex-col bg-muted/30 overflow-hidden">
            {currentReceipt ? (
              <Tabs defaultValue="image" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-4 justify-start">
                  <TabsTrigger value="image">Receipt Image</TabsTrigger>
                  <TabsTrigger value="invoice">Itemized Invoice</TabsTrigger>
                </TabsList>
                <TabsContent
                  value="image"
                  className="flex-1 p-4 m-0 overflow-hidden"
                >
                  <div className="h-full rounded-xl overflow-hidden border bg-gray-900">
                    <ReceiptViewer
                      receiptUrl={currentReceipt.receiptFile || ""}
                      receiptName={`Receipt ${activeReceiptIndex + 1}`}
                      receiptType={
                        currentReceipt.receiptFile?.toLowerCase().endsWith(".pdf")
                          ? "pdf"
                          : "image"
                      }
                      className="h-full"
                    />
                  </div>
                </TabsContent>
                <TabsContent
                  value="invoice"
                  className="flex-1 p-4 m-0 overflow-auto"
                >
                  <Card>
                    <CardHeader className="border-b bg-muted/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-base">
                            {currentReceipt.vendorName || "Unknown Vendor"}
                          </CardTitle>
                          <CardDescription>
                            {currentReceipt.dateOfPurchase
                              ? format(currentReceipt.dateOfPurchase, "MMM d, yyyy")
                              : "No date"}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">AI Extracted</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Line Items Table */}
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-left">
                              Description
                            </TableHead>
                            <TableHead className="text-left">
                              Category
                            </TableHead>
                            <TableHead className="text-right">
                              Qty
                            </TableHead>
                            <TableHead className="text-right">
                              Amount
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentReceipt.lineItems?.map(
                            (item: any, i: number) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">
                                  {item.description}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {item.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {item.quantity || 1}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  ${(item.amount || 0).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                          {(!currentReceipt.lineItems ||
                            currentReceipt.lineItems.length === 0) && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center text-muted-foreground py-8"
                              >
                                No line items found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>

                      {/* Totals */}
                      <div className="border-t p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Subtotal
                          </span>
                          <span className="font-mono">
                            ${(currentReceipt.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                        {currentReceipt.tax && currentReceipt.tax > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span className="font-mono">
                              ${currentReceipt.tax.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {currentReceipt.tip && currentReceipt.tip > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tip</span>
                            <span className="font-mono">
                              ${currentReceipt.tip.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {currentReceipt.shipping && currentReceipt.shipping > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Shipping
                            </span>
                            <span className="font-mono">
                              ${currentReceipt.shipping.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span className="font-mono">
                            ${calculateReceiptTotal(currentReceipt).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No receipt selected</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paid Confirmation Modal */}
        <Dialog
          open={isPaidModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setTimeout(resetPaidModal, 300);
            }
            setIsPaidModalOpen(open);
          }}
        >
          <DialogContent className={paymentReviewData ? "max-w-4xl" : ""}>
            <DialogHeader>
              <DialogTitle>
                {paymentReviewData ? "Review Payment Details" : "Process Payment"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {paymentReviewData ? (
                <div className="flex gap-6">
                  {/* Left: Inputs */}
                  <div className="flex-1 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-3 rounded-lg flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-semibold">AI Extraction Complete</p>
                        <p className="opacity-80">
                          Please verify the details below match the proof.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Confirmation Number</Label>
                      <Input
                        placeholder="Transaction ID"
                        value={paidConfirmationNumber}
                        onChange={(e) =>
                          setPaidConfirmationNumber(e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Memo / Notes</Label>
                      <Textarea
                        placeholder="Any additional notes"
                        value={paymentMemo}
                        onChange={(e) => setPaymentMemo(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="w-1/3 shrink-0">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                      Proof Preview
                    </p>
                    <div className="border rounded-lg overflow-hidden h-64 bg-muted flex items-center justify-center relative group">
                      {uploadedProofUrl ? (
                        <img
                          src={uploadedProofUrl}
                          className="w-full h-full object-contain"
                          alt="Proof"
                        />
                      ) : (
                        <FileText className="text-muted-foreground w-12 h-12" />
                      )}
                      {uploadedProofUrl && (
                        <a
                          href={uploadedProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium"
                        >
                          View Full
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      paidProofFile
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/50"
                    }`}
                  >
                    <input
                      type="file"
                      id="payment-proof-upload"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        setPaidProofFile(e.target.files ? e.target.files[0] : null)
                      }
                      className="hidden"
                    />

                    <label
                      htmlFor="payment-proof-upload"
                      className="cursor-pointer space-y-3 block"
                    >
                      {paidProofFile ? (
                        <>
                          <CheckCircle className="w-12 h-12 text-blue-500 mx-auto" />
                          <div>
                            <p className="font-bold">{paidProofFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Ready to process
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              setPaidProofFile(null);
                            }}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">
                              Upload Proof of Payment
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click to browse or paste screenshot (Ctrl+V)
                            </p>
                          </div>
                          <Badge variant="secondary" className="mt-4">
                            Use "Paste" for quick screenshots
                          </Badge>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Info about AI */}
                  <div className="mt-6 flex gap-3 p-3 bg-muted/50 rounded-lg border items-start">
                    <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        AI-Powered Extraction
                      </p>
                      <p>
                        Upload a screenshot and our AI will automatically extract
                        the confirmation number, date, and amount for you to
                        review.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaidModalOpen(false);
                  setTimeout(resetPaidModal, 300);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePaidSubmit}
                disabled={
                  processingId === selectedReimbursement?._id || aiProcessing
                }
                className={aiProcessing ? "bg-purple-600" : ""}
              >
                {processingId === selectedReimbursement?._id || aiProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {paymentReviewData ? "Confirm Payment" : "Process & Analyze"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Manage Reimbursements
        </h1>
        <p className="text-muted-foreground">
          Review and process reimbursement requests.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Requests */}
          <Card className="border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Requests
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Review */}
          <Card className="border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Review
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {stats.submitted}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved (Pending Payment) */}
          <Card className="border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Approved (Pending)
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approved}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Amount */}
          <Card className="border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${stats.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, business purpose, submitter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["submitted", "approved", "paid", "declined"] as const).map(
            (status) => (
              <Button
                key={status}
                variant={statusFilter.has(status) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newFilter = new Set(statusFilter);
                  if (newFilter.has(status)) {
                    newFilter.delete(status);
                  } else {
                    newFilter.add(status);
                  }
                  setStatusFilter(newFilter);
                  setPage(1);
                }}
                className="gap-1.5"
              >
                {getStatusIcon(status)}
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {statusFilter.has(status) && (
                  <CheckCircle className="w-3 h-3 ml-1" />
                )}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Reimbursements Table */}
      {!reimbursements ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : paginated.length > 0 ? (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("title")}
                  >
                    <span className="flex items-center gap-1 group">
                      Title {getSortIcon("title")}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("totalAmount")}
                  >
                    <span className="flex items-center gap-1 group">
                      Amount {getSortIcon("totalAmount")}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("_creationTime")}
                  >
                    <span className="flex items-center gap-1 group">
                      Date {getSortIcon("_creationTime")}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <span className="flex items-center gap-1 group">
                      Status {getSortIcon("status")}
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("department")}
                  >
                    <span className="flex items-center gap-1 group">
                      Department {getSortIcon("department")}
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((r) => {
                  const isHovered = hoveredRow === r._id;
                  const totalAmt = calculateTotalAmount(r);

                  return (
                    <TableRow
                      key={r._id}
                      className="group cursor-pointer"
                      onMouseEnter={() => setHoveredRow(r._id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => handleViewDetails(r)}
                    >
                      <TableCell className="min-w-[200px]">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[250px]">
                          {r.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.submittedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          ${totalAmt.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(r._creationTime, "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(r._creationTime, "h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[r.status]}
                          variant="secondary"
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(r.status)}
                            {statusLabels[r.status]}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {r.department}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`flex items-center justify-end gap-1 transition-opacity duration-200 ${
                            isHovered ? "opacity-100" : "opacity-0"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.status === "submitted" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  handleStatusChange(r._id, "approved")
                                }
                                disabled={processingId === r._id}
                                title="Approve"
                              >
                                {processingId === r._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  handleStatusChange(r._id, "declined")
                                }
                                disabled={processingId === r._id}
                                title="Decline"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {r.status === "approved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={() => handleViewDetails(r)}
                              title="Mark as Paid"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewDetails(r)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No reimbursement requests</p>
          <p className="text-sm">
            {search || statusFilter.size > 0
              ? "Try adjusting your filters."
              : "Reimbursement requests will appear here."}
          </p>
        </div>
      )}
    </div>
  );
}
