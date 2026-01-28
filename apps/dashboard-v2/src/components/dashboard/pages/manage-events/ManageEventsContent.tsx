import { useState, useMemo, useEffect } from 'react';
import { Plus, List, CalendarDays, Search } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Tabs, Tab, Switch } from '@heroui/react';
import { useQuery, useMutation } from 'convex/react';
import { api } from "#convex/_generated/api";
import { useAuth } from '../../../../hooks/useConvexAuth';
import { showToast } from '../../shared/utils/toast';
import { EventManagementStats } from './components/EventManagementStats';
import { EventRequestModal } from './components/EventRequestModal';
import { EventViewModal } from './components/EventViewModal';
import { FileManagementModal } from './components/FileManagementModal';
import { BulkActionsModal } from './components/BulkActionsModal';
import { GraphicsUploadModal } from './components/GraphicsUploadModal';
import { TableSkeleton } from '../../../ui/loading';
import { EventsTable } from './components/EventsTable';
import { EventsPagination } from './components/EventsPagination';
import { EventCalendarView } from './components/EventCalendarView';
import { DateRangeFilter } from './components/DateRangeFilter';
import { StatusFilter } from './components/StatusFilter';
import DraftEventModal from './components/DraftEventModal';
import { DraftViewModal } from './components/DraftViewModal';
import { canCreateEvent, canManageGraphics } from './utils/permissionUtils';

interface EventRequest {
    id: string;
    name: string;
    location: string;
    startDateTime: any;
    endDateTime: any;
    eventDescription: string;
    status: string;
    requestedUser: string;
    createdAt: any;
    department?: string;
    needsGraphics?: boolean;
    needsAsFunding?: boolean;
    graphicsCompleted?: boolean;
    graphicsFiles?: string[];
    flyersNeeded?: boolean;
    flyersCompleted?: boolean;
    [key: string]: any;
}

// Helper function to map Convex data to EventRequest interface
const mapConvexEventToEventRequest = (convexEvent: any): EventRequest => ({
    ...convexEvent,
    id: convexEvent._id,
    createdAt: convexEvent._creationTime,
});

