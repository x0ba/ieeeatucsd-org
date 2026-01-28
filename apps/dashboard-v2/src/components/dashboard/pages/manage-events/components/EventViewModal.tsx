import React from "react";
import { Button } from "../../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../ui/dialog";
import { Badge } from "../../../../ui/badge";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";

interface EventViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventData | null;
}

interface EventData {
  _id: string;
  eventName: string;
  eventDescription: string;
  eventCode: string;
  location: string;
  startDate: number;
  endDate: number;
  published: boolean;
  eventType: string;
  hasFood: boolean;
  pointsToReward: number;
  files: string[];
  createdFrom?: string;
}

export function EventViewModal({ open, onOpenChange, event }: EventViewModalProps) {
  if (!event) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      social: "bg-blue-100 text-blue-800",
      technical: "bg-green-100 text-green-800",
      outreach: "bg-purple-100 text-purple-800",
      professional: "bg-orange-100 text-orange-800",
      projects: "bg-red-100 text-red-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {event.eventName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Header */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getEventTypeColor(event.eventType)}>
              {event.eventType}
            </Badge>
            <Badge variant={event.published ? "default" : "secondary"}>
              {event.published ? "Published" : "Draft"}
            </Badge>
            {event.hasFood && (
              <Badge variant="outline" className="text-green-600">
                Food Provided
              </Badge>
            )}
            <Badge variant="outline">
              {event.pointsToReward} Points
            </Badge>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.startDate)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(event.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {event.location}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Event Code</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {event.eventCode}
                  </p>
                </div>
              </div>

              {event.createdFrom && (
                <div>
                  <p className="text-sm font-medium">Created From</p>
                  <p className="text-sm text-muted-foreground">
                    {event.createdFrom}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.eventDescription}
            </p>
          </div>

          {/* Files */}
          {event.files && event.files.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Files</h3>
              <div className="space-y-2">
                {event.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
