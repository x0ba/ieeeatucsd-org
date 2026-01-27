import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/types";

export interface NavigationItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface NavigationCategory {
  title: string;
  items: NavigationItem[];
  requiresRole?: UserRole[];
}

export const NAVIGATION_PATHS = {
  OVERVIEW: "/overview",
  EVENTS: "/events",
  REIMBURSEMENT: "/reimbursement",
  LEADERBOARD: "/leaderboard",
  LINKS: "/links",
  MANAGE_EVENTS: "/manage-events",
  MANAGE_REIMBURSEMENTS: "/manage-reimbursements",
  FUND_DEPOSITS: "/fund-deposits",
  FUND_REQUESTS: "/fund-requests",
  MANAGE_FUND_REQUESTS: "/manage-fund-requests",
  SLACK_ACCESS: "/slack-access",
  MANAGE_USERS: "/manage-users",
  MANAGE_SPONSORS: "/manage-sponsors",
  ONBOARDING: "/onboarding",
  CONSTITUTION_BUILDER: "/constitution-builder",
  RESUME_DATABASE: "/sponsors/resume-database",
  SPONSOR_INFORMATION: "/sponsors/information",
  SETTINGS: "/settings",
  SIGNOUT: "/signout",
  GET_STARTED: "/get-started",
  OFFICER_LEADERBOARD: "/officer-leaderboard",
} as const;

export type NavigationPath =
  (typeof NAVIGATION_PATHS)[keyof typeof NAVIGATION_PATHS];
