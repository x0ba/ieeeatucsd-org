import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import {
  CreditCard,
  Plus,
  ArrowLeft,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  Calendar,
  ExternalLink,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
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
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_dashboard/reimbursement")({
  component: ReimbursementPage,
});

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  paid: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const STEPS = [
  { id: 1, name: "AI Warning", description: "Before you start" },
  { id: 2, name: "Basic Information", description: "Report Details" },
  { id: 3, name: "Receipts", description: "Upload Receipts" },
  { id: 4, name: "Review", description: "Review Request" },
];

interface PaymentDetails {
  confirmationNumber: string;
  paymentDate: number;
  amountPaid: number;
  proofFileUrl?: string;
  memo?: string;
}

interface AuditLogEntry {
  action: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  details?: string;
}

interface ReimbursementData {
  _id: string;
  _creationTime: number;
  title: string;
  totalAmount: number;
  status: string;
  department: string;
  paymentMethod: string;
  additionalInfo?: string;
  businessPurpose?: string;
  dateOfPurchase?: number;
  receipts: ReceiptEntry[];
  paymentDetails?: PaymentDetails;
  auditLog?: AuditLogEntry[];
}

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
  dateOfPurchase: number;
  receiptFile?: string;
  lineItems: LineItem[];
  notes?: string;
  subtotal: number;
  tax?: number;
  tip?: number;
  shipping?: number;
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
    dateOfPurchase: Date.now(),
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

// Step Progress Indicator Component
function StepIndicator({
  currentStep,
  maxVisitedStep,
  onStepClick,
}: {
  currentStep: number;
  maxVisitedStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= maxVisitedStep;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 group transition-all",
                  isClickable ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                    isActive && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && isClickable && "bg-muted text-muted-foreground hover:bg-muted/80",
                    !isActive && !isCompleted && !isClickable && "bg-muted/50 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      isActive && "text-primary",
                      isCompleted && "text-primary",
                      !isActive && !isCompleted && isClickable && "text-muted-foreground group-hover:text-foreground",
                      !isActive && !isCompleted && !isClickable && "text-muted-foreground/50"
                    )}
                  >
                    {step.name}
                  </p>
                </div>
              </button>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 sm:mx-4 transition-colors rounded-full",
                    step.id < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.description}
      </p>
      {/* Progress bar */}
      <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Navigation Buttons Component
function StepNavigation({
  currentStep,
  onBack,
  onNext,
  canGoNext,
  isSubmitting,
  nextLabel,
}: {
  currentStep: number;
  onBack: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isSubmitting?: boolean;
  nextLabel?: string;
}) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === STEPS.length;

  return (
    <div className="flex justify-between items-center pt-6 mt-6 border-t">
      <Button
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep}
        className={cn(isFirstStep && "invisible")}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={!canGoNext || isSubmitting}
        className="min-w-[140px]"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        {nextLabel || (isLastStep ? "Submit" : "Next")}
        {!isSubmitting && !isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
      </Button>
    </div>
  );
}

