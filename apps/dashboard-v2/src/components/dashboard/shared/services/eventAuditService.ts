/**
 * Event Audit Service for tracking changes to events
 */

export interface AuditLogEntry {
  id: string;
  eventId: string;
  action: "create" | "update" | "delete" | "status_change" | "file_upload" | "file_delete";
  performedBy: string;
  performedAt: number;
  beforeState?: any;
  afterState?: any;
  description?: string;
  metadata?: Record<string, any>;
}

export interface EventChangeTracker {
  eventId: string;
  originalState: any;
  changes: Partial<AuditLogEntry>[];
  isTracking: boolean;
}

class EventAuditService {
  private static instance: EventAuditService;
  private changeTrackers: Map<string, EventChangeTracker> = new Map();

  static getInstance(): EventAuditService {
    if (!EventAuditService.instance) {
      EventAuditService.instance = new EventAuditService();
    }
    return EventAuditService.instance;
  }

  /**
   * Start tracking changes for an event
   */
  startTracking(eventId: string, originalState: any): void {
    this.changeTrackers.set(eventId, {
      eventId,
      originalState,
      changes: [],
      isTracking: true,
    });
  }

  /**
   * Stop tracking changes for an event and return the audit log
   */
  stopTracking(eventId: string): AuditLogEntry[] {
    const tracker = this.changeTrackers.get(eventId);
    if (!tracker) return [];

    this.changeTrackers.delete(eventId);
    return tracker.changes.map(change => ({
      id: `${eventId}-${change.performedAt}-${Math.random()}`,
      eventId,
      action: change.action!,
      performedBy: change.performedBy!,
      performedAt: change.performedAt!,
      beforeState: change.beforeState,
      afterState: change.afterState,
      description: change.description,
      metadata: change.metadata,
    }));
  }

  /**
   * Log a specific change
   */
  logChange(
    eventId: string,
    action: AuditLogEntry["action"],
    performedBy: string,
    beforeState?: any,
    afterState?: any,
    description?: string,
    metadata?: Record<string, any>
  ): void {
    const tracker = this.changeTrackers.get(eventId);
    if (!tracker || !tracker.isTracking) return;

    tracker.changes.push({
      action,
      performedBy,
      performedAt: Date.now(),
      beforeState,
      afterState,
      description,
      metadata,
    });
  }

  /**
   * Get the current tracking state for an event
   */
  getTrackingState(eventId: string): EventChangeTracker | undefined {
    return this.changeTrackers.get(eventId);
  }

  /**
   * Create a manual audit entry
   */
  createAuditEntry(
    eventId: string,
    action: AuditLogEntry["action"],
    performedBy: string,
    description?: string,
    beforeState?: any,
    afterState?: any,
    metadata?: Record<string, any>
  ): AuditLogEntry {
    return {
      id: `${eventId}-${Date.now()}-${Math.random()}`,
      eventId,
      action,
      performedBy,
      performedAt: Date.now(),
      beforeState,
      afterState,
      description,
      metadata,
    };
  }

  /**
   * Format audit entry for display
   */
  formatAuditEntry(entry: AuditLogEntry): string {
    const actionText = {
      create: "Created",
      update: "Updated",
      delete: "Deleted",
      status_change: "Changed status",
      file_upload: "Uploaded file",
      file_delete: "Deleted file",
    };

    return `${actionText[entry.action]}${entry.description ? `: ${entry.description}` : ""}`;
  }
}

export const eventAuditService = EventAuditService.getInstance();

// Helper functions for common audit operations
export const auditEventCreation = (eventId: string, performedBy: string, eventData: any) => {
  return eventAuditService.createAuditEntry(
    eventId,
    "create",
    performedBy,
    `Created event: ${eventData.title}`,
    undefined,
    eventData
  );
};

export const auditEventUpdate = (eventId: string, performedBy: string, changes: any, originalData: any) => {
  return eventAuditService.createAuditEntry(
    eventId,
    "update",
    performedBy,
    "Updated event",
    originalData,
    changes
  );
};

export const auditEventStatusChange = (
  eventId: string,
  performedBy: string,
  oldStatus: string,
  newStatus: string
) => {
  return eventAuditService.createAuditEntry(
    eventId,
    "status_change",
    performedBy,
    `Status changed from ${oldStatus} to ${newStatus}`,
    { status: oldStatus },
    { status: newStatus }
  );
};

export const auditFileUpload = (eventId: string, performedBy: string, fileName: string, fileType: string) => {
  return eventAuditService.createAuditEntry(
    eventId,
    "file_upload",
    performedBy,
    `Uploaded file: ${fileName}`,
    undefined,
    { fileName, fileType }
  );
};

export const auditFileDelete = (eventId: string, performedBy: string, fileName: string) => {
  return eventAuditService.createAuditEntry(
    eventId,
    "file_delete",
    performedBy,
    `Deleted file: ${fileName}`,
    { fileName },
    undefined
  );
};
