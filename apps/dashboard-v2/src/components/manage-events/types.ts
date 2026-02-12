import type { Id } from "@convex/_generated/dataModel";

export type EventStatus = "draft" | "pending" | "approved" | "declined" | "published";

export interface Invoice {
  _id: string;
  amount: number;
  vendor: string;
  description: string;
  fileUrl?: string;
}

export interface EventFile {
  _id: string;
  name: string;
  url: string;
  isPublic: boolean;
  uploadedAt: number;
  uploadedBy: string;
}

export interface EventRequest {
  _id: Id<"eventRequests">;
  _creationTime: number;
  eventName: string;
  eventDescription: string;
  eventType: string;
  department?: string;
  location: string;
  startDate: number;
  endDate: number;
  capacity?: number;
  eventCode: string;
  hasFood: boolean;
  needsFlyers: boolean;
  needsGraphics: boolean;
  needsASFunding: boolean;
  estimatedAttendance: number;
  status: EventStatus;
  files: string[];
  invoices: Invoice[];
  createdBy: string;
  _updatedAt?: number;
}

export interface EventStats {
  totalEvents: number;
  publishedEvents: number;
  totalAttendees: number;
}

export interface EventFilters {
  search: string;
  startDate?: number;
  endDate?: number;
  status?: EventStatus | "all";
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface WizardStep {
  id: number;
  title: string;
  description: string;
}

export interface EventFormData {
  eventName: string;
  eventDescription: string;
  eventType: string;
  department?: string;
  location: string;
  startDate: number;
  endDate: number;
  capacity?: number;
  eventCode: string;
  hasFood: boolean;
  needsFlyers: boolean;
  needsGraphics: boolean;
  needsASFunding: boolean;
  estimatedAttendance: number;
  files: string[];
  invoices: Invoice[];
}

export interface CalendarEvent {
  _id: string;
  eventName: string;
  startDate: number;
  endDate: number;
  status: EventStatus;
}
