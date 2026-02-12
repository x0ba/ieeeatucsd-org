import type { Id } from "@convex/_generated/dataModel";

export type EventStatus = "draft" | "pending" | "approved" | "declined" | "published";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  _id: string;
  vendor: string;
  items: InvoiceItem[];
  tax: number;
  tip: number;
  invoiceFile?: string;
  additionalFiles: string[];
  subtotal: number;
  total: number;
  // Convenience fields for simple display
  amount: number;
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
  // Additional Convex fields for full edit support
  willOrHaveRoomBooking?: boolean;
  roomBookingFiles?: string[];
  foodDrinksBeingServed?: boolean;
  asFundingRequired?: boolean;
  flyerType?: string[];
  otherFlyerType?: string;
  flyerAdvertisingStartDate?: number;
  flyerAdditionalRequests?: string;
  photographyNeeded?: boolean;
  requiredLogos?: string[];
  otherLogos?: string[];
  advertisingFormat?: string;
  additionalSpecifications?: string;
  flyersCompleted?: boolean;
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
  // Additional Convex fields
  willOrHaveRoomBooking: boolean;
  roomBookingFiles: string[];
  foodDrinksBeingServed: boolean;
  asFundingRequired: boolean;
  flyerType: string[];
  otherFlyerType: string;
  flyerAdvertisingStartDate: number;
  flyerAdditionalRequests: string;
  photographyNeeded: boolean;
  requiredLogos: string[];
  otherLogos: string[];
  advertisingFormat: string;
  additionalSpecifications: string;
  flyersCompleted: boolean;
}

export interface CalendarEvent {
  _id: string;
  eventName: string;
  startDate: number;
  endDate: number;
  status: EventStatus;
}