// Detail View Component
function ReimbursementDetailView({
  reimbursement,
  onBack,
}: {
  reimbursement: ReimbursementData;
  onBack: () => void;
}) {
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const receipts = reimbursement.receipts || [];
  const currentReceipt = receipts[activeReceiptIndex] || {};
  const hasReceipts = receipts.length > 0;
  const currentLineItems = currentReceipt.lineItems || [];

  const receiptFileUrl = currentReceipt.receiptFile;
  const receiptFileName = receiptFileUrl?.split("/").pop() || "Receipt";

  const isPdf =
    receiptFileUrl?.toLowerCase().endsWith(".pdf") ||
    receiptFileUrl?.toLowerCase().includes(".pdf?");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const resetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const formatDate = (dateVal: number | undefined) => {
    if (!dateVal) return "N/A";
    return new Date(dateVal).toLocaleDateString();
  };

  const formatDateTime = (dateVal: number | undefined) => {
    if (!dateVal) return "N/A";
    return new Date(dateVal).toLocaleString();
  };

  return (
    <div className="mt-6 border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold" title={reimbursement.title}>
                {reimbursement.title}
              </h2>
              <Badge
                className={statusColors[reimbursement.status] || ""}
                variant="secondary"
              >
                {reimbursement.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {reimbursement._id.slice(0, 8)} • {reimbursement.department}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Total Amount
          </p>
          <p className="text-xl font-bold">${reimbursement.totalAmount?.toFixed(2)}</p>
        </div>
      </div>

      {/* Content - Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Panel: Info (5/12) */}
        <div className="lg:col-span-5 border-r border-gray-200 dark:border-gray-800">
          {/* Receipt Navigation */}
          {hasReceipts && (
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Receipt {activeReceiptIndex + 1} of {receipts.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeReceiptIndex === 0}
                  onClick={() => setActiveReceiptIndex((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeReceiptIndex === receipts.length - 1}
                  onClick={() => setActiveReceiptIndex((prev) => prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6 max-h-[800px] overflow-y-auto">
            {/* Payment Details Section */}
            {reimbursement.status === "paid" && reimbursement.paymentDetails && (
              <section className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-green-100 dark:border-green-800 pb-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-bold text-green-900 dark:text-green-200 uppercase tracking-wide">
                    Payment Confirmation
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      Confirmation Number
                    </p>
                    <p className="text-sm font-mono font-medium bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-green-100 dark:border-green-800 inline-block">
                      {reimbursement.paymentDetails.confirmationNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      Payment Date
                    </p>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <span>{formatDate(reimbursement.paymentDetails.paymentDate)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      Amount Paid
                    </p>
                    <p className="text-lg font-bold flex items-center gap-1">
                      <span className="text-green-600 text-sm">$</span>
                      {reimbursement.paymentDetails.amountPaid?.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                      Payment Proof
                    </p>
                    {reimbursement.paymentDetails.proofFileUrl ? (
                      <a
                        href={reimbursement.paymentDetails.proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        View Proof
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No proof attached</span>
                    )}
                  </div>
                  {reimbursement.paymentDetails.memo && (
                    <div className="col-span-2 mt-1">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase mb-1">
                        Memo
                      </p>
                      <p className="text-sm bg-white/50 dark:bg-black/20 p-2 rounded border border-green-100 dark:border-green-800">
                        {reimbursement.paymentDetails.memo}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Receipt Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                Receipt Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Vendor Name</p>
                  <p className="text-sm font-medium">{currentReceipt.vendorName || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Date of Purchase</p>
                  <p className="text-sm font-medium">
                    {currentReceipt.dateOfPurchase
                      ? new Date(currentReceipt.dateOfPurchase).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Location</p>
                <p className="text-sm font-medium">{currentReceipt.location || "N/A"}</p>
              </div>
            </section>

            {/* Report Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                Report Details
              </h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Payment Method</p>
                  <p className="text-sm font-medium">{reimbursement.paymentMethod}</p>
                </div>
                {reimbursement.additionalInfo && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Additional Info
                    </p>
                    <p className="text-sm font-medium">{reimbursement.additionalInfo}</p>
                  </div>
                )}
                {reimbursement.businessPurpose && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Business Purpose
                    </p>
                    <p className="text-sm font-medium">{reimbursement.businessPurpose}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Submitted On</p>
                  <p className="text-sm font-medium">{formatDateTime(reimbursement._creationTime)}</p>
                </div>
              </div>
            </section>

            {/* Financials */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                Financials
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Subtotal</p>
                  <p className="text-sm font-medium">${(currentReceipt.subtotal || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Tax</p>
                  <p className="text-sm font-medium">${(currentReceipt.tax || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Tip</p>
                  <p className="text-sm font-medium">${(currentReceipt.tip || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Shipping</p>
                  <p className="text-sm font-medium">${(currentReceipt.shipping || 0).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Total</p>
                  <p className="text-lg font-bold text-green-600">${(currentReceipt.total || 0).toFixed(2)}</p>
                </div>
              </div>
            </section>

            {/* Line Items */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide flex justify-between items-center">
                <span>Line Items</span>
                <span className="text-xs font-normal text-muted-foreground normal-case">
                  {currentLineItems.length} items
                </span>
              </h3>
              {currentLineItems.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-muted-foreground text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {currentLineItems.map((item: LineItem, idx: number) => (
                        <tr key={idx} className="bg-white dark:bg-gray-900">
                          <td className="px-3 py-2">
                            <div className="font-medium">{item.description}</div>
                            <div className="text-xs text-muted-foreground">{item.category}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {1}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ${(item.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No line items detailed.</p>
              )}
            </section>

            {/* Audit Log */}
            {reimbursement.auditLog && reimbursement.auditLog.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                  Audit Log
                </h3>
                <div className="space-y-2">
                  {reimbursement.auditLog.map((entry, idx) => (
                    <div
                      key={idx}
                      className="text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      {entry.userName && (
                        <p className="text-xs text-muted-foreground mt-1">by {entry.userName}</p>
                      )}
                      {entry.details && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Right Panel: Receipt Viewer (7/12) */}
        <div className="lg:col-span-7 bg-gray-100 dark:bg-gray-900/50 min-h-[500px] lg:min-h-0">
          {receiptFileUrl ? (
            <div className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isPdf ? (
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                  <span
                    className="text-xs font-medium truncate max-w-[200px]"
                    title={receiptFileName}
                  >
                    {receiptFileName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {isPdf ? "PDF" : "Image"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {!isPdf && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleZoomOut}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleZoomIn}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRotate}
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetView}>
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  <div className="w-px h-4 bg-gray-300 mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(receiptFileUrl, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Viewer */}
              <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                {isPdf ? (
                  <iframe src={receiptFileUrl} className="w-full h-full border-0" title="PDF Receipt" />
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <img
                      src={receiptFileUrl}
                      alt="Receipt"
                      className="max-w-full max-h-full object-contain shadow-lg transition-transform duration-200 ease-out origin-center block"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p>No receipt file available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: AI Warning
function AIWarningStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
      <div className="bg-card border shadow-sm rounded-2xl p-8 text-center space-y-6 max-w-lg w-full">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Before you start</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our system uses AI to automatically parse details from your receipts.
            Please review all extracted information carefully before submitting.
          </p>
        </div>
        <Button onClick={onNext} size="lg" className="w-full font-semibold">
          I Understand, Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Basic Information
function BasicInfoStep({
  formData,
  setFormData,
  onBack,
  onNext,
}: {
  formData: {
    title: string;
    department: string;
    paymentMethod: string;
    additionalInfo: string;
    businessPurpose: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      department: string;
      paymentMethod: string;
      additionalInfo: string;
      businessPurpose: string;
    }>
  >;
  onBack: () => void;
  onNext: () => void;
}) {
  const canProceed = formData.title && formData.department && formData.paymentMethod;

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="w-full max-w-2xl shadow-sm">
        <CardContent className="gap-8 p-8">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold">Report Details</h2>
            <p className="text-sm text-muted-foreground">
              Enter the high-level details for this reimbursement request.
            </p>
          </div>

          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Report Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Flight to conference"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, department: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Department" />
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
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, paymentMethod: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Method" />
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
            </div>

            {/* Additional Info for Payment */}
            {(formData.paymentMethod === "Zelle" ||
              formData.paymentMethod === "Venmo" ||
              formData.paymentMethod === "Other") && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="additionalInfo">
                  {formData.paymentMethod} Details
                  <span className="text-muted-foreground font-normal ml-1">
                    (Email, Phone, or Username)
                  </span>
                </Label>
                <Input
                  id="additionalInfo"
                  placeholder={`Enter your ${formData.paymentMethod} details...`}
                  value={formData.additionalInfo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, additionalInfo: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="businessPurpose">Business Purpose *</Label>
              <Textarea
                id="businessPurpose"
                placeholder="Explain business reason..."
                value={formData.businessPurpose}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, businessPurpose: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>

          <StepNavigation
            currentStep={2}
            onBack={onBack}
            onNext={onNext}
            canGoNext={!!canProceed}
            nextLabel="Next: Upload Receipts"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Step 3: Receipts
function ReceiptsStep({
  receipts,
  setReceipts,
  onBack,
  onNext,
}: {
  receipts: ReceiptEntry[];
  setReceipts: React.Dispatch<React.SetStateAction<ReceiptEntry[]>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

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

  const canProceed = receipts.length > 0 && receipts.every((r) => r.total > 0 && r.vendorName);

  // Remove unused expandedReceipt variable by using it
  if (expandedReceipt === null && receipts.length > 0) {
    // Expand first receipt by default when none is expanded
    setExpandedReceipt(receipts[0].id);
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Upload Receipts</h2>
          <p className="text-xs text-muted-foreground">Manage expenses for this report</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReceipts((prev) => [...prev, emptyReceipt()])}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Receipt
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-auto">
        {receipts.map((receipt, rIdx) => {
          const isExpanded = expandedReceipt === receipt.id;
          return (
            <div key={receipt.id} className="rounded-xl border bg-card overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedReceipt(isExpanded ? null : receipt.id)}
              >
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    Receipt {rIdx + 1}
                    {receipt.vendorName && ` — ${receipt.vendorName}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">${receipt.total.toFixed(2)}</span>
                  {receipts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
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
                          updateReceipt(receipt.id, { vendorName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="e.g. Online"
                        value={receipt.location}
                        onChange={(e) =>
                          updateReceipt(receipt.id, { location: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Purchase</Label>
                      <Input
                        type="date"
                        value={receipt.dateOfPurchase ? new Date(receipt.dateOfPurchase).toISOString().split("T")[0] : ""}
                        onChange={(e) =>
                          updateReceipt(receipt.id, { dateOfPurchase: new Date(e.target.value).getTime() })
                        }
                      />
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Line Items</Label>
                      <Button variant="ghost" size="sm" onClick={() => addLineItem(receipt.id)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {receipt.lineItems.map((li) => (
                        <div key={li.id} className="flex items-center gap-2">
                          <Input
                            placeholder="Description"
                            className="flex-1"
                            value={li.description}
                            onChange={(e) =>
                              updateLineItem(receipt.id, li.id, { description: e.target.value })
                            }
                          />
                          <Select
                            value={li.category}
                            onValueChange={(val) =>
                              updateLineItem(receipt.id, li.id, { category: val })
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
                            <Button variant="ghost" size="sm" onClick={() => removeLineItem(receipt.id, li.id)}>
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
                      <p className="text-sm text-muted-foreground">Receipt Total</p>
                      <p className="text-xl font-bold font-mono">${receipt.total.toFixed(2)}</p>
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

      <StepNavigation
        currentStep={3}
        onBack={onBack}
        onNext={onNext}
        canGoNext={canProceed}
        nextLabel="Review & Submit"
      />
    </div>
  );
}

// Step 4: Review
function ReviewStep({
  formData,
  receipts,
  totalAmount,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  formData: {
    title: string;
    department: string;
    paymentMethod: string;
    additionalInfo: string;
    businessPurpose: string;
  };
  receipts: ReceiptEntry[];
  totalAmount: number;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const departmentLabels: Record<string, string> = {
    internal: "Internal",
    external: "External",
    projects: "Projects",
    events: "Events",
    other: "Other",
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold">Review Request</h2>
        <p className="text-muted-foreground">
          Please review all line items and details before submitting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide mb-4">Report Summary</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase block mb-1">Title</label>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase block mb-1">
                      Department
                    </label>
                    <p className="font-medium">{departmentLabels[formData.department] || formData.department}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase block mb-1">
                      Payment Method
                    </label>
                    <p className="font-medium">{formData.paymentMethod}</p>
                  </div>
                  {formData.additionalInfo && (
                    <div>
                      <label className="text-xs text-muted-foreground uppercase block mb-1">
                        Payment Details
                      </label>
                      <p className="font-medium">{formData.additionalInfo}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Amount</span>
                    <span className="font-bold text-xl text-green-600">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3">
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              size="lg"
              className="w-full font-bold"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {!isSubmitting && <CheckCircle className="w-5 h-5 mr-2" />}
              Submit Request
            </Button>
            <Button variant="outline" onClick={onBack}>
              Back to Edit
            </Button>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {receipts.map((r, i) => (
            <Card key={r.id} className="shadow-sm">
              <CardContent className="p-0">
                <div className="px-6 py-4 bg-muted border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-bold text-muted-foreground text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold">{r.vendorName || "Unnamed Receipt"}</h4>
                      <p className="text-xs text-muted-foreground">
                        {r.dateOfPurchase ? new Date(r.dateOfPurchase).toLocaleDateString() : "N/A"} • {r.location || "No location"}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold">${r.total.toFixed(2)}</span>
                </div>
                <div className="p-6">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2">Line Item</th>
                          <th className="px-4 py-2 text-center">Category</th>
                          <th className="px-4 py-2 text-center">Qty</th>
                          <th className="px-4 py-2 text-right">Unit Price</th>
                          <th className="px-4 py-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {r.lineItems.map((item, idx) => {
                          const lineTotal = (item.amount || 0) * 1;
                          return (
                            <tr key={idx} className="bg-background">
                              <td className="px-4 py-2 font-medium">{item.description || "-"}</td>
                              <td className="px-4 py-2 text-center text-muted-foreground text-xs">
                                {item.category}
                              </td>
                              <td className="px-4 py-2 text-center text-muted-foreground">1</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                ${item.amount.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right font-medium">${lineTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {/* Summary Rows */}
                        {((r.tax || 0) > 0 || (r.tip || 0) > 0 || (r.shipping || 0) > 0) && (
                          <tr className="bg-muted/50 text-xs text-muted-foreground">
                            <td colSpan={4} className="px-4 py-2 text-right uppercase font-semibold tracking-wide">
                              Additional (Tax/Tip/Ship)
                            </td>
                            <td className="px-4 py-2 text-right font-medium">
                              ${((r.tax || 0) + (r.tip || 0) + (r.shipping || 0)).toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReimbursementPage() {
  const { logtoId } = useAuth();
  const reimbursements = useQuery(
    api.reimbursements.listMine,
    logtoId ? { logtoId } : "skip",
  );
  const createReimbursement = useMutation(api.reimbursements.create);

  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedReimbursementId, setSelectedReimbursementId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wizard step state
  const [step, setStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    department: "",
    paymentMethod: "",
    additionalInfo: "",
    businessPurpose: "",
  });

  const [receipts, setReceipts] = useState<ReceiptEntry[]>([emptyReceipt()]);
  const resetForm = () => {
    setFormData({
      title: "",
      department: "",
      paymentMethod: "",
      additionalInfo: "",
      businessPurpose: "",
    });
    setReceipts([emptyReceipt()]);
    setStep(1);
    setMaxVisitedStep(1);
  };

  const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);

  const handleViewDetail = (reimbursement: ReimbursementData) => {
    setSelectedReimbursementId(reimbursement._id);
    setView("detail");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedReimbursementId(null);
  };

  const selectedReimbursement = (reimbursements as ReimbursementData[] | undefined)?.find(
    (r) => r._id === selectedReimbursementId
  );

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    if (newStep > maxVisitedStep) {
      setMaxVisitedStep(newStep);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length) {
      handleStepChange(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!logtoId) return;
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!formData.department) {
      toast.error("Department is required");
      return;
    }
    if (!formData.paymentMethod) {
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
        title: formData.title,
        totalAmount,
        paymentMethod: formData.paymentMethod,
        additionalInfo: formData.additionalInfo,
        department: formData.department as any,
        receipts: formattedReceipts,
        dateOfPurchase: Date.now(),
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

  // Detail view
  if (view === "detail" && selectedReimbursement) {
    return (
      <div className="p-6 w-full">
        <ReimbursementDetailView
          reimbursement={selectedReimbursement}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="p-6 space-y-6 max-w-5xl">
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

        {/* Step Progress Indicator */}
        <StepIndicator
          currentStep={step}
          maxVisitedStep={maxVisitedStep}
          onStepClick={handleStepChange}
        />

        {/* Step Content */}
        {step === 1 && <AIWarningStep onNext={handleNext} />}
        {step === 2 && (
          <BasicInfoStep
            formData={formData}
            setFormData={setFormData}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}
        {step === 3 && (
          <ReceiptsStep
            receipts={receipts}
            setReceipts={setReceipts}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}
        {step === 4 && (
          <ReviewStep
            formData={formData}
            receipts={receipts}
            totalAmount={totalAmount}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
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
          {reimbursements.map((r) => (
            <div
              key={r._id}
              className="rounded-xl border bg-card overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleViewDetail(r as ReimbursementData)}
            >
              <div className="flex items-center justify-between p-4">
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
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
