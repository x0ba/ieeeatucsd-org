import { Search, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventFilters, EventStatus } from "../types";

interface EventsFiltersProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  onClearFilters: () => void;
}

const statusOptions: { value: EventStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "published", label: "Published" },
];

export function EventsFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: EventsFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.status !== "all" || filters.startDate || filters.endDate;

  const formatDateForInput = (timestamp?: number) => {
    if (!timestamp) return "";
    return new Date(timestamp).toISOString().split("T")[0];
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    const timestamp = value ? new Date(value).getTime() : undefined;
    onFiltersChange({ ...filters, [field]: timestamp });
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center flex-wrap">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-9"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ ...filters, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              placeholder="Start date"
              value={formatDateForInput(filters.startDate)}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="pl-9 w-full sm:w-40"
            />
          </div>
          <span className="text-muted-foreground self-center hidden sm:inline">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              placeholder="End date"
              value={formatDateForInput(filters.endDate)}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="pl-9 w-full sm:w-40"
            />
          </div>
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value as EventStatus | "all",
            })
          }
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="shrink-0">
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
