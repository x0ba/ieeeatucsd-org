import type { Doc } from "../../../../../../convex/_generated/dataModel";

export type ConstitutionSection = Doc<"sections">;

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
  constitutionId: string;
  action: "create" | "update" | "delete";
  sectionId: string;
  beforeState: any;
  afterState: any;
  performedBy: string;
  timestamp: number;
}
