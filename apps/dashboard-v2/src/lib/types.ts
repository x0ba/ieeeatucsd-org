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

export type UserStatus = "active" | "inactive" | "suspended";

export type SignInMethod = "email" | "google" | "microsoft" | "github" | "facebook" | "twitter" | "apple" | "other";

export type Team = "Internal" | "Events" | "Projects";

export interface User {
  authUserId: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  username?: string;
  avatar?: string;
  pid?: string;
  memberId?: string;
  graduationYear?: number;
  major?: string;
  zelleInformation?: string;
  lastLogin?: number;
  notificationPreferences?: Record<string, any>;
  displayPreferences?: Record<string, any>;
  accessibilitySettings?: Record<string, any>;
  navigationLayout?: NavigationLayout;
  resume?: string;
  signedUp: boolean;
  requestedEmail: boolean;
  role: UserRole;
  position?: string;
  status: UserStatus;
  joinDate: number;
  eventsAttended?: number;
  points?: number;
  team?: Team;
  invitedBy?: string;
  inviteAccepted?: number;
  lastUpdated?: number;
  lastUpdatedBy?: string;
  signInMethod?: SignInMethod;
  hasIEEEEmail?: boolean;
  ieeeEmail?: string;
  ieeeEmailCreatedAt?: number;
  ieeeEmailStatus?: "active" | "disabled";
  sponsorTier?: SponsorTier;
  sponsorOrganization?: string;
  autoAssignedSponsor?: boolean;
  tosAcceptedAt?: number;
  tosVersion?: string;
  privacyPolicyAcceptedAt?: number;
  privacyPolicyVersion?: string;
}
