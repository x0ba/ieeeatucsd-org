import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  FileEdit,
  MapPin,
  Users,
  Utensils,
  Image,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "../filters/StatusBadge";
import type { EventRequest, SortConfig } from "../types";
import { format } from "date-fns";

interface EventsDataTableProps {
  events: EventRequest[];
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  onView: (event: EventRequest) => void;
  onEdit: (event: EventRequest) => void;
  onDelete: (event: EventRequest) => void;
  onConvertToDraft: (event: EventRequest) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function EventsDataTable({
  events,
  sortConfig,
  onSort,
  onView,
  onEdit,
  onDelete,
  onConvertToDraft,
  pagination,
}: EventsDataTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const getSortIcon = (field: string) => {
    if (sortConfig.field === field) {
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : (
        <ChevronDown className="w-3.5 h-3.5" />
      );
    }
    return null;
  };

  const getRequirements = (event: EventRequest) => {
    const reqs = [];
    if (event.hasFood) reqs.push({ icon: Utensils, label: "Food" });
    if (event.needsFlyers) reqs.push({ icon: Printer, label: "Flyers" });
    if (event.needsGraphics) reqs.push({ icon: Image, label: "Graphics" });
    return reqs;
  };

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <MapPin className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No events found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create a new event or adjust your filters to see events here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden max-w-full">
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b bg-gray-50/50 dark:bg-gray-700/50">
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => onSort("eventName")}
              >
                <span className="flex items-center gap-1">
                  Name {getSortIcon("eventName")}
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => onSort("startDate")}
              >
                <span className="flex items-center gap-1">
                  Date {getSortIcon("startDate")}
                </span>
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => onSort("status")}
              >
                <span className="flex items-center gap-1">
                  Status {getSortIcon("status")}
                </span>
              </TableHead>
              <TableHead>Requirements</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => {
              const requirements = getRequirements(event);
              const isHovered = hoveredRow === event._id;

              return (
                <TableRow
                  key={event._id}
                  className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  onMouseEnter={() => setHoveredRow(event._id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <TableCell className="min-w-[180px]">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                      {event.eventName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {event.eventType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {format(event.startDate, "MMM d, yyyy")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {format(event.startDate, "h:mm a")} -
                      {format(event.endDate, "h:mm a")}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-gray-100">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    {event.capacity && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <Users className="h-3 w-3" />
                        Capacity: {event.capacity}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {requirements.length === 0 ? (
                        <span className="text-xs text-gray-400">-</span>
                      ) : (
                        requirements.map((req) => (
                          <span
                            key={req.label}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                          >
                            <req.icon className="h-3 w-3" />
                            {req.label}
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`flex items-center gap-1 justify-end transition-opacity duration-200 ${
                        isHovered ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onView(event)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit(event)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDelete(event)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {event.status !== "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onConvertToDraft(event)}
                          title="Convert to Draft"
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-muted-foreground">
            Showing {((pagination.currentPage - 1) * 10 + 1).toLocaleString()} to{" "}
            {Math.min(pagination.currentPage * 10, events.length).toLocaleString()} of{" "}
            {events.length.toLocaleString()} events
          </span>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </div>
  );
}
