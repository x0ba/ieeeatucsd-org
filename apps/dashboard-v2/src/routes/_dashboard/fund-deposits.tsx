import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { usePermissions } from "@/hooks/usePermissions";
import { useGlobalImagePaste } from "@/hooks/useGlobalImagePaste";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Search,
  Eye,
  Trash2,
  Check,
  X,
  DollarSign,
  FileText,
  AlertCircle,
  Clock,
  CreditCard,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Receipt,
  User,
  Wallet,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  ExternalLink,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MultiFileUpload } from "@/components/dashboard/fund-deposits/MultiFileUpload";

export const Route = createFileRoute("/_dashboard/fund-deposits")({
  component: FundDepositsPage,
});

const ITEMS_PER_PAGE = 10;

const DEPOSIT_STEPS = [
  { id: 1, name: "Basic Info", description: "Transaction Details" },
  { id: 2, name: "Details", description: "Purpose & Notes" },
  { id: 3, name: "Receipts", description: "Upload Receipts" },
  { id: 4, name: "Review", description: "Review & Submit" },
];

type FundDepositStatus = "pending" | "verified" | "rejected";
type DepositMethod = "cash" | "check" | "bank_transfer" | "other";
type IeeeDepositSource = "upp" | "section" | "region" | "global" | "society" | "other";

interface AuditLog {
  action: string;
  createdBy: string;
  createdByName?: string;
  timestamp: number;
  note?: string;
  previousData?: unknown;
  newData?: unknown;
}

interface FundDeposit {
  _id: Id<"fundDeposits">;
  _creationTime: number;
  title: string;
  amount: number;
  depositDate: number;
  status: FundDepositStatus;
  depositedBy: string;
  depositedByName?: string;
  depositedByEmail?: string;
  depositMethod?: DepositMethod;
  otherDepositMethod?: string;
  purpose?: string;
  receiptFiles?: string[];
  description?: string;
  submittedAt?: number;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: number;
  notes?: string;
  rejectionReason?: string;
  auditLogs?: AuditLog[];
  referenceNumber?: string;
  source?: string;
  isIeeeDeposit?: boolean;
  ieeeDepositSource?: IeeeDepositSource;
  needsBankTransfer?: boolean;
  bankTransferInstructions?: string;
  bankTransferFiles?: string[];
  editedBy?: string;
  editedByName?: string;
  editedAt?: number;
}

const STATUS_COLORS: Record<FundDepositStatus, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200",
  verified:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
  rejected:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200",
};

