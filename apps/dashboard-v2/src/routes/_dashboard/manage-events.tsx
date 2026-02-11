import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Search,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Camera,
  Image,
  FileText,
  Utensils,
  DollarSign,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/manage-events")({
  component: ManageEventsPage,
});

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  completed: "bg-purple-100 text-purple-800",
  needs_review: "bg-orange-100 text-orange-800",
};

const FLYER_TYPES = [
  "Instagram Post",
  "Instagram Story",
  "Facebook Event",
  "Discord Announcement",
  "Physical Flyer",
  "Email Newsletter",
  "Other",
];

const LOGO_OPTIONS = [
  "IEEE",
  "IEEE UCSD",
  "UCSD",
  "AS Funded",
  "Other",
];

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  vendor: string;
  items: InvoiceItem[];
  tax: number;
  tip: number;
  subtotal: number;
  total: number;
}

function emptyInvoice(): Invoice {
  return {
    id: crypto.randomUUID(),
    vendor: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    tax: 0,
    tip: 0,
    subtotal: 0,
    total: 0,
  };
}

function recalcInvoice(inv: Invoice): Invoice {
  const items = inv.items.map((item) => ({
    ...item,
    total: item.quantity * item.unitPrice,
  }));
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = subtotal + (inv.tax || 0) + (inv.tip || 0);
  return { ...inv, items, subtotal, total };
}

