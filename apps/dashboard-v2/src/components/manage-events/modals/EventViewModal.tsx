import { useState } from "react";
import { format } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  Utensils,
  Printer,
  Image as ImageIcon,
  DollarSign,
  Clock,
  User,
  FileText,
  History,
  Pencil,
  Trash2,
  Send,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "../filters/StatusBadge";
import type { EventRequest, EventStatus } from "../types";

interface EventViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRequest | null;
  onEdit?: (event: EventRequest) => void;
  onDelete?: (event: EventRequest) => void;
  onPublish?: (event: EventRequest) => void;
  onDecline?: (event: EventRequest) => void;
  onStatusChange?: (event: EventRequest, status: EventStatus) => void;
  onTogglePublish?: (event: EventRequest, canPublish: boolean) => void;
  canManageStatus?: boolean;
}

const editableStatuses: { value: EventStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "pending", label: "Pending" },
  { value: "needs_review", label: "Needs Review" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
];

export function EventViewModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onPublish,
  onStatusChange,
  onTogglePublish,
  canManageStatus,
}: EventViewModalProps) {
  const [activeTab, setActiveTab] = useState("details");

  if (!event) return null;

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "MMMM d, yyyy");
  };

  const formatTime = (timestamp: number) => {
    return format(new Date(timestamp), "h:mm a");
  };

  const getRequirements = () => {
    const reqs = [];
    if (event.hasFood) reqs.push({ icon: Utensils, label: "Food" });
    if (event.needsFlyers) reqs.push({ icon: Printer, label: "Flyers" });
    if (event.needsGraphics) reqs.push({ icon: ImageIcon, label: "Graphics" });
    return reqs;
  };

  const requirements = getRequirements();
  const totalInvoices = event.invoices.reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{event.eventName}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={event.status} />
                <span className="text-sm text-gray-500">
                  {event.eventType}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* No submit button for drafts - drafts should only be edited */}
            </div>
          </div>

          {/* Status management for non-draft events */}
          {event.status !== "draft" && canManageStatus && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="event-status" className="text-sm font-medium whitespace-nowrap">
                  Status:
                </Label>
                <Select
                  value={event.status}
                  onValueChange={(value) => {
                    if (onStatusChange) onStatusChange(event, value as EventStatus);
                  }}
                >
                  <SelectTrigger id="event-status" className="w-44 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editableStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="can-publish"
                  checked={event.status === "published"}
                  onCheckedChange={(checked) => {
                    if (onTogglePublish) onTogglePublish(event, checked as boolean);
                  }}
                />
                <Label htmlFor="can-publish" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Published
                </Label>
              </div>
            </div>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="files">Files/Graphics</TabsTrigger>
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Date & Time
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(event.startDate)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatTime(event.startDate)} - {formatTime(event.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Location
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.location}
                    </p>
                  </div>
                </div>

                {event.capacity && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Capacity
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.capacity} attendees
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Created By
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.createdBy}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(event._creationTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Event Code
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {event.eventCode}
                    </p>
                  </div>
                </div>

                {event.department && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Department
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.department}
                    </p>
                  </div>
                )}

                {requirements.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Requirements
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {requirements.map((req) => (
                        <span
                          key={req.label}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700"
                        >
                          <req.icon className="h-3 w-3" />
                          {req.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Description
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {event.eventDescription}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            {event.files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No files attached</p>
              </div>
            ) : (
              <div className="space-y-2">
                {event.files.map((file, fileIndex) => (
                  <div
                    key={fileIndex}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm">{file}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="funding" className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">AS Funding Requested</p>
                  <p className="text-xs text-gray-500">
                    {event.needsASFunding ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>

            {event.invoices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Invoices</h4>
                <div className="space-y-3">
                  {event.invoices.map((invoice) => {
                    const itemsSummary = invoice.items
                      .map((item) => {
                        const qty = item.quantity || 1;
                        const price = item.unitPrice || (item.total / qty);
                        return `${qty} ${item.description} x$${price.toFixed(2)} each`;
                      })
                      .join(" | ");
                    const taxPart = invoice.tax > 0 ? ` | Tax = $${invoice.tax.toFixed(2)}` : "";
                    const tipPart = invoice.tip > 0 ? ` | Tip = $${invoice.tip.toFixed(2)}` : "";
                    const totalPart = ` | Total = $${(invoice.total || invoice.amount || 0).toFixed(2)}`;
                    const vendorPart = invoice.vendor ? ` from ${invoice.vendor}` : "";

                    return (
                      <div
                        key={invoice._id}
                        className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {invoice.items.length > 0
                            ? `${itemsSummary}${taxPart}${tipPart}${totalPart}${vendorPart}`
                            : `${invoice.description || "Invoice"}${totalPart}${vendorPart}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold">
                    ${totalInvoices.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attendees" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Attendee management coming soon</p>
              <p className="text-xs text-gray-400 mt-1">
                Estimated attendance: {event.estimatedAttendance}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Event Created</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(event._creationTime)} at{" "}
                    {formatTime(event._creationTime)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <History className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-xs text-gray-500">
                    {event._updatedAt
                      ? `${formatDate(event._updatedAt)} at ${formatTime(
                          event._updatedAt
                        )}`
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(event)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
