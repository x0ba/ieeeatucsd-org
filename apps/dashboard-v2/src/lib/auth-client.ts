import { createAuthClient } from "better-auth/react";

const siteURL = import.meta.env.VITE_CONVEX_SITE_URL || "";
export const authClient = createAuthClient({
  baseURL: siteURL ? `${siteURL}/api/auth` : "/api/auth",
});
