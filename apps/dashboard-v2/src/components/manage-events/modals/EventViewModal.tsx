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
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Send,
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
import { StatusBadge } from "../filters/StatusBadge";
import type { EventRequest } from "../types";

interface EventViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventRequest | null;
  onEdit?: (event: EventRequest) => void;
  onDelete?: (event: EventRequest) => void;
  onPublish?: (event: EventRequest) => void;
  onDecline?: (event: EventRequest) => void;
}

export function EventViewModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onPublish,
  onDecline,
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
              {event.status === "pending" && (
                <>
                  {onDecline && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => onDecline(event)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  )}
                  {onPublish && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => onPublish(event)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  )}
                </>
              )}
              {event.status === "draft" && onPublish && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPublish(event)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              )}
            </div>
          </div>
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
                <div className="space-y-2">
                  {event.invoices.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{invoice.vendor}</p>
                        <p className="text-xs text-gray-500">
                          {invoice.description}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        ${invoice.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
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
