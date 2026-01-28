import type {
  UserRole,
} from "../../../../../lib/types";

export interface InvitationFormData {
  name: string;
  email: string;
  role: UserRole;
  position: string;
  team?: string;
  acceptanceDeadline: string;
  message: string;
  leaderName: string;
}

export interface DirectOnboardingFormData {
  name: string;
  email: string;
  role: UserRole;
  position: string;
  team?: string;
  leaderName?: string;
  customMessage?: string;
  emailTemplate: string;
}

export interface OnboardingStats {
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
}

export interface OnboardingFilters {
  searchTerm: string;
  statusFilter: "all" | "pending" | "accepted" | "declined" | "expired";
  roleFilter: UserRole | "all";
}

export type OnboardingTab = "invitation" | "direct" | "pending";
