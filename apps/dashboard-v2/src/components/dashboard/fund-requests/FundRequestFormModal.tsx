import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Link as LinkIcon, Check } from "lucide-react";
import { formatCurrency } from "@/types/fund-requests";
import { CATEGORY_LABELS, DEPARTMENT_LABELS, type FundRequestCategory, type FundRequestDepartment } from "@/types/fund-requests";

interface VendorLink {
  id: string;
  url: string;
  itemName?: string;
  quantity?: number;
}

interface FundRequestFormData {
  title: string;
  purpose: string;
  category: FundRequestCategory;
  department: FundRequestDepartment;
  amount: string;
  vendorLinks: VendorLink[];
}

interface FundRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Partial<FundRequestFormData>;
  isEditMode?: boolean;
}

const STEPS = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Budget" },
  { id: 3, title: "Review" },
];

export function FundRequestFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  isEditMode = false,
}: FundRequestFormModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState<FundRequestCategory>("event");
  const [department, setDepartment] = useState<FundRequestDepartment>("events");
  const [amount, setAmount] = useState("");
  const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);
  const [_infoResponseNotes, setInfoResponseNotes] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing data
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || "");
        setPurpose(initialData.purpose || "");
        setCategory(initialData.category || "event");
        setDepartment(initialData.department || "events");
        setAmount(initialData.amount || "");
        setVendorLinks(initialData.vendorLinks || []);
      } else {
        resetForm();
      }
      setCurrentStep(1);
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setTitle("");
    setPurpose("");
    setCategory("event");
    setDepartment("events");
    setAmount("");
    setVendorLinks([{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 }]);
    setInfoResponseNotes("");
    setErrors({});
    setCurrentStep(1);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!title.trim()) newErrors.title = "Title is required";
        if (!purpose.trim()) newErrors.purpose = "Purpose/justification is required";
        break;
      case 2:
        if (!amount || parseFloat(amount) <= 0) {
          newErrors.amount = "Valid budget amount is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Initialize with one empty row if needed
  useEffect(() => {
    if (!isOpen) return;

    setVendorLinks((prev) => {
      if (prev.length === 0) {
        return [{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 }];
      }
      const lastLink = prev[prev.length - 1];
      if (lastLink.url?.trim() || lastLink.itemName?.trim()) {
        return [...prev, { id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 }];
      }
      return prev;
    });
  }, [isOpen]);

  const handleLinkChange = (id: string, field: "itemName" | "url" | "quantity", value: unknown) => {
    setVendorLinks((prev) => {
      const index = prev.findIndex((l) => l.id === id);
      if (index === -1) return prev;

      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === "quantity" ? Number(value as number) : value as string };

      if (index === prev.length - 1) {
        const currentLink = updated[index];
        if (currentLink.itemName?.trim() || currentLink.url?.trim()) {
          updated.push({ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 });
        }
      }

      return updated;
    });

    if (errors.link || errors[`link_${id}`]) {
      setErrors((prev) => {
        const { link, [`link_${id}`]: _removed, ...rest } = prev;
        void link;
        return rest;
      });
    }
  };

  const handleLinkBlur = (id: string) => {
    setVendorLinks((prev) => {
      const link = prev.find((l) => l.id === id);
      if (!link) return prev;

      if (link.url?.trim() && !isValidUrl(link.url)) {
        setErrors((e) => ({ ...e, [`link_${id}`]: "Please enter a valid URL" }));
      }
      return prev;
    });
  };

  const handleRemoveLink = (id: string) => {
    setVendorLinks((prev) => {
      if (prev.length <= 1) {
        return [{ id: crypto.randomUUID(), url: "", itemName: "", quantity: 1 }];
      }
      return prev.filter((link) => link.id !== id);
    });
    setErrors((prev) => {
      const { [`link_${id}`]: removed, ...rest } = prev;
      return rest;
    });
  };

  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Remove empty vendor links
      const cleanedVendorLinks = vendorLinks.filter((link) => link.url?.trim() || link.itemName?.trim());
      void cleanedVendorLinks;

      // Here you would call the Convex mutation to create/update the fund request
      // await createFundRequestMutation({ ... });

      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error saving fund request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter a descriptive title for your request"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">
                  Department <span className="text-destructive">*</span>
                </Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as FundRequestDepartment)}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENT_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={(v) => setCategory(v as FundRequestCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">
                Purpose / Justification <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="purpose"
                placeholder="Explain why you need this funding and how it will be used..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={6}
              />
              {errors.purpose && <p className="text-sm text-destructive">{errors.purpose}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Total Budget Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const sanitized = e.target.value.replace(/[^0-9.]/g, "");
                    const parts = sanitized.split(".");
                    if (parts.length > 2) return;
                    if (parts[1] && parts[1].length > 2) return;
                    setAmount(sanitized);
                  }}
                  onBlur={() => {
                    if (amount) {
                      const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
                      setAmount(num ? num.toFixed(2) : "");
                    }
                  }}
                  className="pl-7"
                />
              </div>
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
              <p className="text-xs text-muted-foreground">Enter the total amount requested in USD.</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <Label>Purchase Links / Line Items</Label>
                  <p className="text-xs text-muted-foreground">Enter items below. A new row will automatically appear.</p>
                </div>
              </div>

              <div className="space-y-3">
                {vendorLinks.length > 0 && (
                  <div className="flex gap-2 px-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <span className="flex-1">Item Name</span>
                    <span className="w-20">Qty</span>
                    <span className="flex-[2]">URL</span>
                    <span className="w-8"></span>
                  </div>
                )}

                {vendorLinks.map((link) => (
                  <div key={link.id} className="group flex gap-2 items-center">
                    <Input
                      placeholder="Item name"
                      value={link.itemName || ""}
                      onChange={(e) => handleLinkChange(link.id, "itemName", e.target.value)}
                      onBlur={() => handleLinkBlur(link.id)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      placeholder="1"
                      type="number"
                      min={1}
                      value={link.quantity ?? 1}
                      onChange={(e) => {
                        const num = parseInt(e.target.value) || 1;
                        handleLinkChange(link.id, "quantity", Math.max(1, num));
                      }}
                      className="w-20 h-8 text-sm"
                    />
                    <Input
                      placeholder="https://..."
                      value={link.url || ""}
                      onChange={(e) => handleLinkChange(link.id, "url", e.target.value)}
                      onBlur={() => handleLinkBlur(link.id)}
                      className="flex-[2] h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 w-8 h-8 p-0"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: {
        const cleanedLinks = vendorLinks.filter((l) => l.url?.trim() || l.itemName?.trim());
        const totalAmount = parseFloat(amount) || 0;
        void totalAmount;

        return (
          <div className="space-y-6">
            <div className="rounded-xl border bg-muted/50 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-bold">{title}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">{DEPARTMENT_LABELS[department]}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">${formatCurrency(parseFloat(amount) || 0)}</p>
                  <Badge variant="secondary" className="mt-1">
                    {CATEGORY_LABELS[category]}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                  Purpose
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{purpose}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground uppercase">Items / Links</span>
                  </div>
                  <p className="text-lg font-semibold pl-6">{cleanedLinks.length}</p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Fund Request" : "New Fund Request"}</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="relative mt-4 mb-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-primary transition-all duration-300 -translate-y-1/2 z-0"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          <div className="flex justify-between relative z-10">
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-2">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 border-2
                      ${isCompleted || isCurrent ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-background text-muted-foreground"}
                    `}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span
                    className={`hidden sm:block text-xs font-semibold ${
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">{renderStepContent()}</div>

        <DialogFooter className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>
                Back
              </Button>
            )}

            {currentStep < STEPS.length ? (
              <Button onClick={handleNextStep}>Next Step</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Request" : "Submit Request"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