const STATUS_LABELS: Record<FundDepositStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const STATUS_ICONS: Record<FundDepositStatus, React.ElementType> = {
  pending: Clock,
  verified: Check,
  rejected: AlertTriangle,
};

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
        {DEPOSIT_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = step.id <= maxVisitedStep;
          const isLast = index === DEPOSIT_STEPS.length - 1;

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
        Step {currentStep} of {DEPOSIT_STEPS.length}: {DEPOSIT_STEPS[currentStep - 1]?.description}
      </p>
      {/* Progress bar */}
      <div className="mt-4 w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / DEPOSIT_STEPS.length) * 100}%` }}
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
  const isLastStep = currentStep === DEPOSIT_STEPS.length;

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

interface FormDataState {
  title: string;
  amount: string;
  depositDate: string;
  depositMethod: DepositMethod;
  otherDepositMethod: string;
  description: string;
  referenceNumber: string;
  purpose: string;
  isIeeeDeposit: boolean;
  ieeeDepositSource: IeeeDepositSource;
}

// Step 1: Basic Information
function BasicInfoStep({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  onNext,
}: {
  formData: Pick<FormDataState, 'title' | 'amount' | 'depositDate' | 'depositMethod' | 'otherDepositMethod' | 'isIeeeDeposit' | 'ieeeDepositSource'>;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNext: () => void;
}) {
  const validateStep = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }
    if (!formData.amount) {
      errors.amount = "Amount is required";
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      errors.amount = "Amount must be a positive number";
    }
    if (formData.depositMethod === "other" && !formData.otherDepositMethod.trim()) {
      errors.otherDepositMethod = "Please specify deposit method when 'Other' is selected";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const canProceed = formData.title.trim() && formData.amount && parseFloat(formData.amount) > 0 &&
    (formData.depositMethod !== "other" || formData.otherDepositMethod.trim());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg dark:bg-blue-900">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold">Transaction Details</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="title">
              Deposit Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Membership Dues Collection"
              className={formErrors.title ? "border-destructive" : ""}
            />
            {formErrors.title && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {formErrors.title}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                className={`pl-8 ${formErrors.amount ? "border-destructive" : ""}`}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            {formErrors.amount && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {formErrors.amount}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="depositDate">
              Deposit Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="depositDate"
              type="date"
              value={formData.depositDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, depositDate: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="depositMethod">
              Deposit Method <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.depositMethod}
              onValueChange={(value: DepositMethod) =>
                setFormData((prev) => ({ ...prev, depositMethod: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.depositMethod === "other" && (
            <div>
              <Label htmlFor="otherDepositMethod">
                Specify Method <span className="text-destructive">*</span>
              </Label>
              <Input
                id="otherDepositMethod"
                value={formData.otherDepositMethod}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, otherDepositMethod: e.target.value }))
                }
                placeholder="Specify method"
                className={formErrors.otherDepositMethod ? "border-destructive" : ""}
              />
              {formErrors.otherDepositMethod && (
                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formErrors.otherDepositMethod}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* IEEE Deposit Section */}
      <div className="p-4 rounded-xl bg-muted border">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isIeeeDeposit"
            checked={formData.isIeeeDeposit}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, isIeeeDeposit: checked === true }))
            }
          />
          <Label htmlFor="isIeeeDeposit" className="text-sm font-medium cursor-pointer">
            This is an IEEE deposit (include Concur receipt)
          </Label>
        </div>
        {formData.isIeeeDeposit && (
          <div className="mt-4 pl-6 border-l-2 border-border">
            <Label htmlFor="ieeeDepositSource">
              IEEE Source <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.ieeeDepositSource}
              onValueChange={(value: IeeeDepositSource) =>
                setFormData((prev) => ({ ...prev, ieeeDepositSource: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select IEEE source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upp">IEEE UPP</SelectItem>
                <SelectItem value="section">IEEE Section</SelectItem>
                <SelectItem value="region">IEEE Region</SelectItem>
                <SelectItem value="global">IEEE Global</SelectItem>
                <SelectItem value="society">IEEE Society</SelectItem>
                <SelectItem value="other">Other IEEE Entity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="min-w-[140px]"
        >
          Next: Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Details
function DetailsStep({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  onBack,
  onNext,
}: {
  formData: Pick<FormDataState, 'purpose' | 'description' | 'referenceNumber'>;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  formErrors: Record<string, string>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const validateStep = () => {
    const errors: Record<string, string> = {};

    if (!formData.purpose.trim()) {
      errors.purpose = "Purpose is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      onNext();
    }
  };

  const canProceed = formData.purpose.trim();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <div>
          <Label htmlFor="purpose">
            Purpose <span className="text-destructive">*</span>
          </Label>
          <Input
            id="purpose"
            value={formData.purpose}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, purpose: e.target.value }))
            }
            placeholder="e.g., Membership Dues, Event Revenue, Sponsorship"
            className={formErrors.purpose ? "border-destructive" : ""}
          />
          {formErrors.purpose && (
            <p className="text-sm text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {formErrors.purpose}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="description">Description / Notes</Label>
          <Textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Additional details about this deposit..."
          />
        </div>
        <div>
          <Label htmlFor="referenceNumber">Reference Number</Label>
          <Input
            id="referenceNumber"
            value={formData.referenceNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, referenceNumber: e.target.value }))
            }
            placeholder="Transaction ID, Check #, etc."
          />
        </div>
      </div>

      <StepNavigation
        currentStep={2}
        onBack={onBack}
        onNext={handleNext}
        canGoNext={!!canProceed}
        nextLabel="Next: Receipts"
      />
    </div>
  );
}

// Step 3: Receipts
function ReceiptsStep({
  receiptFiles,
  setReceiptFiles,
  onBack,
  onNext,
}: {
  receiptFiles: File[];
  setReceiptFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <MultiFileUpload
          files={receiptFiles}
          onFilesChange={setReceiptFiles}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          maxFiles={10}
          maxSizeInMB={10}
          label="Receipt Files"
          description="Drag and drop files here, or click to browse. You can also paste images directly."
        />
      </div>

      <StepNavigation
        currentStep={3}
        onBack={onBack}
        onNext={onNext}
        canGoNext={true}
        nextLabel="Review & Submit"
      />
    </div>
  );
}

// Step 4: Review
function ReviewStep({
  formData,
  receiptFiles,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  formData: FormDataState;
  receiptFiles: File[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const getDepositMethodLabel = () => {
    if (formData.depositMethod === "other") {
      return formData.otherDepositMethod || "Other";
    }
    return formData.depositMethod.replace("_", " ");
  };

  const getIeeeSourceLabel = () => {
    const labels: Record<IeeeDepositSource, string> = {
      upp: "IEEE UPP",
      section: "IEEE Section",
      region: "IEEE Region",
      global: "IEEE Global",
      society: "IEEE Society",
      other: "Other IEEE Entity",
    };
    return labels[formData.ieeeDepositSource] || formData.ieeeDepositSource;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-lg font-bold">{formData.title}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {getDepositMethodLabel()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(formData.amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(formData.depositDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Purpose
              </h5>
              <p className="text-sm">{formData.purpose}</p>
            </div>
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Reference Number
              </h5>
              <p className="text-sm">{formData.referenceNumber || "-"}</p>
            </div>
          </div>

          {formData.description && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Description
              </h5>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg">
                {formData.description}
              </p>
            </div>
          )}

          {formData.isIeeeDeposit && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4">
              <h5 className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-2">
                IEEE Deposit
              </h5>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Source: {getIeeeSourceLabel()}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Receipts</span>
              </div>
              <p className="text-lg font-semibold pl-6">{receiptFiles.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {receiptFiles.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold mb-3">Receipt Preview</h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {receiptFiles.map((file, index) => (
              <div
                key={index}
                className="relative aspect-square border rounded-lg overflow-hidden bg-muted"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Receipt ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2">
                    <FileText className="w-8 h-8 mb-1" />
                    <span className="text-xs text-center truncate w-full px-1">
                      {file.name}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-4">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full font-bold"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {!isSubmitting && <CheckCircle className="w-5 h-5 mr-2" />}
          Submit Deposit
        </Button>
        <Button variant="outline" onClick={onBack} className="w-full">
          Back to Edit
        </Button>
      </div>
    </div>
  );
}

// Detail View Component
function DepositDetailView({
  deposit,
  onBack,
}: {
  deposit: FundDeposit;
  onBack: () => void;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const receiptFiles = deposit.receiptFiles || [];
  const currentFile = receiptFiles[activeImageIndex];
  const isPdf = currentFile?.toLowerCase().endsWith(".pdf");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const resetView = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString();
  };

  const StatusIcon = STATUS_ICONS[deposit.status];

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
              <h2 className="text-lg font-bold" title={deposit.title}>
                {deposit.title}
              </h2>
              <Badge
                className={STATUS_COLORS[deposit.status]}
                variant="secondary"
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {STATUS_LABELS[deposit.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {deposit._id.toString().slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Amount
          </p>
          <p className="text-xl font-bold">{formatCurrency(deposit.amount)}</p>
        </div>
      </div>

      {/* Content - Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Panel: Info (5/12) */}
        <div className="lg:col-span-5 border-r border-gray-200 dark:border-gray-800">
          {/* Receipt Navigation */}
          {receiptFiles.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Receipt {activeImageIndex + 1} of {receiptFiles.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeImageIndex === 0}
                  onClick={() => setActiveImageIndex((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={activeImageIndex === receiptFiles.length - 1}
                  onClick={() => setActiveImageIndex((prev) => prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6 max-h-[800px] overflow-y-auto">
            {/* Deposit Information */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                Deposit Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Title</p>
                  <p className="text-sm font-medium">{deposit.title}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(deposit.amount)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Purpose</p>
                  <p className="text-sm">{deposit.purpose || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Method</p>
                  <p className="text-sm capitalize flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    {deposit.depositMethod === "other" && deposit.otherDepositMethod
                      ? deposit.otherDepositMethod
                      : deposit.depositMethod?.replace("_", " ") || "N/A"}
                  </p>
                </div>
                {deposit.referenceNumber && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Reference</p>
                    <p className="text-sm font-mono">{deposit.referenceNumber}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Dates */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                Dates
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Deposit Date</p>
                  <p className="text-sm font-medium">{formatDate(deposit.depositDate)}</p>
                </div>
                <div className="bg-muted p-3 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Submitted</p>
                  <p className="text-sm font-medium">{formatDate(deposit.submittedAt)}</p>
                </div>
              </div>
            </section>

            {/* Description */}
            {deposit.description && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                  Description
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {deposit.description}
                </p>
              </section>
            )}

            {/* IEEE Deposit */}
            {deposit.isIeeeDeposit && (
              <section className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50">
                <h3 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">
                  IEEE Deposit
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Source: {deposit.ieeeDepositSource || "IEEE UPP"}
                </p>
              </section>
            )}

            {/* Rejection Reason */}
            {deposit.status === "rejected" && deposit.rejectionReason && (
              <section className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 border border-red-100 dark:border-red-900/50">
                <h3 className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Rejection Reason
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {deposit.rejectionReason}
                </p>
              </section>
            )}

            {/* Audit Log */}
            {deposit.auditLogs && deposit.auditLogs.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold border-b border-gray-100 dark:border-gray-800 pb-2 uppercase tracking-wide">
                  Activity Timeline
                </h3>
                <div className="space-y-2">
                  {deposit.auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="text-sm p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{log.action.replace("_", " ")}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      {log.createdByName && (
                        <p className="text-xs text-muted-foreground mt-1">by {log.createdByName}</p>
                      )}
                      {log.note && (
                        <p className="text-xs text-muted-foreground mt-1">{log.note}</p>
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
          {currentFile ? (
            <div className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-800 border-b dark:border-gray-700 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  {isPdf ? (
                    <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate max-w-[200px]">
                    Receipt {activeImageIndex + 1}
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
                    onClick={() => window.open(currentFile, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Viewer */}
              <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                {isPdf ? (
                  <iframe src={currentFile} className="w-full h-full border-0" title="PDF Receipt" />
                ) : (
                  <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                    <img
                      src={currentFile}
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

function FundDepositsPage() {
  const { hasOfficerAccess, logtoId, userRole } = usePermissions();
  const deposits = useQuery(
    api.fundDeposits.listAll,
    hasOfficerAccess && logtoId ? { logtoId } : "skip"
  );
  const stats = useQuery(
    api.fundDeposits.getStats,
    hasOfficerAccess && logtoId ? { logtoId } : "skip"
  );
  const createDeposit = useMutation(api.fundDeposits.create);
  const updateStatus = useMutation(api.fundDeposits.updateStatus);
  const deleteDeposit = useMutation(api.fundDeposits.deleteRequest);

  // View state
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedDeposit, setSelectedDeposit] = useState<FundDeposit | null>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    purpose: "",
    depositDate: new Date().toISOString().split("T")[0],
    depositMethod: "cash" as DepositMethod,
    otherDepositMethod: "",
    description: "",
    referenceNumber: "",
    isIeeeDeposit: false,
    ieeeDepositSource: "upp" as IeeeDepositSource,
  });
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // List view state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FundDepositStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<"title" | "amount" | "depositMethod" | "status" | "depositDate" | "submittedAt">("submittedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Global paste support for new deposit
  useGlobalImagePaste({
    enabled: view === "create" && step === 3,
    onImagePasted: (files) => {
      if (files.length > 0 && receiptFiles.length < 10) {
        const remainingSlots = 10 - receiptFiles.length;
        const filesToAdd = files.slice(0, remainingSlots);
        setReceiptFiles((prev) => [...prev, ...filesToAdd]);
        toast.success(`${filesToAdd.length} image(s) pasted from clipboard`);
      }
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      amount: "",
      purpose: "",
      depositDate: new Date().toISOString().split("T")[0],
      depositMethod: "cash",
      otherDepositMethod: "",
      description: "",
      referenceNumber: "",
      isIeeeDeposit: false,
      ieeeDepositSource: "upp",
    });
    setReceiptFiles([]);
    setFormErrors({});
    setStep(1);
    setMaxVisitedStep(1);
  };

  const handleNewDeposit = () => {
    resetForm();
    setView("create");
  };

  const handleViewDeposit = (deposit: FundDeposit) => {
    setSelectedDeposit(deposit);
    setIsDetailModalOpen(true);
  };

  const handleStepChange = (newStep: number) => {
    setStep(newStep);
    if (newStep > maxVisitedStep) {
      setMaxVisitedStep(newStep);
    }
  };

  const handleNext = () => {
    if (step < DEPOSIT_STEPS.length) {
      handleStepChange(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      // Go back to list if on first step
      setView("list");
      resetForm();
    }
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const response = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/fundDeposits/generateUploadUrl`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const { uploadUrl } = await response.json();

      const result = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!result.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }

      const { storageId } = await result.json();

      const urlData = await fetch(
        `${import.meta.env.VITE_CONVEX_URL}/api/fundDeposits/getStorageUrl`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storageId }),
        }
      ).then((res) => res.json());

      return urlData;
    });

    return await Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!logtoId) return;

    setIsSubmitting(true);
    try {
      let receiptFileUrls: string[] = [];
      if (receiptFiles.length > 0) {
        receiptFileUrls = await uploadFiles(receiptFiles);
      }

      await createDeposit({
        logtoId: logtoId!,
        title: formData.title,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        depositDate: new Date(formData.depositDate).getTime(),
        depositMethod: formData.depositMethod,
        otherDepositMethod: formData.otherDepositMethod || undefined,
        description: formData.description || undefined,
        referenceNumber: formData.referenceNumber || undefined,
        receiptFiles: receiptFileUrls,
        isIeeeDeposit: formData.isIeeeDeposit || undefined,
        ieeeDepositSource: formData.ieeeDepositSource || undefined,
      });

      toast.success("Deposit submitted successfully");
      resetForm();
      setView("list");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit deposit";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sortable deposits
  const sortedDeposits = useMemo(() => {
    if (!deposits) return [];

    return [...deposits].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "title":
          aValue = a.title || "";
          bValue = b.title || "";
          break;
        case "amount":
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case "depositMethod":
          aValue = a.depositMethod || "";
          bValue = b.depositMethod || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "depositDate":
          aValue = a.depositDate || 0;
          bValue = b.depositDate || 0;
          break;
        case "submittedAt":
        default:
          aValue = a.submittedAt || a._creationTime || 0;
          bValue = b.submittedAt || b._creationTime || 0;
          break;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [deposits, sortField, sortDirection]);

  const getFilteredDeposits = () => {
    let filtered = sortedDeposits;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          (d.purpose && d.purpose.toLowerCase().includes(query)) ||
          (d.description && d.description.toLowerCase().includes(query)) ||
          (d.depositedByName && d.depositedByName.toLowerCase().includes(query)) ||
          (d.depositedByEmail && d.depositedByEmail.toLowerCase().includes(query))
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((d) => d.status === selectedStatus);
    }

    return filtered;
  };

  const filteredDeposits = getFilteredDeposits();
  const totalPages = Math.ceil(filteredDeposits.length / ITEMS_PER_PAGE);
  const paginatedDeposits = filteredDeposits.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteDeposit = async (deposit: FundDeposit) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this deposit? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDeposit({ logtoId: logtoId!, id: deposit._id });
      toast.success("Deposit deleted successfully");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete deposit";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRejectDeposit = (deposit: FundDeposit) => {
    setSelectedDeposit(deposit);
    setRejectionReason("");
    setIsRejectionModalOpen(true);
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!selectedDeposit) return;

    try {
      await updateStatus({
        logtoId: logtoId!,
        id: selectedDeposit._id,
        status: "rejected",
        rejectionReason,
      });
      toast.success("Deposit rejected successfully");
      setIsRejectionModalOpen(false);
      setSelectedDeposit(null);
      setRejectionReason("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reject deposit";
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString();
  };

  const canViewDeposit = (deposit: FundDeposit) => {
    return deposit.depositedBy === logtoId || userRole === "Administrator";
  };

  const canDeleteDeposit = (deposit: FundDeposit) => {
    if (deposit.depositedBy === logtoId && deposit.status === "pending") {
      return true;
    }
    return userRole === "Administrator";
  };

  const canChangeStatus = () => {
    return userRole === "Administrator";
  };

  const SortableHeader = ({
    field,
    children,
    className = "",
  }: {
    field: typeof sortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDirection === "asc" ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  // Detail View
  if (view === "detail" && selectedDeposit) {
    return (
      <div className="p-6 w-full">
        <DepositDetailView
          deposit={selectedDeposit}
          onBack={() => {
            setView("list");
            setSelectedDeposit(null);
          }}
        />
      </div>
    );
  }

  // Create View - Multi-step Wizard
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
              New Fund Deposit
            </h1>
            <p className="text-muted-foreground">
              Submit a new deposit record for review
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
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {step === 1 && (
              <BasicInfoStep
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <DetailsStep
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                setFormErrors={setFormErrors}
                onBack={handleBack}
                onNext={handleNext}
              />
            )}
            {step === 3 && (
              <ReceiptsStep
                receiptFiles={receiptFiles}
                setReceiptFiles={setReceiptFiles}
                onBack={handleBack}
                onNext={handleNext}
              />
            )}
            {step === 4 && (
              <ReviewStep
                formData={formData}
                receiptFiles={receiptFiles}
                onBack={handleBack}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fund Deposits</h1>
          <p className="text-muted-foreground">
            Track and manage fund deposits with verification
          </p>
        </div>
        <Button onClick={handleNewDeposit} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Deposit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Deposits</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats?.verified || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <X className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{stats?.rejected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-100 dark:border-emerald-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {formatCurrency(stats?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatus("all");
              setPage(1);
            }}
          >
            All Deposits
          </Button>
          <Button
            variant={selectedStatus === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatus("pending");
              setPage(1);
            }}
            className={selectedStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          >
            <Clock className="w-3 h-3 mr-2" />
            Pending
          </Button>
          <Button
            variant={selectedStatus === "verified" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatus("verified");
              setPage(1);
            }}
            className={selectedStatus === "verified" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <Check className="w-3 h-3 mr-2" />
            Verified
          </Button>
          <Button
            variant={selectedStatus === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedStatus("rejected");
              setPage(1);
            }}
            className={selectedStatus === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <X className="w-3 h-3 mr-2" />
            Rejected
          </Button>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search deposits..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-10 w-full sm:w-[300px]"
          />
        </div>
      </div>

      {/* Deposit List Table */}
      {!deposits ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredDeposits.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {deposits.length === 0 ? "No deposits" : "No matching deposits found"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {deposits.length === 0
                ? "Submit a deposit to get started."
                : "Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <SortableHeader field="title" className="w-[35%]">
                  Deposit Info
                </SortableHeader>
                <SortableHeader field="amount" className="text-right">
                  Amount
                </SortableHeader>
                <SortableHeader field="depositMethod" className="text-center">
                  Method
                </SortableHeader>
                <SortableHeader field="status" className="text-center">
                  Status
                </SortableHeader>
                <SortableHeader field="depositDate" className="text-center">
                  Date
                </SortableHeader>
                <SortableHeader field="submittedAt" className="text-center">
                  Submitted
                </SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeposits.map((deposit) => {
                const StatusIcon = STATUS_ICONS[deposit.status];
                return (
                  <TableRow key={deposit._id} className="group">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">{deposit.title}</p>
                        <p className="text-xs text-muted-foreground">{deposit.purpose || "-"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {deposit.depositedByName || deposit.depositedByEmail || "Unknown"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(deposit.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs px-2 py-1 bg-muted rounded-lg capitalize">
                        {deposit.depositMethod === "other" && deposit.otherDepositMethod
                          ? deposit.otherDepositMethod
                          : deposit.depositMethod?.replace("_", " ") || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={`${STATUS_COLORS[deposit.status]} border`}
                        variant="secondary"
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {STATUS_LABELS[deposit.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(deposit.depositDate)}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatDate(deposit.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canViewDeposit(deposit) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDeposit(deposit)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {canDeleteDeposit(deposit) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDeposit(deposit)}
                            disabled={isDeleting}
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canChangeStatus() && deposit.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                updateStatus({
                                  logtoId: logtoId!,
                                  id: deposit._id,
                                  status: "verified",
                                })
                              }
                              title="Verify"
                              className="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRejectDeposit(deposit)}
                              title="Reject"
                              className="text-red-600 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {filteredDeposits.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{" "}
            {Math.min(page * ITEMS_PER_PAGE, filteredDeposits.length)} of{" "}
            {filteredDeposits.length} deposits
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={() => setIsDetailModalOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit Details</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <DepositDetailView
              deposit={selectedDeposit}
              onBack={() => setIsDetailModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={isRejectionModalOpen} onOpenChange={() => setIsRejectionModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b border-red-100 dark:border-red-900/50 pb-4">
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <div className="p-1.5 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              Reject Deposit
            </DialogTitle>
            <p className="text-sm text-red-600/80 dark:text-red-400/80">
              Please provide a reason for rejecting this deposit.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectionReason" className="text-foreground">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this deposit is being rejected..."
                className="mt-2 border-red-200 focus:border-red-500 focus:ring-red-500/20"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This reason will be visible to the user who submitted the deposit.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t border-red-100 dark:border-red-900/50 pt-4">
            <Button variant="outline" onClick={() => setIsRejectionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejection}
              disabled={!rejectionReason.trim()}
            >
              <X className="w-4 h-4 mr-2" />
              Reject Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
