import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventRequest } from "../types";

interface DraftEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<EventRequest>) => void;
}

const defaultDraftData: Partial<EventRequest> = {
  eventName: "",
  eventDescription: "",
  eventType: "General Meeting",
  location: "TBD",
  startDate: Date.now() + 86400000, // Tomorrow
  endDate: Date.now() + 90000000, // Tomorrow + 1 hour
  eventCode: "",
  status: "draft",
  hasFood: false,
  needsFlyers: false,
  needsGraphics: false,
  needsASFunding: false,
  estimatedAttendance: 0,
  files: [],
  invoices: [],
};

export function DraftEventModal({
  isOpen,
  onClose,
  onSubmit,
}: DraftEventModalProps) {
  const [formData, setFormData] = useState<Partial<EventRequest>>(defaultDraftData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.eventName?.trim()) {
      onSubmit({
        ...formData,
        eventCode: formData.eventCode || `EVENT-${Date.now()}`,
      });
      setFormData(defaultDraftData);
      onClose();
    }
  };

  const updateField = (field: keyof EventRequest, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toISOString().slice(0, 16);
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const timestamp = value ? new Date(value).getTime() : Date.now();
    updateField(field, timestamp);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Quick Draft</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="draft-name">
              Event Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="draft-name"
              value={formData.eventName}
              onChange={(e) => updateField("eventName", e.target.value)}
              placeholder="Enter event name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-description">Description</Label>
            <Textarea
              id="draft-description"
              value={formData.eventDescription}
              onChange={(e) => updateField("eventDescription", e.target.value)}
              placeholder="Brief description (optional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="draft-start">Start Date</Label>
              <Input
                id="draft-start"
                type="datetime-local"
                value={formatDateForInput(formData.startDate)}
                onChange={(e) => handleDateChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="draft-end">End Date</Label>
              <Input
                id="draft-end"
                type="datetime-local"
                value={formatDateForInput(formData.endDate)}
                onChange={(e) => handleDateChange("endDate", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-location">Location</Label>
            <Input
              id="draft-location"
              value={formData.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="e.g., TBD"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <p>
              This will create a draft event. You can edit and submit it for
              approval later through the full event request form.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Draft</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
