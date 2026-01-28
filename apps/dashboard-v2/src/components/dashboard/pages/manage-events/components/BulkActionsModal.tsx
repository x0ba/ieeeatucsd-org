import React, { useState } from "react";
import { Button } from "../../../../../ui/button";
import { Label } from "../../../../../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../ui/select";
import { Textarea } from "../../../../../ui/textarea";
import { Checkbox } from "../../../../../ui/checkbox";
import { Badge } from "../../../../../ui/badge";
import { 
  Mail, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Archive,
  Send
} from "lucide-react";

interface BulkActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvents: string[];
  onAction: (action: BulkAction, params: BulkActionParams) => void;
}

interface BulkAction {
  type: "publish" | "unpublish" | "delete" | "send_reminder" | "update_status";
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  requiresParams?: boolean;
}

interface BulkActionParams {
  message?: string;
  newStatus?: string;
  sendEmail?: boolean;
}

export function BulkActionsModal({
  open,
  onOpenChange,
  selectedEvents,
  onAction,
}: BulkActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [params, setParams] = useState<BulkActionParams>({});

  const bulkActions: BulkAction[] = [
    {
      type: "publish",
      label: "Publish Events",
      icon: CheckCircle,
      description: "Publish all selected events",
    },
    {
      type: "unpublish",
      label: "Unpublish Events",
      icon: XCircle,
      description: "Unpublish all selected events",
    },
    {
      type: "send_reminder",
      label: "Send Reminder",
      icon: Mail,
      description: "Send reminder email to attendees",
      requiresParams: true,
    },
    {
      type: "update_status",
      label: "Update Status",
      icon: CalendarDays,
      description: "Change status of all selected events",
      requiresParams: true,
    },
    {
      type: "delete",
      label: "Delete Events",
      icon: Archive,
      description: "Delete all selected events (irreversible)",
    },
  ];

  const handleActionSelect = (actionType: string) => {
    const action = bulkActions.find(a => a.type === actionType);
    setSelectedAction(action || null);
    setParams({});
  };

  const handleExecute = () => {
    if (selectedAction) {
      onAction(selectedAction.type, params);
      onOpenChange(false);
      setSelectedAction(null);
      setParams({});
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Actions - {selectedEvents.length} Events Selected</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Events Summary */}
          <div>
            <Label className="text-sm font-medium">Selected Events</Label>
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {selectedEvents.length} event(s) selected for bulk action
              </p>
            </div>
          </div>

          {/* Action Selection */}
          <div>
            <Label className="text-sm font-medium">Select Action</Label>
            <div className="mt-2 space-y-2">
              {bulkActions.map((action) => (
                <div
                  key={action.type}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAction?.type === action.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  onClick={() => handleActionSelect(action.type)}
                >
                  <div className="flex items-start gap-3">
                    <action.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-medium">{action.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Parameters */}
          {selectedAction?.requiresParams && (
            <div className="space-y-4">
              {selectedAction.type === "send_reminder" && (
                <>
                  <div>
                    <Label htmlFor="message">Reminder Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your reminder message..."
                      value={params.message || ""}
                      onChange={(e) => setParams(prev => ({ ...prev, message: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendEmail"
                      checked={params.sendEmail || false}
                      onCheckedChange={(checked) => 
                        setParams(prev => ({ ...prev, sendEmail: checked as boolean }))
                      }
                    />
                    <Label htmlFor="sendEmail">Send email notification</Label>
                  </div>
                </>
              )}

              {selectedAction.type === "update_status" && (
                <div>
                  <Label htmlFor="newStatus">New Status</Label>
                  <Select
                    value={params.newStatus}
                    onValueChange={(value) => setParams(prev => ({ ...prev, newStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor("draft")}>Draft</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="published">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor("published")}>Published</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor("completed")}>Completed</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor("cancelled")}>Cancelled</Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Warning for destructive actions */}
          {selectedAction?.type === "delete" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Warning</h4>
                  <p className="text-sm text-red-700">
                    This action will permanently delete {selectedEvents.length} event(s). 
                    This cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExecute}
            disabled={!selectedAction || (selectedAction.requiresParams && !params.newStatus && !params.message)}
            className={selectedAction?.type === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Send className="h-4 w-4 mr-2" />
            Execute {selectedAction?.label || "Action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
