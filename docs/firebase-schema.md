# Firebase Schema Documentation

This document outlines the complete Firebase Firestore schema for the IEEE at UCSD project.

## Collections Overview

### Top-Level Collections

- `users` - User accounts and profiles
- `events` - Published events
- `event_requests` - Event requests awaiting approval
- `reimbursements` - Reimbursement requests
- `fundDeposits` - Fund deposit records
- `public_profiles` - Public user profiles for leaderboard
- `officerInvitations` - Officer invitation records
- `sponsorDomains` - Sponsor email domain mappings
- `links` - Shortened links
- `constitutions` - Constitution documents
- `notifications` - User notifications
- `googleGroupAssignments` - Google Group assignment records
- `directOnboardings` - Direct onboarding records
- `invites` - User invitation records
- `organizationSettings` - Organization-wide settings

## Collection Schemas

### users

```typescript
interface User {
  email: string;                    // Primary email
  emailVisibility: boolean;           // Email visibility settings
  verified: boolean;                 // Account verification status
  name: string;                      // Display name
  username?: string;                   // Optional username
  avatar?: string;                     // Profile picture URL
  pid?: string;                        // Profile ID
  memberId?: string;                    // IEEE member ID
  graduationYear?: number;              // Graduation year
  major?: string;                      // Academic major
  zelleInformation?: string;             // Zelle payment info
  lastLogin?: Timestamp;                // Last login timestamp
  notificationPreferences: Record<string, unknown>;
  displayPreferences: Record<string, unknown>;
  accessibilitySettings: Record<string, unknown>;
  navigationLayout?: "horizontal" | "sidebar";
  resume?: string;                      // Resume URL
  signedUp: boolean;                   // Sign-up completion
  requestedEmail: boolean;              // IEEE email request status
  role: UserRole;                       // User role (see below)
  position?: string;                     // Specific position title
  status: "active" | "inactive" | "suspended";
  joinDate: Timestamp;                   // When user joined
  eventsAttended?: number;               // Event attendance count
  points?: number;                       // Points earned
  team?: "Internal" | "Events" | "Projects"; // Officer team
  invitedBy?: string;                    // Who invited this user
  inviteAccepted?: Timestamp;              // When invitation was accepted
  lastUpdated?: Timestamp;               // Last profile update
  lastUpdatedBy?: string;                // Who last updated profile
  signInMethod?: "email" | "google" | "microsoft" | "github" | "facebook" | "twitter" | "apple" | "other";
  hasIEEEEmail?: boolean;                // IEEE email creation status
  ieeeEmail?: string;                    // IEEE email address
  ieeeEmailCreatedAt?: Timestamp;           // IEEE email creation date
  sponsorTier?: SponsorTier;              // Sponsor tier level
  sponsorOrganization?: string;             // Sponsor company name
  autoAssignedSponsor?: boolean;          // Auto-assignment via domain
}
```

### events

```typescript
interface Event {
  eventName: string;                     // Event name
  eventDescription: string;               // Event description
  eventCode: string;                     // Unique event code
  location: string;                      // Event location
  files: string[];                       // Associated file URLs
  pointsToReward: number;                // Points awarded for attendance
  startDate: Timestamp;                   // Event start time
  endDate: Timestamp;                     // Event end time
  published: boolean;                    // Publication status
  eventType: "social" | "technical" | "outreach" | "professional" | "projects" | "other";
  hasFood: boolean;                      // Food service availability
  createdFrom?: string;                  // Source event request ID
}
```

### event_requests

```typescript
interface EventRequest {
  name: string;                          // Event name
  location: string;                       // Event location
  startDateTime: Timestamp;                // Start time
  endDateTime: Timestamp;                  // End time
  eventDescription: string;                // Description
  flyersNeeded: boolean;                   // Flyer requirement
  flyerType: string[];                    // Types of flyers needed
  otherFlyerType?: string;               // Custom flyer type
  flyerAdvertisingStartDate?: Timestamp;       // When to start advertising
  flyerAdditionalRequests?: string;          // Additional flyer specs
  flyersCompleted: boolean;                // Flyer completion status
  photographyNeeded: boolean;               // Photography requirement
  requiredLogos: string[];                // Required logos
  otherLogos?: string[];                 // Additional logos
  advertisingFormat?: string;               // Ad format specifications
  willOrHaveRoomBooking: boolean;          // Room booking status
  expectedAttendance?: number;             // Expected attendance
  roomBookingFiles: string[];             // Room booking documents
  asFundingRequired: boolean;              // AS funding requirement
  foodDrinksBeingServed: boolean;         // Food service status
  invoices: Invoice[];                   // Associated invoices
  needsGraphics: boolean;                  // Graphics requirement
  needsAsFunding: boolean;                // AS funding requirement
  status: "draft" | "submitted" | "pending" | "completed" | "approved" | "declined" | "needs_review";
  declinedReason?: string;                  // Declination reason
  reviewFeedback?: string;                 // Review feedback
  requestedUser: string;                   // Requesting user ID
  auditLogs?: EventAuditLog[];            // Audit trail
  isDraft?: boolean;                      // Draft flag
  department?: string;                     // Event department
  needsGraphics?: boolean;                 // Graphics requirement
  graphicsCompleted?: boolean;             // Graphics completion
  graphicsFiles?: string[];                // Graphics files
  published?: boolean;                     // Publication status
}
```

