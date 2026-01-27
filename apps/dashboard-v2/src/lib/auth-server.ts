/**
 * Better Auth Server Endpoint
 * This file handles Better Auth server-side operations
 */

import { auth } from "./better-auth";

export function getServerAuth() {
  return auth;
}
