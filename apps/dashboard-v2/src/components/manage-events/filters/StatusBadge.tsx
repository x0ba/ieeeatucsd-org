import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "../types";

interface StatusBadgeProps {
  status: EventStatus;
  className?: string;
}

const statusStyles: Record<EventStatus, string> = {
  draft:
    "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700",
  declined:
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
  published:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
};

const statusLabels: Record<EventStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
  published: "Published",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium capitalize ${statusStyles[status]} ${className || ""}`}
    >
      {statusLabels[status]}
    </Badge>
  );
}
