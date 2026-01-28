/**
 * Better Auth Configuration
 * Server-side authentication instance for Astro
 */

import { config } from "dotenv";
import { betterAuth } from "better-auth";

config();

const appURL =
  process.env.CONVEX_SITE_URL ||
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_CONVEX_SITE_URL) ||
  "http://localhost:4321";

/**
 * Better Auth instance configured for IEEE at UCSD Dashboard
 * - Google OAuth provider
 * - Cookie-based session management
 * - Session caching for performance
 * - Integration points for Convex user synchronization
 */
export const auth = betterAuth({
  // Base URL for OAuth callbacks - must match your deployment URL
  baseURL: process.env.BETTER_AUTH_URL || appURL,

  // Secret for signing session cookies and tokens
  // Generate with: openssl rand -base64 32
  secret: process.env.BETTER_AUTH_SECRET!,

  // Trusted origins for CORS and redirects
  trustedOrigins: ["http://localhost:4321", "https://localhost:4321", appURL],

  // Google OAuth provider configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: true,
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
 * Get the current session from the request
 * This function can be used server-side in Astro pages and API routes
 * 
 * @param request - Optional Request object to extract session from
 * @returns The session object or null if not authenticated
 */
export async function getSession(request?: Request) {
  if (!request) {
    // If no request provided, return null (session must be extracted from request)
    return null;
  }

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Export auth instance type for use in API routes and components
 */
export type AuthInstance = typeof auth;

/**
 * Export Better Auth client type
 * This is the same as what you'd get from auth.$Infer
 */
export type AuthClient = AuthInstance["$Infer"];

export default getSession;

/**
 * Export Better Auth types
 */
export type { Session, User } from "better-auth/types";
