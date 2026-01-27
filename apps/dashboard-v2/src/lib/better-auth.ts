/**
 * Better Auth Server Configuration
 * Server-side authentication instance with Google OAuth and cookie-based sessions
 */

import { betterAuth } from "better-auth";

/**
 * Better Auth instance configured for IEEE at UCSD Dashboard
 * - Google OAuth provider
 * - Cookie-based session management
 * - Session caching for performance
 * - Integration points for Convex user synchronization
 */
export const auth = betterAuth({
  // Base URL for OAuth callbacks - must match your deployment URL
  baseURL: process.env.BETTER_AUTH_URL || "https://localhost:4321",

  // Secret for signing session cookies and tokens
  // Generate with: openssl rand -base64 32
  secret: process.env.BETTER_AUTH_SECRET || "",

  // Google OAuth provider configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },

  // Session management configuration
  session: {
    // Session expiration time (7 days in seconds)
    expiresIn: 60 * 60 * 24 * 7,

    // Update session freshness every 24 hours
    updateAge: 60 * 60 * 24,

    // Enable cookie-based session caching for performance
    // Stores session data in a signed cookie to reduce database calls
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },

    // Store session in database for persistence
    storeSessionInDatabase: true,
  },

  // User account configuration
  account: {
    // Link accounts by email when using OAuth
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  // Hooks intentionally omitted for now; Convex sync handled elsewhere
});

/**
 * Export auth instance type for use in API routes and components
 */
export type AuthInstance = typeof auth;

/**
 * Export Better Auth client type
 * This is the same as what you'd get from auth.$Infer
 */
export type AuthClient = AuthInstance["$Infer"];
