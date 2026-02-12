import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  FileText,
  ExternalLink,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Briefcase,
  Tag,
  History,
} from "lucide-react";
import { formatCurrency, formatDate, type FundRequestStatus } from "@/types/fund-requests";
import { STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, DEPARTMENT_LABELS } from "@/types/fund-requests";

const getStatusIcon = (status: FundRequestStatus) => {
  switch (status) {
    case "draft":
      return <FileText className="w-3.5 h-3.5" />;
    case "submitted":
      return <Clock className="w-3.5 h-3.5" />;
    case "needs_info":
      return <AlertCircle className="w-3.5 h-3.5" />;
    case "approved":
      return <CheckCircle className="w-3.5 h-3.5" />;
    case "denied":
      return <XCircle className="w-3.5 h-3.5" />;
    case "completed":
      return <CheckCircle className="w-3.5 h-3.5" />;
    default:
      return <FileText className="w-3.5 h-3.5" />;
  }
};

interface VendorLink {
  id: string;
  url: string;
  itemName?: string;
  quantity?: number;
}

interface FundRequestAttachment {
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
}

interface FundRequestAuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByName?: string;
  timestamp: number;
  notes?: string;
  previousStatus?: string;
  newStatus?: string;
}

interface FundRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    title: string;
    purpose: string;
    category: string;
    department?: string;
    amount: number;
    status: FundRequestStatus;
    submittedByName?: string;
    submittedByEmail?: string;
    createdAt: number;
    submittedAt?: number;
    reviewNotes?: string;
    infoRequestNotes?: string;
    infoResponseNotes?: string;
    vendorLinks?: VendorLink[];
    attachments?: FundRequestAttachment[];
    auditLogs?: FundRequestAuditLog[];
  } | null;
  onEdit?: () => void;
}

export function FundRequestDetailModal({ isOpen, onClose, request, onEdit }: FundRequestDetailModalProps) {
  if (!request) return null;

  const canEdit = request.status === "draft" || request.status === "needs_info";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          {request && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={STATUS_COLORS[request.status]} variant="secondary">
                <span className="flex items-center gap-1">
                  {getStatusIcon(request.status)}
                  {STATUS_LABELS[request.status]}
                </span>
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</span>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Alerts for Needs Info / Denied / Approved */}
            {request.status === "needs_info" && request.infoRequestNotes && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4 flex flex-row gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm mb-1">Information Requested</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 leading-relaxed">{request.infoRequestNotes}</p>
                </div>
              </div>
            )}

            {request.status === "denied" && request.reviewNotes && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-4 flex flex-row gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm mb-1">Request Denied</h4>
                  <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{request.reviewNotes}</p>
                </div>
              </div>
            )}

            {request.status === "approved" && (
              <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4 flex flex-row gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 text-sm mb-1">Request Approved</h4>
                  <div className="space-y-1">
                    {request.reviewNotes && <p className="text-sm text-green-700 dark:text-green-400 leading-relaxed">{request.reviewNotes}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Purpose */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4" /> Purpose
              </h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted p-4 rounded-xl border">
                {request.purpose}
              </p>
            </div>

            {request.infoResponseNotes && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Additional Context
                </h3>
                <div className="bg-yellow-50/30 dark:bg-yellow-950/30 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/50">
                  <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Response to Info Request:</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{request.infoResponseNotes}</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl border bg-muted">
                <span className="text-xs text-muted-500 font-medium">Amount</span>
                <div className="flex items-center gap-1 mt-1 text-green-600 font-bold text-lg">{formatCurrency(request.amount)}</div>
              </div>
              <div className="p-3 rounded-xl border bg-background">
                <span className="text-xs text-muted-500 font-medium">Department</span>
                <div className="flex items-center gap-2 mt-1 font-medium text-foreground">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  {request.department ? DEPARTMENT_LABELS[request.department as keyof typeof DEPARTMENT_LABELS] : "N/A"}
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-background">
                <span className="text-xs text-muted-500 font-medium">Category</span>
                <div className="flex items-center gap-2 mt-1 font-medium text-foreground">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                  {CATEGORY_LABELS[request.category as keyof typeof CATEGORY_LABELS]}
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-background">
                <span className="text-xs text-muted-500 font-medium">Timeline</span>
                <div className="flex items-center gap-2 mt-1 font-medium text-foreground">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  {formatDate(request.createdAt)}
                </div>
              </div>
            </div>

            {/* Vendor Links & Attachments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Links
                </h3>
                {request.vendorLinks && request.vendorLinks.length > 0 ? (
                  <div className="space-y-2">
                    {request.vendorLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border bg-card p-3 hover:border-primary transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded flex-shrink-0">x{link.quantity || 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate text-foreground">
                                {link.itemName || link.url || "Link"}
                              </p>
                              {link.url && <p className="text-xs text-muted-foreground truncate">{link.url}</p>}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No links provided.</p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Download className="w-4 h-4" /> Attachments
                </h3>
                {request.attachments && request.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {request.attachments.map((attachment) => (
                      <div key={attachment.id} className="group flex items-center justify-between p-2 rounded-xl border bg-card hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-muted text-muted-foreground">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate max-w-[150px]">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={attachment.url} download={attachment.name}>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No attachments.</p>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            {request.auditLogs && request.auditLogs.length > 0 && (
              <div className="pt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-4">
                  <History className="w-4 h-4" /> Activity History
                </h3>
                <div className="space-y-0 pl-2">
                  {request.auditLogs.map((log, _index) => (
                    <div key={log.id} className="relative pl-6 pb-6 last:pb-0 border-l border-muted last:border-l-0">
                      <div className="absolute top-0 left-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-background bg-muted shadow-sm z-10 box-content" />
                      <div className="flex flex-col gap-1 -mt-1">
                        <p className="text-sm font-medium text-foreground">
                          <span className="capitalize">{log.action.replace(/_/g, " ")}</span>
                          {log.performedByName && <span className="text-muted-foreground font-normal"> by {log.performedByName}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</p>
                        {log.notes && (
                          <p className="text-sm text-foreground bg-muted p-2 rounded border inline-block">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canEdit && onEdit && (
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              {request.status === "needs_info" ? "Respond & Resubmit" : "Edit Request"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
