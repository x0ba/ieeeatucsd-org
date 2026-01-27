import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Define schema matching Firebase structure
export default defineSchema({
  // Users collection - matches Firebase users collection
  users: defineTable({
    authUserId: v.string(), // Better Auth user ID (UUID)
    email: v.string(),
    emailVisibility: v.boolean(),
    verified: v.boolean(),
    name: v.string(),
    username: v.optional(v.string()),
    avatar: v.optional(v.string()),
    pid: v.optional(v.string()),
    memberId: v.optional(v.string()),
    graduationYear: v.optional(v.number()),
    major: v.optional(v.string()),
    zelleInformation: v.optional(v.string()),
    lastLogin: v.optional(v.number()), // Timestamp as number (milliseconds since epoch)
    notificationPreferences: v.optional(v.record(v.string(), v.any())),
    displayPreferences: v.optional(v.record(v.string(), v.any())),
    accessibilitySettings: v.optional(v.record(v.string(), v.any())),
    navigationLayout: v.optional(
      v.union(v.literal("horizontal"), v.literal("sidebar")),
    ),
    resume: v.optional(v.string()),
    signedUp: v.boolean(),
    requestedEmail: v.boolean(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("suspended"),
    ),
    joinDate: v.number(), // Timestamp
    eventsAttended: v.optional(v.number()),
    points: v.optional(v.number()),
    team: v.optional(
      v.union(
        v.literal("Internal"),
        v.literal("Events"),
        v.literal("Projects"),
      ),
    ),
    invitedBy: v.optional(v.string()), // Better Auth user ID as string
    inviteAccepted: v.optional(v.number()), // Timestamp
    lastUpdated: v.optional(v.number()), // Timestamp
    lastUpdatedBy: v.optional(v.string()), // Better Auth user ID
    signInMethod: v.optional(
      v.union(
        v.literal("email"),
        v.literal("google"),
        v.literal("microsoft"),
        v.literal("github"),
        v.literal("facebook"),
        v.literal("twitter"),
        v.literal("apple"),
        v.literal("other"),
      ),
    ),
    hasIEEEEmail: v.optional(v.boolean()),
    ieeeEmail: v.optional(v.string()),
    ieeeEmailCreatedAt: v.optional(v.number()), // Timestamp
    ieeeEmailStatus: v.optional(
      v.union(v.literal("active"), v.literal("disabled")),
    ),
    sponsorTier: v.optional(
      v.union(
        v.literal("Bronze"),
        v.literal("Silver"),
        v.literal("Gold"),
        v.literal("Platinum"),
        v.literal("Diamond"),
      ),
    ),
    sponsorOrganization: v.optional(v.string()),
    autoAssignedSponsor: v.optional(v.boolean()),
    // TOS and Privacy Policy acceptance
    tosAcceptedAt: v.optional(v.number()), // Timestamp
    tosVersion: v.optional(v.string()),
    privacyPolicyAcceptedAt: v.optional(v.number()), // Timestamp
    privacyPolicyVersion: v.optional(v.string()),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_invitedBy", ["invitedBy"]),

  // Officer Invitations collection
  officerInvitations: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("expired"),
    ),
    invitedBy: v.string(),
    invitedAt: v.number(), // Timestamp
    acceptedAt: v.optional(v.number()), // Timestamp
    declinedAt: v.optional(v.number()), // Timestamp
    expiresAt: v.number(), // Timestamp
    message: v.optional(v.string()),
    acceptanceDeadline: v.optional(v.string()),
    leaderName: v.optional(v.string()),
    googleGroupAssigned: v.optional(v.boolean()),
    googleGroup: v.optional(
      v.union(
        v.literal("executive-officers@ieeeatucsd.org"),
        v.literal("general-officers@ieeeatucsd.org"),
        v.literal("past-officers@ieeeatucsd.org"),
      ),
    ),
    permissionsGranted: v.optional(v.boolean()),
    onboardingEmailSent: v.optional(v.boolean()),
    resentAt: v.optional(v.number()), // Timestamp
    lastSentAt: v.optional(v.number()), // Timestamp
    roleGranted: v.optional(v.boolean()),
    roleGrantedAt: v.optional(v.number()), // Timestamp
    userCreatedOrUpdated: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_invitedBy", ["invitedBy", "status"]),

  // Sponsor Domains collection
  sponsorDomains: defineTable({
    domain: v.string(), // Email domain (e.g., "@tsmc.com", "@qualcomm.com")
    organizationName: v.string(),
    sponsorTier: v.union(
      v.literal("Bronze"),
      v.literal("Silver"),
      v.literal("Gold"),
      v.literal("Platinum"),
      v.literal("Diamond"),
    ),
    createdAt: v.number(), // Timestamp
    createdBy: v.string(),
    lastModified: v.optional(v.number()), // Timestamp
    lastModifiedBy: v.optional(v.string()),
  })
    .index("by_domain", ["domain"])
    .index("by_createdBy", ["createdBy"]),

  // Invites collection (user invitations)
  invites: defineTable({
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(), // Timestamp
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
    ),
    acceptedBy: v.optional(v.string()),
    acceptedAt: v.optional(v.number()), // Timestamp
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy"]),

  // Notifications collection
  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.record(v.string(), v.any())),
    read: v.boolean(),
    createdAt: v.number(), // Timestamp
    expiresAt: v.optional(v.number()), // Timestamp
  })
    .index("by_userId", ["userId", "createdAt"])
    .index("by_userId_read", ["userId", "read", "createdAt"]),

  // Google Group Assignments collection
  googleGroupAssignments: defineTable({
    userId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    googleGroup: v.union(
      v.literal("executive-officers@ieeeatucsd.org"),
      v.literal("general-officers@ieeeatucsd.org"),
      v.literal("past-officers@ieeeatucsd.org"),
    ),
    assignedAt: v.number(), // Timestamp
    assignedBy: v.string(),
    success: v.boolean(),
    error: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_googleGroup", ["googleGroup"]),

  // Direct Onboardings collection
  directOnboardings: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("Member"),
      v.literal("General Officer"),
      v.literal("Executive Officer"),
      v.literal("Member at Large"),
      v.literal("Past Officer"),
      v.literal("Sponsor"),
      v.literal("Administrator"),
    ),
    position: v.string(),
    leaderName: v.optional(v.string()),
    customMessage: v.optional(v.string()),
    emailTemplate: v.optional(v.string()),
    onboardedBy: v.string(),
    userId: v.string(), // Reference to the created user
    createdAt: v.number(), // Timestamp
  })
    .index("by_userId", ["userId"])
    .index("by_onboardedBy", ["onboardedBy", "createdAt"]),

  // Events collection
  events: defineTable({
    eventName: v.string(),
    eventDescription: v.string(),
    eventCode: v.string(),
    location: v.string(),
    files: v.array(v.string()),
    pointsToReward: v.number(),
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp
    published: v.boolean(),
    eventType: v.union(
      v.literal("social"),
      v.literal("technical"),
      v.literal("outreach"),
      v.literal("professional"),
      v.literal("projects"),
      v.literal("other"),
    ),
    hasFood: v.boolean(),
    createdFrom: v.optional(v.string()),
  })
    .index("by_published", ["published", "startDate"])
    .index("by_eventCode", ["eventCode"]),

  // Event attendees collection (replaces Firestore subcollection events/{eventId}/attendees)
  eventAttendees: defineTable({
    eventId: v.id("events"),
    authUserId: v.string(),
    checkedInAt: v.number(), // Timestamp
    pointsAwarded: v.optional(v.number()),
  })
    .index("by_authUserId", ["authUserId", "checkedInAt"])
    .index("by_eventId", ["eventId", "checkedInAt"]),

  // Event Requests collection
  eventRequests: defineTable({
    name: v.string(),
    location: v.string(),
    startDateTime: v.number(), // Timestamp
    endDateTime: v.number(), // Timestamp
    eventDescription: v.string(),
    flyersNeeded: v.boolean(),
    flyerType: v.array(v.string()),
    otherFlyerType: v.optional(v.string()),
    flyerAdvertisingStartDate: v.optional(v.number()), // Timestamp
    flyerAdditionalRequests: v.optional(v.string()),
    flyersCompleted: v.boolean(),
    photographyNeeded: v.boolean(),
    requiredLogos: v.array(v.string()),
    otherLogos: v.optional(v.array(v.string())),
    advertisingFormat: v.optional(v.string()),
    willOrHaveRoomBooking: v.boolean(),
    expectedAttendance: v.optional(v.number()),
    roomBookingFiles: v.array(v.string()),
    asFundingRequired: v.boolean(),
    foodDrinksBeingServed: v.boolean(),
    needsGraphics: v.boolean(),
    needsAsFunding: v.boolean(),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("pending"),
      v.literal("completed"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("needs_review"),
    ),
    declinedReason: v.optional(v.string()),
    reviewFeedback: v.optional(v.string()),
    requestedUser: v.string(),
    isDraft: v.optional(v.boolean()),
    department: v.optional(v.string()),
    graphicsCompleted: v.optional(v.boolean()),
    graphicsFiles: v.optional(v.array(v.string())),
    published: v.optional(v.boolean()),
  })
    .index("by_requestedUser", ["requestedUser", "status"])
    .index("by_status", ["status"]),

  // Reimbursements collection
  reimbursements: defineTable({
    title: v.string(),
    totalAmount: v.number(),
    paymentMethod: v.string(),
    status: v.union(
      v.literal("submitted"),
      v.literal("declined"),
      v.literal("approved"),
      v.literal("paid"),
    ),
    submittedBy: v.string(),
    additionalInfo: v.string(),
    department: v.union(
      v.literal("internal"),
      v.literal("external"),
      v.literal("projects"),
      v.literal("events"),
      v.literal("other"),
    ),
    auditNotes: v.optional(
      v.array(
        v.object({
          note: v.string(),
          createdBy: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
    auditLogs: v.optional(
      v.array(
        v.object({
          action: v.string(),
          createdBy: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
    auditRequests: v.optional(
      v.array(
        v.object({
          auditorId: v.string(),
          requestedBy: v.string(),
          requestedAt: v.number(),
          status: v.union(
            v.literal("pending"),
            v.literal("completed"),
            v.literal("declined"),
          ),
          auditResult: v.optional(
            v.union(v.literal("approved"), v.literal("needs_changes")),
          ),
          auditNotes: v.optional(v.string()),
          completedAt: v.optional(v.number()),
        }),
      ),
    ),
    requiresExecutiveOverride: v.optional(v.boolean()),
    paymentDetails: v.optional(
      v.object({
        confirmationNumber: v.string(),
        paymentDate: v.number(),
        amountPaid: v.number(),
        proofFileUrl: v.optional(v.string()),
        memo: v.optional(v.string()),
      }),
    ),
    receipts: v.optional(
      v.array(
        v.object({
          id: v.string(),
          vendorName: v.string(),
          location: v.string(),
          dateOfPurchase: v.number(),
          lineItems: v.array(
            v.object({
              id: v.string(),
              description: v.string(),
              category: v.string(),
              amount: v.number(),
            }),
          ),
          receiptFile: v.optional(v.string()),
          notes: v.optional(v.string()),
          subtotal: v.number(),
          tax: v.optional(v.number()),
          tip: v.optional(v.number()),
          shipping: v.optional(v.number()),
          total: v.number(),
        }),
      ),
    ),
  })
    .index("by_submittedBy", ["submittedBy"])
    .index("by_status", ["status"]),

  // Fund Deposits collection
  fundDeposits: defineTable({
    title: v.string(),
    amount: v.number(),
    depositDate: v.string(),
    depositedBy: v.string(),
    depositedByName: v.optional(v.string()),
    depositedByEmail: v.optional(v.string()),
    depositMethod: v.union(
      v.literal("cash"),
      v.literal("check"),
      v.literal("bank_transfer"),
      v.literal("other"),
    ),
    otherDepositMethod: v.optional(v.string()),
    purpose: v.string(),
    description: v.optional(v.string()),
    submittedAt: v.number(), // Timestamp
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
    ),
    verifiedBy: v.optional(v.string()),
    verifiedByName: v.optional(v.string()),
    verifiedAt: v.optional(v.number()), // Timestamp
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    receiptFiles: v.optional(v.array(v.string())),
    referenceNumber: v.optional(v.string()),
    editedAt: v.optional(v.number()), // Timestamp
    editedBy: v.optional(v.string()),
    editedByName: v.optional(v.string()),
    isIeeeDeposit: v.optional(v.boolean()),
    ieeeDepositSource: v.optional(
      v.union(
        v.literal("upp"),
        v.literal("section"),
        v.literal("region"),
        v.literal("global"),
        v.literal("society"),
        v.literal("other"),
      ),
    ),
    needsBankTransfer: v.optional(v.boolean()),
    bankTransferInstructions: v.optional(v.string()),
    bankTransferFiles: v.optional(v.array(v.string())),
    auditLogs: v.optional(
      v.array(
        v.object({
          action: v.string(),
          createdBy: v.string(),
          createdByName: v.optional(v.string()),
          timestamp: v.number(),
          note: v.optional(v.string()),
          previousData: v.optional(v.any()),
          newData: v.optional(v.any()),
        }),
      ),
    ),
  })
    .index("by_depositedBy", ["depositedBy", "submittedAt"])
    .index("by_status", ["status"])
    .index("by_submittedAt", ["submittedAt"])
    .index("by_user", ["depositedBy"]),

  // Public Profiles collection
  publicProfiles: defineTable({
    userId: v.string(),
    name: v.string(),
    major: v.string(),
    points: v.number(),
    totalEventsAttended: v.number(),
  })
    .index("by_points", ["points"])
    .index("by_userId", ["userId"]),

  // Links collection
  links: defineTable({
    url: v.string(),
    title: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    shortUrl: v.optional(v.string()),
    publishDate: v.optional(v.number()), // Timestamp
    expireDate: v.optional(v.number()), // Timestamp
    createdAt: v.number(), // Timestamp
    createdBy: v.string(),
    lastModified: v.optional(v.number()), // Timestamp
    lastModifiedBy: v.optional(v.string()),
    order: v.optional(v.number()),
  })
    .index("by_category", ["category"])
    .index("by_shortUrl", ["shortUrl"]),

  // Constitutions collection
  constitutions: defineTable({
    id: v.string(), // Custom ID (e.g., "ieee-ucsd-constitution")
    title: v.string(),
    organizationName: v.string(),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    createdAt: v.number(), // Timestamp
    lastModified: v.number(), // Timestamp
    lastModifiedBy: v.string(),
    collaborators: v.array(v.string()),
    isTemplate: v.optional(v.boolean()),
  })
    .index("by_customId", ["id"])
    .index("by_status", ["status"])
    .index("by_lastModified", ["lastModified"]),

  // Constitution Sections collection
  sections: defineTable({
    constitutionId: v.string(),
    type: v.union(v.literal("article"), v.literal("section"), v.literal("amendment")),
    title: v.string(),
    content: v.string(),
    order: v.number(),
    parentId: v.optional(v.string()),
    articleNumber: v.optional(v.number()),
    sectionNumber: v.optional(v.number()),
    amendmentNumber: v.optional(v.number()),
    createdAt: v.number(), // Timestamp
    lastModified: v.number(), // Timestamp
    lastModifiedBy: v.string(),
  })
    .index("by_constitutionId", ["constitutionId"])
    .index("by_order", ["order"]),

  // Constitution Audit Logs collection
  constitutionAuditLogs: defineTable({
    constitutionId: v.string(),
    action: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    sectionId: v.string(),
    beforeState: v.optional(v.any()),
    afterState: v.optional(v.any()),
    performedBy: v.string(),
    timestamp: v.number(), // Timestamp
  })
    .index("by_constitutionId", ["constitutionId"])
    .index("by_timestamp", ["timestamp"]),

  // Fund Requests collection
  fundRequests: defineTable({
    title: v.string(),
    purpose: v.string(),
    category: v.union(
      v.literal("event"),
      v.literal("travel"),
      v.literal("equipment"),
      v.literal("software"),
      v.literal("other"),
    ),
    department: v.optional(
      v.union(
        v.literal("events"),
        v.literal("projects"),
        v.literal("internal"),
        v.literal("other"),
      ),
    ),
    amount: v.number(),
    vendorLinks: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        itemName: v.optional(v.string()),
        quantity: v.optional(v.number()),
        label: v.optional(v.string()),
      }),
    ),
    attachments: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        name: v.string(),
        size: v.number(),
        type: v.string(),
        uploadedAt: v.number(),
      }),
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("needs_info"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("completed"),
    ),
    fundingSourcePreference: v.optional(v.union(v.literal("department"), v.literal("ieee"))),
    selectedFundingSource: v.optional(v.union(v.literal("department"), v.literal("ieee"))),
    submittedBy: v.string(),
    submittedByName: v.optional(v.string()),
    submittedByEmail: v.optional(v.string()),
    submittedAt: v.optional(v.number()), // Timestamp
    reviewedBy: v.optional(v.string()),
    reviewedByName: v.optional(v.string()),
    reviewedAt: v.optional(v.number()), // Timestamp
    reviewNotes: v.optional(v.string()),
    infoRequestNotes: v.optional(v.string()),
    infoResponseNotes: v.optional(v.string()),
    completedAt: v.optional(v.number()), // Timestamp
    completedBy: v.optional(v.string()),
    createdAt: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
    auditLogs: v.array(
      v.object({
        id: v.string(),
        action: v.union(
          v.literal("created"),
          v.literal("updated"),
          v.literal("submitted"),
          v.literal("approved"),
          v.literal("denied"),
          v.literal("info_requested"),
          v.literal("info_provided"),
          v.literal("completed"),
        ),
        performedBy: v.string(),
        performedByName: v.optional(v.string()),
        timestamp: v.number(),
        notes: v.optional(v.string()),
        previousStatus: v.optional(v.string()),
        newStatus: v.optional(v.string()),
      }),
    ),
  })
    .index("by_submittedBy", ["submittedBy", "status"])
    .index("by_status", ["status"])
    .index("by_department", ["department", "status"])
    .index("by_createdAt", ["createdAt"]),

  // Budget Config collection
  budgetConfig: defineTable({
    department: v.union(
      v.literal("events"),
      v.literal("projects"),
      v.literal("internal"),
      v.literal("other"),
    ),
    totalBudget: v.number(),
    startDate: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
    updatedBy: v.string(),
    updatedByName: v.optional(v.string()),
  })
    .index("by_department", ["department"]),

  // Budget Adjustments collection
  budgetAdjustments: defineTable({
    department: v.union(
      v.literal("events"),
      v.literal("projects"),
      v.literal("internal"),
      v.literal("other"),
    ),
    amount: v.number(),
    description: v.string(),
    createdAt: v.number(), // Timestamp
    createdBy: v.string(),
    createdByName: v.optional(v.string()),
  })
    .index("by_department", ["department", "createdAt"]),
});
