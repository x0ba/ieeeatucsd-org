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

export const auth = betterAuth({
  appURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: ["http://localhost:4321", "https://localhost:4321", appURL],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 5, // 5 days
    updateAge: 60 * 60, // 1 hour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});

export type { Session, User } from "better-auth/types";
