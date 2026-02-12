"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  MapPin,
  Users,
  Award,
  Utensils,
  FileText,
  Eye,
  Download,
  UserCheck,
  X,
} from "lucide-react";
import {
  Event,
  getEventStatus,
  formatEventDate,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
} from "./types";

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn?: () => void;
  userHasAttended?: boolean;
  attendeeCount?: number;
  capacity?: number;
}

export function EventDetailModal({
  event,
  isOpen,
  onClose,
  onCheckIn,
  userHasAttended = false,
  attendeeCount = 0,
  capacity,
}: EventDetailModalProps) {
  if (!event) return null;

  const status = getEventStatus(event);
  const isLive = status === "live";
  const isUpcoming = status === "upcoming";

  const statusBadge = () => {
    if (isLive) {
      return (
        <Badge className="bg-green-500 text-white animate-pulse">
          Live Now
        </Badge>
      );
    }
    if (isUpcoming) {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Upcoming
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        Ended
      </Badge>
    );
  };

  const getFileType = (url: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
    const isPdf = /\.pdf$/i.test(url);
    if (isPdf) return { type: "PDF", color: "bg-red-100 text-red-600" };
    if (isImage) return { type: "Image", color: "bg-purple-100 text-purple-600" };
    return { type: "File", color: "bg-blue-100 text-blue-600" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold leading-tight">
                {event.eventName}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge
                  variant="secondary"
                  className={EVENT_TYPE_COLORS[event.eventType]}
                >
                  {EVENT_TYPE_LABELS[event.eventType]}
                </Badge>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  <Award className="w-3 h-3 mr-1" />
                  {event.pointsToReward} Points
                </Badge>
                {event.hasFood && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    <Utensils className="w-3 h-3 mr-1" />
                    Food Provided
                  </Badge>
                )}
                {statusBadge()}
                {userHasAttended && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <UserCheck className="w-3 h-3 mr-1" />
                    You Attended
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          <div className="space-y-8">
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                About Event
              </h3>
              <div className="p-4 bg-muted rounded-xl border">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {event.eventDescription || "No description available."}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* When */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  When
                </h3>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {formatEventDate(event.startDate)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.startDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(event.endDate).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Where */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Where
                </h3>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-foreground">
                    {event.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Attendance
              </h3>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-xl border">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium text-foreground">
                  {attendeeCount} checked in
                  {capacity ? ` / ${capacity} capacity` : ""}
                </span>
              </div>
            </div>

            {/* Files Section */}
            {event.files && event.files.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Event Resources
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {event.files.map((fileUrl, index) => {
                      const fileInfo = getFileType(fileUrl);
                      const fileName = `Event File ${index + 1}`;

                      return (
                        <Card
                          key={index}
                          className="border shadow-sm hover:border-primary/50 transition-colors cursor-pointer group"
                          onClick={() => window.open(fileUrl, "_blank")}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-lg ${fileInfo.color}`}
                            >
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {fileInfo.type} Document
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(fileUrl, "_blank");
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const a = document.createElement("a");
                                  a.href = fileUrl;
                                  a.download = fileName;
                                  a.click();
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/50 pt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          {(isLive || isUpcoming) && !userHasAttended && onCheckIn && (
            <Button onClick={onCheckIn}>
              <UserCheck className="w-4 h-4 mr-2" />
              Check In Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