### reimbursements

```typescript
interface Reimbursement {
  title: string;                          // Reimbursement title
  totalAmount: number;                    // Total amount
  paymentMethod: string;                   // Payment method
  status: "submitted" | "declined" | "approved" | "paid";
  submittedBy: string;                     // Submitting user ID
  additionalInfo: string;                  // Additional information
  department: "internal" | "external" | "projects" | "events" | "other";
  auditNotes?: { note: string; createdBy: string; timestamp: Timestamp }[];
  auditLogs?: { action: string; createdBy: string; timestamp: Timestamp }[];
  auditRequests?: {
    auditorId: string;
    requestedBy: string;
    requestedAt: Timestamp;
    status: "pending" | "completed" | "declined";
    auditResult?: "approved" | "needs_changes";
    auditNotes?: string;
    completedAt?: Timestamp;
  }[];
  requiresExecutiveOverride?: boolean;        // Executive override requirement
  receipts?: Receipt[];                   // Receipt records
  // Legacy fields for backward compatibility
  dateOfPurchase?: Timestamp;
  expenses?: LegacyExpense[];
}
```

### fundDeposits

```typescript
interface FundDeposit {
  id: string;                             // Deposit ID
  amount: number;                          // Deposit amount
  depositedBy: string;                     // Depositing user ID
  submittedAt: Timestamp;                   // Submission timestamp
  status: "pending" | "approved" | "declined";
  notes?: string;                           // Additional notes
  receiptFile?: string;                      // Receipt file URL
  approvedAt?: Timestamp;                    // Approval timestamp
  approvedBy?: string;                       // Approving user ID
  auditLogs?: { action: string; createdBy: string; timestamp: Timestamp }[];
}
```

### public_profiles

```typescript
interface PublicProfile {
  name: string;                          // Display name
  major: string;                          // Academic major
  points: number;                          // Points earned
  totalEventsAttended: number;              // Total events attended
}
```

### officerInvitations

```typescript
interface OfficerInvitation {
  id?: string;                            // Invitation ID
  name: string;                           // Invitee name
  email: string;                           // Invitee email
  role: UserRole;                          // Assigned role
  position: string;                        // Position title
  status: "pending" | "accepted" | "declined" | "expired";
  invitedBy: string;                       // Inviting user ID
  invitedAt: Timestamp;                    // Invitation timestamp
  acceptedAt?: Timestamp;                   // Acceptance timestamp
  declinedAt?: Timestamp;                   // Declination timestamp
  expiresAt: Timestamp;                     // Expiration timestamp
  message?: string;                         // Custom message
  acceptanceDeadline?: string;                // Human-readable deadline
  leaderName?: string;                      // Team lead name
  googleGroupAssigned?: boolean;             // Google Group assignment status
  googleGroup?: GoogleGroup;                 // Assigned Google Group
  permissionsGranted?: boolean;               // Permission grant status
  onboardingEmailSent?: boolean;             // Onboarding email status
  resentAt?: Timestamp;                     // Resend timestamp
  lastSentAt?: Timestamp;                   // Last send timestamp
  roleGranted?: boolean;                    // Role grant status
  roleGrantedAt?: Timestamp;                 // Role grant timestamp
  userCreatedOrUpdated?: boolean;            // User creation/update status
}
```

### sponsorDomains

```typescript
interface SponsorDomain {
  domain: string;                          // Email domain
  organizationName: string;                 // Organization name
  sponsorTier: SponsorTier;                 // Sponsor tier
  createdAt: Timestamp;                     // Creation timestamp
  createdBy: string;                       // Creating user ID
  lastModified?: Timestamp;                  // Last modification
  lastModifiedBy?: string;                  // Last modifying user ID
}
```

### links

```typescript
interface Link {
  id: string;                              // Link ID
  url: string;                              // Destination URL
  title: string;                            // Display title
  category: string;                          // Link category
  description?: string;                       // Short description
  iconUrl?: string;                          // Icon URL
  shortUrl?: string;                          // Short URL slug
  publishDate?: Timestamp;                     // Publication date
  expireDate?: Timestamp;                     // Expiration date
  createdAt: Timestamp;                       // Creation timestamp
  createdBy: string;                          // Creating user ID
  lastModified?: Timestamp;                    // Last modification
  lastModifiedBy?: string;                    // Last modifying user ID
  order?: number;                            // Manual ordering
}
```

