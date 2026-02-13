import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Search,
  Settings,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ChevronUp,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { type ReactElement } from "react";
import { Pagination } from "@/components/ui/pagination";
import BudgetManagementModal from "@/components/fund-requests/BudgetManagementModal";
import FundRequestActionModal from "@/components/fund-requests/FundRequestActionModal";

export const Route = createFileRoute("/_dashboard/manage-fund-requests")({
  component: ManageFundRequestsPage,
});

const ITEMS_PER_PAGE = 10;

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  needs_info: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  denied: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  needs_info: "Needs Info",
  approved: "Approved",
  denied: "Denied",
  completed: "Completed",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  events: "Events",
  projects: "Projects",
  internal: "Internal",
  other: "Other",
};

const STATUS_ICONS: Record<string, ReactElement> = {
  submitted: <Clock className="w-3.5 h-3.5" />,
  needs_info: <AlertCircle className="w-3.5 h-3.5" />,
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  denied: <XCircle className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
};

function ManageFundRequestsPage() {
  const { hasOfficerAccess, hasAdminAccess, logtoId } = usePermissions();
  const allRequests = useQuery(
    api.fundRequests.listAll,
    logtoId ? { logtoId } : "skip",
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  if (!hasOfficerAccess) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You don't have permission to access this page.
      </div>
    );
  }

  const filteredRequests = (allRequests || [])
    .filter((r) => r.status !== "draft")
    .filter((r) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.submittedByName && r.submittedByName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        r.amount.toString().includes(searchQuery);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || r.department === departmentFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const getStats = () => {
    const pendingCount = filteredRequests.filter((r) => r.status === "submitted").length;
    const needsInfoCount = filteredRequests.filter((r) => r.status === "needs_info").length;
    const pendingValue = filteredRequests
      .filter((r) => r.status === "submitted")
      .reduce((sum, r) => sum + r.amount, 0);
    const approvedValue = filteredRequests
      .filter((r) => r.status === "approved" || r.status === "completed")
      .reduce((sum, r) => sum + r.amount, 0);

    return { pendingCount, needsInfoCount, pendingValue, approvedValue };
  };

  const stats = getStats();

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Fund Requests</h1>
          <p className="text-muted-foreground">
            Review and manage funding requests from all departments.
          </p>
        </div>
        {hasAdminAccess && (
          <Button variant="outline" onClick={() => setIsBudgetModalOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure Budgets
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Review</p>
              <p className="text-xl font-bold mt-1 text-blue-600">{stats.pendingCount}</p>
            </div>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Needs Information</p>
              <p className="text-xl font-bold mt-1 text-orange-600">{stats.needsInfoCount}</p>
            </div>
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Amount</p>
              <p className="text-xl font-bold mt-1 text-gray-900">{formatCurrency(stats.pendingValue)}</p>
            </div>
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Approved</p>
              <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(stats.approvedValue)}</p>
            </div>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPage(1);
            }}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "submitted" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("submitted");
              setPage(1);
            }}
          >
            Submitted
          </Button>
          <Button
            variant={statusFilter === "needs_info" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("needs_info");
              setPage(1);
            }}
          >
            Needs Info
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("approved");
              setPage(1);
            }}
          >
            Approved
          </Button>
          <Button
            variant={statusFilter === "denied" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("denied");
              setPage(1);
            }}
          >
            Denied
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("completed");
              setPage(1);
            }}
          >
            Completed
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap border-l pl-3">
          <Button
            variant={departmentFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setDepartmentFilter("all");
              setPage(1);
            }}
          >
            All Depts
          </Button>
          <Button
            variant={departmentFilter === "events" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setDepartmentFilter("events");
              setPage(1);
            }}
          >
            Events
          </Button>
          <Button
            variant={departmentFilter === "projects" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setDepartmentFilter("projects");
              setPage(1);
            }}
          >
            Projects
          </Button>
          <Button
            variant={departmentFilter === "internal" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setDepartmentFilter("internal");
              setPage(1);
            }}
          >
            Internal
          </Button>
          <Button
            variant={departmentFilter === "other" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => {
              setDepartmentFilter("other");
              setPage(1);
            }}
          >
            Other
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {!allRequests ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : paginatedRequests.length > 0 ? (
          <div className="divide-y">
            {paginatedRequests.map((request) => {
              const isExpanded = expandedRequestId === request._id;
              return (
                <div key={request._id}>
                  <div
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedRequestId(isExpanded ? null : request._id)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Request Info */}
                      <div className="col-span-12 md:col-span-4 min-w-0">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{request.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {request.purpose}
                          </span>
                        </div>
                      </div>

                      {/* Requester */}
                      <div className="col-span-6 md:col-span-2">
                        <div className="text-sm">
                          <div className="font-medium text-xs">{request.submittedByName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(request.createdAt || Date.now())}</div>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="col-span-6 md:col-span-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {DEPARTMENT_LABELS[request.department] || request.department}
                        </Badge>
                      </div>

                      {/* Amount */}
                      <div className="col-span-4 md:col-span-1">
                        <span className="font-semibold text-sm">{formatCurrency(request.amount)}</span>
                      </div>

                      {/* Status */}
                      <div className="col-span-4 md:col-span-2">
                        <Badge className={STATUS_COLORS[request.status] || ""} variant="secondary">
                          <span className="mr-1">{STATUS_ICONS[request.status]}</span>
                          {STATUS_LABELS[request.status]}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="col-span-8 md:col-span-1 flex justify-end">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequestId(request._id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground mt-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground mt-2" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 bg-muted/30 border-t">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Request ID</p>
                          <p className="font-mono text-xs">{request._id.slice(0, 8)}...</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Requester Email</p>
                          <p className="font-medium">{request.submittedByEmail || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Category</p>
                          <p className="font-medium capitalize">{request.category}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Submitted</p>
                          <p className="font-medium">{new Date(request.createdAt || Date.now()).toLocaleString()}</p>
                        </div>
                      </div>

                      {request.vendorLinks && request.vendorLinks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Purchase Links</p>
                          <div className="flex flex-wrap gap-2">
                            {request.vendorLinks.map((link) => (
                              <a
                                key={link.id}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {link.itemName || link.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {request.attachments && request.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Attachments ({request.attachments.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.attachments.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {(request.reviewNotes || request.infoRequestNotes) && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Review Notes</p>
                          <p className="text-sm">{request.reviewNotes || request.infoRequestNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No requests found matching your filters.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRequestId && logtoId && (
        <FundRequestActionModal
          isOpen={!!selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          requestId={selectedRequestId}
          logtoId={logtoId}
        />
      )}

      {logtoId && (
        <BudgetManagementModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          logtoId={logtoId}
        />
      )}
    </div>
  );
}
