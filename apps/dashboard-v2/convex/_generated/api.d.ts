/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as constitutions from "../constitutions.js";
import type * as eventRequests from "../eventRequests.js";
import type * as events from "../events.js";
import type * as fundDeposits from "../fundDeposits.js";
import type * as fundRequests from "../fundRequests.js";
import type * as links from "../links.js";
import type * as officerInvitations from "../officerInvitations.js";
import type * as permissions from "../permissions.js";
import type * as reimbursements from "../reimbursements.js";
import type * as sponsorDomains from "../sponsorDomains.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  constitutions: typeof constitutions;
  eventRequests: typeof eventRequests;
  events: typeof events;
  fundDeposits: typeof fundDeposits;
  fundRequests: typeof fundRequests;
  links: typeof links;
  officerInvitations: typeof officerInvitations;
  permissions: typeof permissions;
  reimbursements: typeof reimbursements;
  sponsorDomains: typeof sponsorDomains;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
