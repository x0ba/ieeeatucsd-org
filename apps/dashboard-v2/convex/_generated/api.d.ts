/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as constitutions from "../constitutions.js";
import type * as dashboard from "../dashboard.js";
import type * as eventManagement from "../eventManagement.js";
import type * as events from "../events.js";
import type * as fundDeposits from "../fundDeposits.js";
import type * as fundRequests from "../fundRequests.js";
import type * as invitations from "../invitations.js";
import type * as leaderboard from "../leaderboard.js";
import type * as links from "../links.js";
import type * as onboarding from "../onboarding.js";
import type * as overview from "../overview.js";
import type * as reimbursements from "../reimbursements.js";
import type * as sponsorDomains from "../sponsorDomains.js";
import type * as storage from "../storage.js";
import type * as userManagement from "../userManagement.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  constitutions: typeof constitutions;
  dashboard: typeof dashboard;
  eventManagement: typeof eventManagement;
  events: typeof events;
  fundDeposits: typeof fundDeposits;
  fundRequests: typeof fundRequests;
  invitations: typeof invitations;
  leaderboard: typeof leaderboard;
  links: typeof links;
  onboarding: typeof onboarding;
  overview: typeof overview;
  reimbursements: typeof reimbursements;
  sponsorDomains: typeof sponsorDomains;
  storage: typeof storage;
  userManagement: typeof userManagement;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
