// import type { Doc } from '../../../../../../convex/_generated/dataModel';

import type { UserRole, SponsorTier, GoogleGroup } from "../../../../lib/types";

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

export type OfficerTeam = "Internal" | "Events" | "Projects";

export interface OfficerInvitation {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  position: string;
  status: "pending" | "accepted" | "declined" | "expired";
  invitedBy: string;
  invitedAt: number | { toDate: () => Date };
  acceptedAt?: number | { toDate: () => Date };
  declinedAt?: number | { toDate: () => Date };
  expiresAt: number | { toDate: () => Date };
  message?: string;
  acceptanceDeadline?: string;
  leaderName?: string;
  googleGroupAssigned?: boolean;
  googleGroup?: GoogleGroup;
  permissionsGranted?: boolean;
  onboardingEmailSent?: boolean;
  resentAt?: number | { toDate: () => Date };
  lastSentAt?: number | { toDate: () => Date };
  roleGranted?: boolean;
  roleGrantedAt?: number | { toDate: () => Date };
  userCreatedOrUpdated?: boolean;
}

export interface Link {
  _id: string;
  url: string;
  title: string;
  category: string;
  description?: string;
  iconUrl?: string;
  shortUrl?: string;
  publishDate?: number | { toDate: () => Date };
  expireDate?: number | { toDate: () => Date };
  createdAt: number | { toDate: () => Date };
  createdBy: string;
  lastModified?: number | { toDate: () => Date };
  lastModifiedBy?: string;
  order?: number;
}

