import React, { useState } from "react";
import { Button } from "../../../../ui/button";
import { Input } from "../../../../ui/input";
import { Textarea } from "../../../../ui/textarea";
import { Label } from "../../../../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../ui/select";

interface EventRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventRequestData) => void;
  initialData?: Partial<EventRequestData>;
}

interface EventRequestData {
  name: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  eventDescription: string;
  flyersNeeded: boolean;
  photographyNeeded: boolean;
  willOrHaveRoomBooking: boolean;
  asFundingRequired: boolean;
  foodDrinksBeingServed: boolean;
  needsGraphics: boolean;
  needsAsFunding: boolean;
  expectedAttendance?: number;
  department?: string;
}

export function EventRequestModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: EventRequestModalProps) {
  const [formData, setFormData] = useState<EventRequestData>({
    name: "",
    location: "",
    startDateTime: "",
    endDateTime: "",
    eventDescription: "",
    flyersNeeded: false,
    photographyNeeded: false,
    willOrHaveRoomBooking: false,
    asFundingRequired: false,
    foodDrinksBeingServed: false,
    needsGraphics: false,
    needsAsFunding: false,
    ...initialData,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const handleInputChange = (field: keyof EventRequestData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Event Request" : "Create Event Request"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDateTime">Start Date & Time</Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => handleInputChange("startDateTime", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDateTime">End Date & Time</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => handleInputChange("endDateTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="eventDescription">Event Description</Label>
            <Textarea
              id="eventDescription"
              value={formData.eventDescription}
              onChange={(e) => handleInputChange("eventDescription", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange("department", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expectedAttendance">Expected Attendance</Label>
              <Input
                id="expectedAttendance"
                type="number"
                value={formData.expectedAttendance || ""}
                onChange={(e) => handleInputChange("expectedAttendance", parseInt(e.target.value) || undefined)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Requirements</Label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.flyersNeeded}
                  onChange={(e) => handleInputChange("flyersNeeded", e.target.checked)}
                />
                <span>Flyers Needed</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.photographyNeeded}
                  onChange={(e) => handleInputChange("photographyNeeded", e.target.checked)}
                />
                <span>Photography Needed</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.willOrHaveRoomBooking}
                  onChange={(e) => handleInputChange("willOrHaveRoomBooking", e.target.checked)}
                />
                <span>Room Booking</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.asFundingRequired}
                  onChange={(e) => handleInputChange("asFundingRequired", e.target.checked)}
                />
                <span>AS Funding Required</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.foodDrinksBeingServed}
                  onChange={(e) => handleInputChange("foodDrinksBeingServed", e.target.checked)}
                />
                <span>Food & Drinks</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.needsGraphics}
                  onChange={(e) => handleInputChange("needsGraphics", e.target.checked)}
                />
                <span>Graphics Needed</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update Request" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
