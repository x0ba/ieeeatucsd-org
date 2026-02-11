import type { QueryCtx, MutationCtx } from "./_generated/server";

export type UserRole =
  | "Member"
  | "General Officer"
  | "Executive Officer"
  | "Member at Large"
  | "Past Officer"
  | "Sponsor"
  | "Administrator";

export type SponsorTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

/**
 * Get the current user document from the database using their Logto ID.
 * Since Convex is self-hosted, ctx.auth is not available.
 * The logtoId is passed explicitly from the client.
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx, logtoId?: string) {
  if (!logtoId) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_logtoId", (q) => q.eq("logtoId", logtoId))
    .first();

  return user;
}

/**
 * Require the current user to exist in the database.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx, logtoId: string) {
  const user = await getCurrentUser(ctx, logtoId);
  if (!user) {
    throw new Error("User not found in database");
  }
  return user;
}

/**
 * Extract roles from the JWT custom claims.
 * The custom JWT adds `roles` as an array of role name strings.
 */
export function getRolesFromIdentity(identity: {
  roles?: string[];
  [key: string]: unknown;
}): UserRole[] {
  const roles = identity.roles;
  if (!roles || !Array.isArray(roles)) return ["Member"];
  return roles as UserRole[];
}

// --- Role check helpers ---

export function isAdmin(role: UserRole): boolean {
  return role === "Administrator";
}

export function isExecutiveOfficer(role: UserRole): boolean {
  return role === "Executive Officer";
}

export function isGeneralOfficer(role: UserRole): boolean {
  return role === "General Officer";
}

export function isSponsor(role: UserRole): boolean {
  return role === "Sponsor";
}

/**
 * Admin access: Administrators and Executive Officers
 */
export function hasAdminAccess(role: UserRole): boolean {
  return isAdmin(role) || isExecutiveOfficer(role);
}

/**
 * Officer access: Administrators, Executive Officers, and General Officers
 */
export function hasOfficerAccess(role: UserRole): boolean {
  return hasAdminAccess(role) || isGeneralOfficer(role);
}

/**
 * Check if user can access the resume database (Bronze sponsors cannot)
 */
export function canAccessResumeDatabase(
  role: UserRole,
  sponsorTier?: SponsorTier | null,
): boolean {
  if (isAdmin(role)) return true;
  if (isSponsor(role) && sponsorTier === "Bronze") return false;
  if (isSponsor(role)) return true;
  return false;
}

// --- Permission enforcement helpers for Convex functions ---

/**
 * Require the current user to have at least officer access.
 */
export async function requireOfficerAccess(ctx: QueryCtx | MutationCtx, logtoId: string) {
  const user = await requireCurrentUser(ctx, logtoId);
  if (!hasOfficerAccess(user.role)) {
    throw new Error("Insufficient permissions: officer access required");
  }
  return user;
}

/**
 * Require the current user to have admin access (Admin or Executive Officer).
 */
export async function requireAdminAccess(ctx: QueryCtx | MutationCtx, logtoId: string) {
  const user = await requireCurrentUser(ctx, logtoId);
  if (!hasAdminAccess(user.role)) {
    throw new Error("Insufficient permissions: admin access required");
  }
  return user;
}

/**
 * Require the current user to be an Administrator.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx, logtoId: string) {
  const user = await requireCurrentUser(ctx, logtoId);
  if (!isAdmin(user.role)) {
    throw new Error("Insufficient permissions: administrator access required");
  }
  return user;
}

/**
 * Require the current user to be a Sponsor.
 */
export async function requireSponsor(ctx: QueryCtx | MutationCtx, logtoId: string) {
  const user = await requireCurrentUser(ctx, logtoId);
  if (!isSponsor(user.role) && !isAdmin(user.role)) {
    throw new Error("Insufficient permissions: sponsor access required");
  }
  return user;
}

/**
 * Check if the current user owns a resource or has admin access.
 */
export async function requireOwnerOrAdmin(
  ctx: QueryCtx | MutationCtx,
  logtoId: string,
  ownerId: string,
) {
  const user = await requireCurrentUser(ctx, logtoId);
  if (user.logtoId !== ownerId && !hasAdminAccess(user.role)) {
    throw new Error("Insufficient permissions: not the owner or admin");
  }
  return user;
}