### constitutions

```typescript
interface Constitution {
  id: string;                              // Constitution ID
  title: string;                            // Constitution title
  organizationName: string;                   // Organization name
  sections: ConstitutionSection[];             // Constitution sections
  version: number;                           // Version number
  status: "draft" | "published" | "archived";
  createdAt: Timestamp;                       // Creation timestamp
  lastModified: Timestamp;                    // Last modification
  lastModifiedBy: string;                     // Last modifying user ID
  collaborators: string[];                    // Collaborating user IDs
  isTemplate?: boolean;                       // Template flag
}
```

### notifications

```typescript
interface Notification {
  userId: string;                           // Target user ID
  type: string;                              // Notification type
  title: string;                             // Notification title
  message: string;                           // Notification message
  data?: Record<string, any>;                // Additional data
  read: boolean;                             // Read status
  createdAt: Timestamp;                       // Creation timestamp
  expiresAt?: Timestamp;                      // Expiration timestamp
}
```

## Subcollections

### events/{eventId}/attendees

```typescript
interface Attendee {
  userId: string;                           // Attendee user ID
  timeCheckedIn: Timestamp;                  // Check-in timestamp
  food: string;                             // Food preference
  pointsEarned: number;                      // Points earned
}
```

### constitutions/{constitutionId}/sections

```typescript
interface ConstitutionSection {
  id: string;                              // Section ID
  type: "preamble" | "article" | "section" | "subsection" | "amendment";
  title: string;                            // Section title
  content: string;                           // Section content
  order: number;                            // Section order
  parentId?: string;                         // Parent section ID
  articleNumber?: number;                     // Article number
  sectionNumber?: number;                     // Section number
  subsectionLetter?: string;                  // Subsection letter
  amendmentNumber?: number;                   // Amendment number
  createdAt: Timestamp;                       // Creation timestamp
  lastModified: Timestamp;                    // Last modification
  lastModifiedBy: string;                     // Last modifying user ID
}
```

### constitutions/{constitutionId}/auditLog

```typescript
interface ConstitutionAuditEntry {
  id: string;                              // Entry ID
  constitutionId: string;                   // Constitution ID
  sectionId?: string;                       // Section ID (null for constitution-level)
  changeType: "create" | "update" | "delete" | "reorder";
  changeDescription: string;                  // Change description
  beforeValue?: {                            // Previous values
    title?: string;
    content?: string;
    type?: ConstitutionSection["type"];
    order?: number;
    parentId?: string;
    articleNumber?: number;
    sectionNumber?: number;
    subsectionLetter?: string;
    amendmentNumber?: number;
  };
  afterValue?: {                             // New values
    title?: string;
    content?: string;
    type?: ConstitutionSection["type"];
    order?: number;
    parentId?: string;
    articleNumber?: number;
    sectionNumber?: number;
    subsectionLetter?: string;
    amendmentNumber?: number;
  };
  userId: string;                           // Modifying user ID
  userName: string;                         // Modifying user name
  timestamp: Timestamp;                       // Modification timestamp
  ipAddress?: string;                        // IP address
  userAgent?: string;                         // User agent
}
```

## Type Definitions

### UserRole

```typescript
type UserRole =
  | "Member"
  | "General Officer"
  | "Executive Officer"
  | "Member at Large"
  | "Past Officer"
  | "Sponsor"
  | "Administrator";
```

### SponsorTier

```typescript
type SponsorTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
```

### OfficerTeam

```typescript
type OfficerTeam = "Internal" | "Events" | "Projects";
```

### GoogleGroup

```typescript
type GoogleGroup =
  | "executive-officers@ieeeatucsd.org"
  | "general-officers@ieeeatucsd.org"
  | "past-officers@ieeeatucsd.org";
```

## Indexes

The following composite indexes are defined in `firestore.indexes.json`:

1. **events collection**
   - `published` + `startDate` (ASC)
   - `published` + `startDate` (DESC)

2. **fundDeposits collection**
   - `depositedBy` + `submittedAt` (DESC)

3. **notifications collection**
   - `userId` + `createdAt` (DESC)

4. **reimbursements collection**
   - `submittedBy` + `submittedAt` (DESC)

## Security Considerations

1. **Authentication**: All write operations require Firebase Auth
2. **Authorization**: Role-based access control implemented in security rules
3. **Data Validation**: Server-side validation for all inputs
4. **Audit Trails**: Comprehensive audit logging for sensitive operations
5. **File Upload**: MIME type validation and size limits enforced

## Migration Notes

- Legacy fields maintained for backward compatibility
- New multi-receipt structure replaces single receipt approach
- Invoice structure supports both itemized and legacy formats
- Event requests support both draft and full submission workflows