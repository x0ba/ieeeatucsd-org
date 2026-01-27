// import type { Doc } from "../../../../convex/_generated/dataModel";

// Placeholder types until Convex API is regenerated
export type ConstitutionSection = any;

export interface Constitution {
  id: string;
  title: string;
  organizationName: string;
  version: number;
  status: "draft" | "published" | "archived";
  createdAt: number;
  lastModified: number;
  lastModifiedBy: string;
  collaborators: string[];
  isTemplate?: boolean;
}

export interface ConstitutionAuditEntry {
  id: string;
  constitutionId: string;
  action: "create" | "update" | "delete";
  sectionId: string;
  beforeState: any;
  afterState: any;
  performedBy: string;
  timestamp: number;
  // Additional properties for audit log display
  changeDescription?: string;
  userName?: string;
  changeType?: "create" | "update" | "delete" | "reorder";
  beforeValue?: any;
  afterValue?: any;
  ipAddress?: string;
  userAgent?: string;
}
