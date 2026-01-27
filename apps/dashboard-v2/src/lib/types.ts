export type UserRole =
  | "Member"
  | "General Officer"
  | "Executive Officer"
  | "Member at Large"
  | "Past Officer"
  | "Sponsor"
  | "Administrator";

export type SponsorTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export type GoogleGroup =
  | "executive-officers@ieeeatucsd.org"
  | "general-officers@ieeeatucsd.org"
  | "past-officers@ieeeatucsd.org";

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";

export type OnboardingTab = "invitation" | "direct" | "pending";

export interface InvitationFormData {
  name: string;
  email: string;
  role: UserRole;
  position: string;
  leaderName?: string;
  message?: string;
  acceptanceDeadline?: string;
}

export interface DirectOnboardingFormData {
  name: string;
  email: string;
  role: UserRole;
  position: string;
  leaderName?: string;
  customMessage?: string;
  emailTemplate?: string;
}

export interface OnboardingStats {
  totalInvitations: number;
  pendingInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
}

export type NavigationLayout = "sidebar" | "horizontal";