export default function ManageEventsContent() {
    const { user, authUserId } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const allEvents = useQuery(api.eventManagement.getAllEventRequests, mounted ? {} : "skip");

    // Transform events for display
    const eventRequests = useMemo(() => {
        if (!allEvents) return [];
        return allEvents.map(mapConvexEventToEventRequest);
    }, [allEvents]);

    const updateEventRequest = useMutation(api.eventManagement.updateEventRequest);

    // Tab state
    const [activeTab, setActiveTab] = useState<string>('list');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Modal states
    const [showEventRequestModal, setShowEventRequestModal] = useState(false);
    const [showDraftEventModal, setShowDraftEventModal] = useState(false);
    const [showDraftViewModal, setShowDraftViewModal] = useState(false);
    const [showEventViewModal, setShowEventViewModal] = useState(false);
    const [showFileManagementModal, setShowFileManagementModal] = useState(false);
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
    const [showEventTemplatesModal, setShowEventTemplatesModal] = useState(false);
    const [showGraphicsUploadModal, setShowGraphicsUploadModal] = useState(false);
    const [graphicsUploadRequest, setGraphicsUploadRequest] = useState<EventRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<EventRequest | null>(null);
    const [editingDraft, setEditingDraft] = useState<EventRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<EventRequest | null>(null);
    const [viewingDraft, setViewingDraft] = useState<EventRequest | null>(null);
    const [managingFilesRequest, setManagingFilesRequest] = useState<EventRequest | null>(null);

    // Filters and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [dateRangeFilter, setDateRangeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [itemsPerPage] = useState(10);

    // Filter and sort events
    const filteredEvents = useMemo(() => {
        let filtered = [...eventRequests];

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (event) =>
                    event.name?.toLowerCase().includes(term) ||
                    event.location?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((event) => event.status === statusFilter);
        }

        // Apply date range filter
        if (dateRangeFilter !== 'all') {
            const now = Date.now();
            switch (dateRangeFilter) {
                case 'past':
                    filtered = filtered.filter((event) => event.startDateTime < now);
                    break;
                case 'upcoming':
                    filtered = filtered.filter((event) => event.startDateTime >= now);
                    break;
                case 'thisWeek':
                    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
                    const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
                    filtered = filtered.filter(
                        (event) => event.startDateTime >= weekAgo && event.startDateTime <= weekAhead
                    );
                    break;
            }
        }

        // Apply sorting
        filtered.sort((a, b) => {
            const direction = sortBy.endsWith('-desc') ? -1 : 1;
            const field = sortBy.split('-')[0];

            switch (field) {
                case 'name':
                    return direction * (a.name || '').localeCompare(b.name || '');
                case 'date':
                    return direction * ((a.startDateTime || 0) - (b.startDateTime || 0));
                case 'status':
                    return direction * (a.status || '').localeCompare(b.status || '');
                default:
                    return 0;
            }
        });

        return filtered;
    }, [eventRequests, searchTerm, statusFilter, dateRangeFilter, sortBy]);

    // Pagination
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    // Calculate stats
    const stats = useMemo(() => {
        return {
            totalEvents: eventRequests.length,
            publishedEvents: eventRequests.filter((e) => e.status === 'approved').length,
            draftEvents: eventRequests.filter((e) => e.status === 'draft').length,
            pendingEvents: eventRequests.filter((e) => e.status === 'pending').length,
            completedEvents: eventRequests.filter((e) => e.status === 'completed').length,
            totalAttendees: 0, // Would need to be calculated from attendance data
            averageAttendance: 0, // Would need to be calculated from attendance data
            upcomingEvents: eventRequests.filter((e) => e.startDateTime >= Date.now()).length,
            pastEvents: eventRequests.filter((e) => e.startDateTime < Date.now()).length,
        };
    }, [eventRequests]);

    const currentUserRole = user?.role || 'Member';

    // Event handlers
    const handleEditRequest = (request: EventRequest) => {
        const isDraftEvent = request.isDraft === true || request.status === 'draft';

        if (isDraftEvent) {
            setEditingDraft(request);
            setShowDraftEventModal(true);
        } else {
            setEditingRequest(request);
            setShowEventRequestModal(true);
        }
    };

    const handleViewRequest = (request: EventRequest) => {
        const isDraftEvent = request.isDraft === true || request.status === 'draft';

        if (isDraftEvent) {
            setViewingDraft(request);
            setShowDraftViewModal(true);
        } else {
            setViewingRequest(request);
            setShowEventViewModal(true);
        }
    };

    const handleFileManagement = (request: EventRequest) => {
        setManagingFilesRequest(request);
        setShowFileManagementModal(true);
    };

    const handleGraphicsToggle = async (requestId: string, isCompleted: boolean) => {
        if (['General Officer', 'Executive Officer', 'Administrator'].includes(currentUserRole)) {
            const request = filteredEvents.find((req) => req.id === requestId);
            if (request) {
                setGraphicsUploadRequest(mapConvexEventToEventRequest(request));
                setShowGraphicsUploadModal(true);
            }
        } else {
            showToast.error('You do not have permission to manage graphics');
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSortBy('date-desc');
        setDateRangeFilter('all');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const handleSort = (column: string) => {
        let newSortBy = '';
        switch (column) {
            case 'name':
                newSortBy = sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
                break;
            case 'date':
                newSortBy = sortBy === 'date-asc' ? 'date-desc' : 'date-asc';
                break;
            case 'status':
                newSortBy = sortBy === 'status-asc' ? 'status-desc' : 'status-asc';
                break;
            default:
                newSortBy = 'date-desc';
        }
        setSortBy(newSortBy);
        setCurrentPage(1);
    };

    const handleCreateEventFromCalendar = (date: Date) => {
        setSelectedDate(date);
        setShowDraftEventModal(true);
    };

    const handleConvertDraftToFull = (request: EventRequest) => {
        setEditingRequest(request);
        setShowEventRequestModal(true);
    };

    const handleConvertDraftFromView = () => {
        if (viewingDraft) {
            setShowDraftViewModal(false);
            setEditingRequest(viewingDraft);
            setShowEventRequestModal(true);
            setViewingDraft(null);
        }
    };

    const handleEditDraftFromView = () => {
        if (viewingDraft) {
            setShowDraftViewModal(false);
            setEditingDraft(viewingDraft);
            setShowDraftEventModal(true);
        }
    };

    const handleDeleteRequest = async (requestId: string, requestName: string) => {
        if (!authUserId) return;

        try {
            await updateEventRequest({
                requestId,
                status: 'declined',
                declinedReason: 'Deleted by user',
                updatedBy: authUserId,
            });
            showToast.success(`"${requestName}" deleted successfully`);
        } catch (error) {
            console.error('Error deleting request:', error);
            showToast.error('Failed to delete request');
        }
    };

    const handleDeleteDraft = async () => {
        if (viewingDraft) {
            try {
                await handleDeleteRequest(viewingDraft.id, viewingDraft.name);
                setShowDraftViewModal(false);
                setViewingDraft(null);
            } catch (error) {
                console.error('Failed to delete draft:', error);
            }
        }
    };

    const getUserName = (userId: string) => {
        // This would need to fetch user data - simplified for now
        return 'Unknown User';
    };

    const loading = allEvents === undefined;

    return (
        <div className="flex-1 overflow-auto">
            <main className="p-4 md:p-6">
                <div className="space-y-6">
                    {/* Stats Overview */}
                    <EventManagementStats stats={stats} />

                    {/* Tabs for View Switcher */}
                    <Card shadow="sm" className="border border-gray-200">
                        <CardBody className="p-0">
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={(key) => setActiveTab(key as string)}
                                aria-label="Event management views"
                                variant="underlined"
                                color="primary"
                                classNames={{
                                    base: "w-full",
                                    tabList: "w-full px-6 pt-6 gap-8 relative",
                                    tab: "px-0 py-4 h-12 font-semibold text-gray-600 data-[selected=true]:text-primary data-[hover=true]:text-primary transition-all duration-200 ease-in-out",
                                    tabContent: "group-data-[selected=true]:text-primary group-data-[selected=true]:font-semibold",
                                    cursor: "bg-primary rounded-full h-0.5 transition-all duration-200 ease-in-out",
                                    panel: "px-6 py-6 mt-2"
                                }}
                            >
                                <Tab
                                    key="list"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <List className="w-4 h-4" />
                                            <span className="font-medium">Events List</span>
                                        </div>
                                    }
                                >
                                    {/* Event Requests Table */}
                                    <Card key={currentUserRole} shadow="sm" className="border border-gray-200">
                                        <CardHeader className="flex flex-col sm:flex-row gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50 items-center justify-between">
                                            {/* Title Section */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <h2 className="text-sm font-bold text-gray-900">
                                                    Event Requests
                                                </h2>
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                                    {filteredEvents.length}
                                                </span>
                                            </div>

                                            {/* Controls Section */}
                                            <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
                                                <div className="relative flex-1 w-full sm:w-[240px]">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                                    <input
                                                        id="event-search"
                                                        type="text"
                                                        placeholder="Search events..."
                                                        value={searchTerm}
                                                        onChange={(e) => handleSearch(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-xs h-9"
                                                    />
                                                </div>
                                                <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 items-center w-full sm:w-auto">
                                                    <DateRangeFilter
                                                        selectedRange={dateRangeFilter}
                                                        onRangeChange={setDateRangeFilter}
                                                    />
                                                    <StatusFilter
                                                        selectedStatus={statusFilter}
                                                        onStatusChange={setStatusFilter}
                                                    />
                                                    {searchTerm && (
                                                        <Button
                                                            isIconOnly
                                                            variant="flat"
                                                            color="danger"
                                                            size="sm"
                                                            onPress={handleClearFilters}
                                                            className="h-9 w-9 min-w-9"
                                                            title="Clear filters"
                                                        >
                                                            ✕
                                                        </Button>
                                                    )}
                                                    {canCreateEvent(currentUserRole) && (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            startContent={<Plus className="w-3.5 h-3.5" />}
                                                            onPress={() => setShowEventRequestModal(true)}
                                                            className="font-medium shadow-md shadow-primary/20 h-9"
                                                        >
                                                            Request Event
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardBody className="p-0">
                                            <div className="overflow-x-auto">
                                                {loading ? (
                                                    <TableSkeleton rows={5} />
                                                ) : paginatedEvents.length === 0 ? (
                                                    <div className="p-6 text-center">
                                                        <p className="text-gray-500">
                                                            {filteredEvents.length === 0 ? 'No event requests found' : 'No events match the current filters'}
                                                        </p>
                                                        {filteredEvents.length > 0 && (
                                                            <Button
                                                                variant="light"
                                                                color="primary"
                                                                onPress={handleClearFilters}
                                                                className="mt-2"
                                                            >
                                                                Clear filters
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <EventsTable
                                                        eventRequests={paginatedEvents}
                                                        sortBy={sortBy}
                                                        currentUserRole={currentUserRole}
                                                        currentUserId={authUserId || ''}
                                                        onSort={handleSort}
                                                        onViewRequest={handleViewRequest}
                                                        onEditRequest={handleEditRequest}
                                                        onDeleteRequest={handleDeleteRequest}
                                                        onGraphicsToggle={handleGraphicsToggle}
                                                        onConvertDraftToFull={handleConvertDraftToFull}
                                                        getUserName={getUserName}
                                                    />
                                                )}
                                            </div>
                                        </CardBody>
                                    </Card>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="mt-4">
                                            <EventsPagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                totalItems={filteredEvents.length}
                                                startIndex={startIndex}
                                                endIndex={endIndex}
                                                onPageChange={setCurrentPage}
                                            />
                                        </div>
                                    )}
                                </Tab>

                                <Tab
                                    key="calendar"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4" />
                                            <span className="font-medium">Event Planning</span>
                                        </div>
                                    }
                                >
                                    <EventCalendarView
                                        eventRequests={filteredEvents}
                                        onCreateEvent={handleCreateEventFromCalendar}
                                        onViewEvent={handleViewRequest}
                                        onEditEvent={handleEditRequest}
                                        onConvertDraftToFull={handleConvertDraftToFull}
                                        currentUserRole={currentUserRole}
                                    />
                                </Tab>
                            </Tabs>
                        </CardBody>
                    </Card>

                    {/* Draft Event Modal */}
                    <DraftEventModal
                        isOpen={showDraftEventModal}
                        onClose={() => {
                            setShowDraftEventModal(false);
                            setSelectedDate(null);
                            setEditingDraft(null);
                        }}
                        preselectedDate={selectedDate}
                        editingDraft={editingDraft}
                        onSuccess={() => {
                            setShowDraftEventModal(false);
                            setSelectedDate(null);
                            setEditingDraft(null);
                        }}
                    />

                    {/* Event Request Modal */}
                    {showEventRequestModal && (
                        <EventRequestModal
                            open={showEventRequestModal}
                            onOpenChange={setShowEventRequestModal}
                            onSubmit={() => {
                                setShowEventRequestModal(false);
                                showToast.success('Event request submitted successfully');
                            }}
                            initialData={editingRequest ? {
                                name: editingRequest.name,
                                location: editingRequest.location,
                                startDateTime: new Date(editingRequest.startDateTime).toISOString(),
                                endDateTime: new Date(editingRequest.endDateTime).toISOString(),
                                eventDescription: editingRequest.eventDescription || '',
                                flyersNeeded: editingRequest.flyersNeeded || false,
                                photographyNeeded: editingRequest.photographyNeeded || false,
                            } : undefined}
                        />
                    )}

                    {/* Draft View Modal */}
                    {showDraftViewModal && viewingDraft && (
                        <DraftViewModal
                            isOpen={showDraftViewModal}
                            onClose={() => {
                                setShowDraftViewModal(false);
                                setViewingDraft(null);
                            }}
                            draftEvent={viewingDraft}
                            onConvertToFull={handleConvertDraftFromView}
                            onEdit={handleEditDraftFromView}
                            onDelete={handleDeleteDraft}
                            userName={getUserName(viewingDraft.requestedUser)}
                        />
                    )}

                    {/* Event View Modal */}
                    {showEventViewModal && (
                        <EventViewModal
                            open={showEventViewModal}
                            onOpenChange={setShowEventViewModal}
                            event={viewingRequest ? {
                                _id: viewingRequest.id,
                                eventName: viewingRequest.name,
                                eventDescription: viewingRequest.eventDescription || '',
                                eventCode: viewingRequest.id,
                                location: viewingRequest.location || '',
                                startDate: viewingRequest.startDateTime,
                                endDate: viewingRequest.endDateTime,
                                published: viewingRequest.status === 'published',
                                eventType: 'general',
                                hasFood: viewingRequest.foodDrinksBeingServed || false,
                                pointsToReward: 0,
                                files: [],
                            } : null}
                        />
                    )}

                    {/* File Management Modal */}
                    {showFileManagementModal && (
                        <FileManagementModal
                            open={showFileManagementModal}
                            onOpenChange={setShowFileManagementModal}
                            files={managingFilesRequest?.graphicsFiles?.map(id => ({ id, name: id, type: 'unknown', size: 0, uploadedAt: Date.now(), uploadedBy: 'current' })) || []}
                            onUpload={(files: FileList) => {
                                // Handle file upload
                                showToast.success('Files uploaded successfully');
                            }}
                            onDelete={(fileId: string) => {
                                // Handle file deletion
                                showToast.success('File deleted successfully');
                            }}
                            onDownload={(fileId: string) => {
                                // Handle file download
                                showToast.success('File downloaded');
                            }}
                            onView={(fileId: string) => {
                                // Handle file view
                                showToast.info('File preview opened');
                            }}
                        />
                    )}

                    {/* Bulk Actions Modal */}
                    {showBulkActionsModal && (
                        <BulkActionsModal
                            open={showBulkActionsModal}
                            onOpenChange={setShowBulkActionsModal}
                            selectedEvents={filteredEvents.map(e => e.id)}
                            onAction={(action, params) => {
                                // Handle bulk action
                                setShowBulkActionsModal(false);
                                showToast.success(`Bulk action "${action.label}" executed`);
                            }}
                        />
                    )}

                    {/* Graphics Upload Modal */}
                    {showGraphicsUploadModal && graphicsUploadRequest && (
                        <GraphicsUploadModal
                            open={showGraphicsUploadModal}
                            onOpenChange={setShowGraphicsUploadModal}
                            onSubmit={(data) => {
                                setShowGraphicsUploadModal(false);
                                setGraphicsUploadRequest(null);
                                showToast.success('Graphics uploaded successfully');
                            }}
                            initialData={graphicsUploadRequest ? {
                                eventType: graphicsUploadRequest.eventType || 'general',
                                title: graphicsUploadRequest.name,
                                description: graphicsUploadRequest.eventDescription || '',
                                deadline: new Date(graphicsUploadRequest.startDateTime).toISOString(),
                            } : undefined}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
