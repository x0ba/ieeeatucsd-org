import type { Timestamp } from "firebase/firestore";

// Fund request status lifecycle
export type FundRequestStatus =
    | "draft"
    | "submitted"
    | "needs_info"
    | "approved"
    | "denied"
    | "completed";

// Categories for fund requests
export type FundRequestCategory =
    | "event"
    | "travel"
    | "equipment"
    | "software"
    | "other";

// Funding sources
export type FundingSource = "department" | "ieee";

// Vendor link with URL
export interface VendorLink {
    id: string;
    url: string;
    label?: string;
}

// Attachment file reference
export interface FundRequestAttachment {
    id: string;
    url: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: Timestamp;
}

// Audit log entry for tracking changes
export interface FundRequestAuditLog {
    id: string;
    action:
    | "created"
    | "updated"
    | "submitted"
    | "approved"
    | "denied"
    | "info_requested"
    | "info_provided"
    | "completed";
    performedBy: string;
    performedByName?: string;
    timestamp: Timestamp;
    notes?: string;
    previousStatus?: FundRequestStatus;
    newStatus?: FundRequestStatus;
}

// Main fund request interface
export interface FundRequest {
    id: string;

    // Basic info
    title: string;
    purpose: string;
    category: FundRequestCategory;

    // Budget
    amount: number;
    vendorLinks: VendorLink[];

    // Attachments
    attachments: FundRequestAttachment[];

    // Status and workflow
    status: FundRequestStatus;
    fundingSourcePreference?: FundingSource;
    selectedFundingSource?: FundingSource;

    // Submission info
    submittedBy: string;
    submittedByName?: string;
    submittedByEmail?: string;
    submittedAt?: Timestamp;

    // Review info (Executive Officer)
    reviewedBy?: string;
    reviewedByName?: string;
    reviewedAt?: Timestamp;
    reviewNotes?: string;

    // Info request/response
    infoRequestNotes?: string;
    infoResponseNotes?: string;

    // Completion info
    completedAt?: Timestamp;
    completedBy?: string;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;

    // Audit trail
    auditLogs: FundRequestAuditLog[];
}

// Form data for creating/editing fund requests
export interface FundRequestFormData {
    title: string;
    purpose: string;
    category: FundRequestCategory;
    amount: number;
    vendorLinks: VendorLink[];
    attachmentFiles: File[];
    existingAttachments: FundRequestAttachment[];
    fundingSourcePreference?: FundingSource;
    infoResponseNotes?: string;
}

// Status display helpers
export const STATUS_LABELS: Record<FundRequestStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    needs_info: "Needs Info",
    approved: "Approved",
    denied: "Denied",
    completed: "Completed",
};

export const STATUS_COLORS: Record<FundRequestStatus, "default" | "primary" | "secondary" | "success" | "warning" | "danger"> = {
    draft: "default",
    submitted: "primary",
    needs_info: "warning",
    approved: "success",
    denied: "danger",
    completed: "secondary",
};

export const CATEGORY_LABELS: Record<FundRequestCategory, string> = {
    event: "Event",
    travel: "Travel",
    equipment: "Equipment",
    software: "Software",
    other: "Other",
};

export const FUNDING_SOURCE_LABELS: Record<FundingSource, string> = {
    department: "Department Funds",
    ieee: "IEEE Funds",
};