function ManageEventsPage() {
  const { hasOfficerAccess, hasAdminAccess, logtoId } = usePermissions();
  const eventRequests = useQuery(
    api.eventRequests.listAll,
    logtoId ? { logtoId } : "skip",
  );
  const events = useQuery(
    api.events.listAll,
    logtoId ? { logtoId } : "skip",
  );
  const createEventRequest = useMutation(api.eventRequests.create);
  const updateEventRequestStatus = useMutation(
    api.eventRequests.updateStatus,
  );

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "create">("list");
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event Request Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [expectedAttendance, setExpectedAttendance] = useState("");
  const [flyersNeeded, setFlyersNeeded] = useState(false);
  const [flyerType, setFlyerType] = useState<string[]>([]);
  const [otherFlyerType, setOtherFlyerType] = useState("");
  const [flyerAdvertisingStartDate, setFlyerAdvertisingStartDate] =
    useState("");
  const [flyerAdditionalRequests, setFlyerAdditionalRequests] = useState("");
  const [photographyNeeded, setPhotographyNeeded] = useState(false);
  const [requiredLogos, setRequiredLogos] = useState<string[]>([]);
  const [advertisingFormat, setAdvertisingFormat] = useState("");
  const [willOrHaveRoomBooking, setWillOrHaveRoomBooking] = useState(false);
  const [asFundingRequired, setAsFundingRequired] = useState(false);
  const [foodDrinksBeingServed, setFoodDrinksBeingServed] = useState(false);
  const [needsGraphics, setNeedsGraphics] = useState(false);
  const [needsAsFunding, setNeedsAsFunding] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Decline reason
  const [declineReasonId, setDeclineReasonId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setLocation("");
    setStartDateTime("");
    setEndDateTime("");
    setEventDescription("");
    setExpectedAttendance("");
    setFlyersNeeded(false);
    setFlyerType([]);
    setOtherFlyerType("");
    setFlyerAdvertisingStartDate("");
    setFlyerAdditionalRequests("");
    setPhotographyNeeded(false);
    setRequiredLogos([]);
    setAdvertisingFormat("");
    setWillOrHaveRoomBooking(false);
    setAsFundingRequired(false);
    setFoodDrinksBeingServed(false);
    setNeedsGraphics(false);
    setNeedsAsFunding(false);
    setInvoices([]);
  };

  const handleSubmitEventRequest = async (isDraft = false) => {
    if (!logtoId) return;
    if (!name.trim()) {
      toast.error("Event name is required");
      return;
    }
    if (!location.trim()) {
      toast.error("Location is required");
      return;
    }
    if (!startDateTime || !endDateTime) {
      toast.error("Start and end date/time are required");
      return;
    }
    if (!eventDescription.trim()) {
      toast.error("Event description is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedInvoices = invoices.map((inv) => ({
        id: inv.id,
        vendor: inv.vendor,
        items: inv.items.filter((i) => i.description.trim()),
        tax: inv.tax,
        tip: inv.tip,
        invoiceFile: undefined,
        additionalFiles: [] as string[],
        subtotal: inv.subtotal,
        total: inv.total,
      }));

      await createEventRequest({
        logtoId,
        name,
        location,
        startDateTime: new Date(startDateTime).getTime(),
        endDateTime: new Date(endDateTime).getTime(),
        eventDescription,
        flyersNeeded,
        flyerType,
        otherFlyerType: otherFlyerType || undefined,
        flyerAdvertisingStartDate: flyerAdvertisingStartDate
          ? new Date(flyerAdvertisingStartDate).getTime()
          : undefined,
        flyerAdditionalRequests: flyerAdditionalRequests || undefined,
        flyersCompleted: false,
        photographyNeeded,
        requiredLogos,
        advertisingFormat: advertisingFormat || undefined,
        willOrHaveRoomBooking,
        expectedAttendance: expectedAttendance
          ? parseInt(expectedAttendance)
          : undefined,
        roomBookingFiles: [],
        asFundingRequired,
        foodDrinksBeingServed,
        invoices: formattedInvoices,
        needsGraphics,
        needsAsFunding,
        isDraft,
      });

      toast.success(
        isDraft
          ? "Event request saved as draft"
          : "Event request submitted!",
      );
      resetForm();
      setView("list");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit event request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    status: string,
    reason?: string,
    feedback?: string,
  ) => {
    if (!logtoId) return;
    setProcessingId(id);
    try {
      await updateEventRequestStatus({
        logtoId,
        id: id as any,
        status: status as any,
        declinedReason: reason || undefined,
        reviewFeedback: feedback || undefined,
      });
      toast.success(`Event request ${status.replace("_", " ")}`);
      setDeclineReasonId(null);
      setDeclineReason("");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const toggleFlyerType = (type: string) => {
    setFlyerType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleLogo = (logo: string) => {
    setRequiredLogos((prev) =>
      prev.includes(logo)
        ? prev.filter((l) => l !== logo)
        : [...prev, logo],
    );
  };

  const updateInvoiceItem = (
    invoiceId: string,
    itemIdx: number,
    updates: Partial<InvoiceItem>,
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const items = inv.items.map((item, idx) =>
          idx === itemIdx ? { ...item, ...updates } : item,
        );
        return recalcInvoice({ ...inv, items });
      }),
    );
  };

  const filteredRequests = eventRequests?.filter((er) => {
    const matchesSearch = er.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || er.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // CREATE VIEW
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
              Submit Event Request
            </h1>
            <p className="text-muted-foreground">
              Fill out the details for your event.
            </p>
          </div>
        </div>

        {/* Section 1: Basic Info */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Event Name *</Label>
              <Input
                placeholder="e.g. IEEE Workshop: Intro to PCB Design"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location *</Label>
              <Input
                placeholder="e.g. EBU1 2315"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expected Attendance</Label>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={expectedAttendance}
                onChange={(e) => setExpectedAttendance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <Input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date & Time *</Label>
              <Input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Event Description *</Label>
            <Textarea
              placeholder="Describe the event, its purpose, and what attendees can expect..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Section 2: Flyers & Graphics */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Image className="h-5 w-5" />
            Flyers & Graphics
          </h2>
          <div className="flex items-center gap-3">
            <Switch
              checked={flyersNeeded}
              onCheckedChange={setFlyersNeeded}
            />
            <Label>Flyers needed for this event</Label>
          </div>
          {flyersNeeded && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Flyer Types</Label>
                <div className="flex flex-wrap gap-2">
                  {FLYER_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={flyerType.includes(type)}
                        onCheckedChange={() => toggleFlyerType(type)}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                {flyerType.includes("Other") && (
                  <Input
                    placeholder="Specify other flyer type..."
                    value={otherFlyerType}
                    onChange={(e) => setOtherFlyerType(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Advertising Start Date</Label>
                <Input
                  type="date"
                  value={flyerAdvertisingStartDate}
                  onChange={(e) =>
                    setFlyerAdvertisingStartDate(e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Additional Flyer Requests</Label>
                <Textarea
                  placeholder="Any specific design requests, colors, themes..."
                  value={flyerAdditionalRequests}
                  onChange={(e) =>
                    setFlyerAdditionalRequests(e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch
              checked={needsGraphics}
              onCheckedChange={setNeedsGraphics}
            />
            <Label>Needs graphics support</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={photographyNeeded}
              onCheckedChange={setPhotographyNeeded}
            />
            <Label>Photography needed at event</Label>
          </div>
        </div>

        {/* Section 3: Logos & Branding */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logos & Branding
          </h2>
          <div className="space-y-2">
            <Label>Required Logos</Label>
            <div className="flex flex-wrap gap-2">
              {LOGO_OPTIONS.map((logo) => (
                <label
                  key={logo}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={requiredLogos.includes(logo)}
                    onCheckedChange={() => toggleLogo(logo)}
                  />
                  {logo}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Advertising Format</Label>
            <Input
              placeholder="e.g. Social media, email, physical..."
              value={advertisingFormat}
              onChange={(e) => setAdvertisingFormat(e.target.value)}
            />
          </div>
        </div>

        {/* Section 4: Logistics */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Logistics
          </h2>
          <div className="flex items-center gap-3">
            <Switch
              checked={willOrHaveRoomBooking}
              onCheckedChange={setWillOrHaveRoomBooking}
            />
            <Label>Will have or already have a room booking</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={foodDrinksBeingServed}
              onCheckedChange={setFoodDrinksBeingServed}
            />
            <Label>Food/drinks being served</Label>
          </div>
        </div>

        {/* Section 5: Funding */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Funding
          </h2>
          <div className="flex items-center gap-3">
            <Switch
              checked={asFundingRequired}
              onCheckedChange={setAsFundingRequired}
            />
            <Label>AS Funding required</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={needsAsFunding}
              onCheckedChange={setNeedsAsFunding}
            />
            <Label>Needs AS funding</Label>
          </div>

          {/* Invoices */}
          {(asFundingRequired || foodDrinksBeingServed) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Invoices</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInvoices((prev) => [...prev, emptyInvoice()])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Invoice
                </Button>
              </div>
              {invoices.map((inv, invIdx) => (
                <div
                  key={inv.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">
                      Invoice {invIdx + 1}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setInvoices((prev) =>
                          prev.filter((i) => i.id !== inv.id),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <Input
                      placeholder="e.g. Costco"
                      value={inv.vendor}
                      onChange={(e) =>
                        setInvoices((prev) =>
                          prev.map((i) =>
                            i.id === inv.id
                              ? { ...i, vendor: e.target.value }
                              : i,
                          ),
                        )
                      }
                    />
                  </div>
                  {/* Invoice Items */}
                  <div className="space-y-2">
                    <Label>Items</Label>
                    {inv.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center gap-2"
                      >
                        <Input
                          placeholder="Description"
                          className="flex-1"
                          value={item.description}
                          onChange={(e) =>
                            updateInvoiceItem(inv.id, itemIdx, {
                              description: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          className="w-20"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateInvoiceItem(inv.id, itemIdx, {
                              quantity: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <div className="relative w-28">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            className="pl-7"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              updateInvoiceItem(inv.id, itemIdx, {
                                unitPrice:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <span className="font-mono text-sm w-20 text-right">
                          ${item.total.toFixed(2)}
                        </span>
                        {inv.items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setInvoices((prev) =>
                                prev.map((i) =>
                                  i.id === inv.id
                                    ? recalcInvoice({
                                        ...i,
                                        items: i.items.filter(
                                          (_, idx) => idx !== itemIdx,
                                        ),
                                      })
                                    : i,
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setInvoices((prev) =>
                          prev.map((i) =>
                            i.id === inv.id
                              ? {
                                  ...i,
                                  items: [
                                    ...i.items,
                                    {
                                      description: "",
                                      quantity: 1,
                                      unitPrice: 0,
                                      total: 0,
                                    },
                                  ],
                                }
                              : i,
                          ),
                        )
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tax</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          value={inv.tax || ""}
                          onChange={(e) =>
                            setInvoices((prev) =>
                              prev.map((i) =>
                                i.id === inv.id
                                  ? recalcInvoice({
                                      ...i,
                                      tax:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  : i,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tip</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          className="pl-7"
                          value={inv.tip || ""}
                          onChange={(e) =>
                            setInvoices((prev) =>
                              prev.map((i) =>
                                i.id === inv.id
                                  ? recalcInvoice({
                                      ...i,
                                      tip:
                                        parseFloat(e.target.value) || 0,
                                    })
                                  : i,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Total</Label>
                      <div className="flex items-center h-9 px-3 rounded-md border bg-muted/50 font-mono text-sm">
                        ${inv.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            onClick={() => handleSubmitEventRequest(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            Submit Event Request
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmitEventRequest(true)}
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            variant="ghost"
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

  // LIST VIEW
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground">
            Review event requests and manage published events.
          </p>
        </div>
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Event Request
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            "all",
            "submitted",
            "approved",
            "declined",
            "needs_review",
            "draft",
          ].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all"
                ? "All"
                : s
                    .replace("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Button>
          ))}
        </div>
      </div>

      {/* Event Requests */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Event Requests
          {filteredRequests && ` (${filteredRequests.length})`}
        </h2>
        {!eventRequests ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredRequests && filteredRequests.length > 0 ? (
          <div className="space-y-2">
            {filteredRequests.map((er) => {
              const isExpanded = expandedRequestId === er._id;
              const isDeclineForm = declineReasonId === er._id;
              return (
                <div
                  key={er._id}
                  className="rounded-xl border bg-card overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() =>
                      setExpandedRequestId(isExpanded ? null : er._id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{er.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {er.location} &middot;{" "}
                        {new Date(er.startDateTime).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={statusColors[er.status] || ""}
                        variant="secondary"
                      >
                        {er.status.replace("_", " ")}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t p-4 space-y-4">
                      {/* Detail Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-medium">{er.location}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start</p>
                          <p className="font-medium">
                            {new Date(er.startDateTime).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End</p>
                          <p className="font-medium">
                            {new Date(er.endDateTime).toLocaleString()}
                          </p>
                        </div>
                        {er.expectedAttendance && (
                          <div>
                            <p className="text-muted-foreground">
                              Expected Attendance
                            </p>
                            <p className="font-medium">
                              {er.expectedAttendance}
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Description</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {er.eventDescription}
                        </p>
                      </div>

                      {/* Feature Flags */}
                      <div className="flex flex-wrap gap-2">
                        {er.flyersNeeded && (
                          <Badge variant="outline">
                            <Image className="h-3 w-3 mr-1" />
                            Flyers Needed
                          </Badge>
                        )}
                        {er.photographyNeeded && (
                          <Badge variant="outline">
                            <Camera className="h-3 w-3 mr-1" />
                            Photography
                          </Badge>
                        )}
                        {er.needsGraphics && (
                          <Badge variant="outline">
                            <Image className="h-3 w-3 mr-1" />
                            Graphics
                          </Badge>
                        )}
                        {er.foodDrinksBeingServed && (
                          <Badge variant="outline">
                            <Utensils className="h-3 w-3 mr-1" />
                            Food/Drinks
                          </Badge>
                        )}
                        {er.willOrHaveRoomBooking && (
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            Room Booking
                          </Badge>
                        )}
                        {er.asFundingRequired && (
                          <Badge variant="outline">
                            <DollarSign className="h-3 w-3 mr-1" />
                            AS Funding
                          </Badge>
                        )}
                      </div>

                      {/* Flyer Details */}
                      {er.flyersNeeded && er.flyerType.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Flyer Types</p>
                          <p className="text-muted-foreground">
                            {er.flyerType.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* Logos */}
                      {er.requiredLogos.length > 0 && (
                        <div className="text-sm">
                          <p className="font-medium mb-1">Required Logos</p>
                          <p className="text-muted-foreground">
                            {er.requiredLogos.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* Invoices */}
                      {er.invoices && er.invoices.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Invoices ({er.invoices.length})
                          </p>
                          {er.invoices.map((inv: any, idx: number) => (
                            <div
                              key={inv.id || idx}
                              className="rounded-lg border p-3 mb-2 text-sm"
                            >
                              <div className="flex justify-between">
                                <span className="font-medium">
                                  {inv.vendor || `Invoice ${idx + 1}`}
                                </span>
                                <span className="font-mono">
                                  ${(inv.total || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Decline Reason */}
                      {er.declinedReason && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:bg-red-950/20 dark:border-red-800">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Declined Reason
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {er.declinedReason}
                          </p>
                        </div>
                      )}

                      {er.reviewFeedback && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:bg-orange-950/20 dark:border-orange-800">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                            Review Feedback
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            {er.reviewFeedback}
                          </p>
                        </div>
                      )}

                      {/* Decline Form */}
                      {isDeclineForm && (
                        <div className="rounded-lg border p-4 space-y-3">
                          <div className="space-y-2">
                            <Label>Reason for declining</Label>
                            <Textarea
                              placeholder="Explain why this request is being declined..."
                              value={declineReason}
                              onChange={(e) =>
                                setDeclineReason(e.target.value)
                              }
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleStatusChange(
                                  er._id,
                                  "declined",
                                  declineReason,
                                )
                              }
                              disabled={
                                !declineReason.trim() ||
                                processingId === er._id
                              }
                            >
                              Confirm Decline
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeclineReasonId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {hasAdminAccess &&
                        (er.status === "submitted" ||
                          er.status === "pending") && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(er._id, "approved")
                              }
                              disabled={processingId === er._id}
                            >
                              {processingId === er._id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            {!isDeclineForm && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeclineReasonId(er._id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleStatusChange(er._id, "needs_review")
                              }
                              disabled={processingId === er._id}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Needs Review
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
          <p className="text-muted-foreground text-sm py-4 text-center">
            No event requests
            {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </p>
        )}
      </div>

      {/* Published Events */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Published Events</h2>
        {!events ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {events
              .filter((e) =>
                e.eventName.toLowerCase().includes(search.toLowerCase()),
              )
              .map((event) => {
                const isExpanded = expandedEventId === event._id;
                return (
                  <div
                    key={event._id}
                    className="rounded-xl border bg-card overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : event._id)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {event.eventName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.location} &middot;{" "}
                          {new Date(event.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={event.published ? "default" : "secondary"}
                        >
                          {event.published ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline">{event.eventType}</Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-muted-foreground">Event Code</p>
                            <p className="font-mono font-medium">
                              {event.eventCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Points</p>
                            <p className="font-medium">
                              {event.pointsToReward}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Start</p>
                            <p className="font-medium">
                              {new Date(event.startDate).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">End</p>
                            <p className="font-medium">
                              {new Date(event.endDate).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Description</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {event.eventDescription}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {event.hasFood && (
                            <Badge variant="outline">
                              <Utensils className="h-3 w-3 mr-1" />
                              Food
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No events yet.</p>
        )}
      </div>
    </div>
  );
}
