import { useState } from 'react';
import { Plus, List, CalendarDays, Search } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Tabs, Tab, Switch } from '@heroui/react';
import { auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { EventManagementStats } from './EventManagementStats';
import EventRequestModal from './EventRequestModal';
import EventViewModal from './EventViewModal';
import FileManagementModal from './FileManagementModal';
import BulkActionsModal from './BulkActionsModal';
import GraphicsUploadModal from './GraphicsUploadModal';
import { TableSkeleton } from '../../../ui/loading';
import { EventsTable } from './components/EventsTable';
import { EventsPagination } from './components/EventsPagination';
import { EventCalendarView } from './components/EventCalendarView';
import DraftEventModal from './components/DraftEventModal';
import { DraftViewModal } from './components/DraftViewModal';
import { useEventManagement } from './hooks/useEventManagement';
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

export default function ManageEventsContent() {
    const [user] = useAuthState(auth);

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
    const [viewingRequest, setViewingRequest] = useState<EventRequest | null>(null);
    const [viewingDraft, setViewingDraft] = useState<EventRequest | null>(null);
    const [managingFilesRequest, setManagingFilesRequest] = useState<EventRequest | null>(null);

    // Use custom hook for event management
    const {
        paginatedEventRequests,
        sortedEventRequests,
        users,
        loading,
        error,
        success,
        currentUserRole,
        searchTerm,
        sortBy,
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        stats,
        setError,
        setSuccess,
        setSearchTerm,
        setSortBy,
        setCurrentPage,
        handleDeleteRequest,
        getUserName
    } = useEventManagement(user?.uid);

    // Event handlers
    const handleEditRequest = (request: EventRequest) => {
        setEditingRequest(request);
        setShowEventRequestModal(true);
    };

    const handleViewRequest = (request: EventRequest) => {
        // Check if this is a draft event
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
        // Any officer can toggle graphics completion and upload files
        if (['General Officer', 'Executive Officer', 'Administrator'].includes(currentUserRole)) {
            // Always show upload modal for any toggle (check or uncheck)
            const request = sortedEventRequests.find(req => req.id === requestId);
            if (request) {
                setGraphicsUploadRequest(request);
                setShowGraphicsUploadModal(true);
            }
        } else {
            setError('You do not have permission to manage graphics');
        }
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSortBy('date-desc');
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
        }
    };

    const handleDeleteDraft = async () => {
        if (viewingDraft) {
            try {
                await handleDeleteRequest(viewingDraft.id, viewingDraft.name);
                setShowDraftViewModal(false);
                setViewingDraft(null);
            } catch (error) {
                // handleDeleteRequest likely sets error state internally,
                // but keep modal open so user can retry
                console.error('Failed to delete draft:', error);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md w-full">
                    <label htmlFor="event-search" className="sr-only">
                        Search events
                    </label>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        id="event-search"
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px]"
                    />
                </div>
                {searchTerm && (
                    <button
                        onClick={handleClearFilters}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] text-sm md:text-base"
                    >
                        <span className="hidden sm:inline">Clear</span>
                        <span className="sm:hidden">✕</span>
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <EventManagementStats stats={stats} loading={loading} />

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-700">{success}</p>
                </div>
            )}

            {/* Tabs for View Switcher */}
            <Card shadow="sm" className="border border-gray-200">
                <CardBody className="p-0">
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={(key) => setActiveTab(key as string)}
                        aria-label="Event management views"
                        classNames={{
                            base: "w-full",
                            tabList: "w-full px-6 pt-4",
                            panel: "px-6 py-4"
                        }}
                    >
                        <Tab
                            key="list"
                            title={
                                <div className="flex items-center gap-2">
                                    <List className="w-4 h-4" />
                                    <span>Events List</span>
                                </div>
                            }
                        >


                            {/* Event Requests Table */}
                            <Card key={currentUserRole} shadow="sm" className="border border-gray-200">
                                <CardHeader className="flex flex-row items-center justify-between px-4 md:px-6 py-4">
                                    <h2 className="text-base md:text-lg font-semibold text-gray-900">
                                        Event Requests ({sortedEventRequests.length})
                                    </h2>
                                    {/* Action Buttons */}
                                    {canCreateEvent(currentUserRole) && (
                                        <Button
                                            color="primary"
                                            startContent={<Plus className="w-4 h-4" />}
                                            onPress={() => setShowEventRequestModal(true)}
                                            className="min-h-[44px]"
                                        >
                                            <span className="hidden sm:inline">Request an Event</span>
                                            <span className="sm:hidden">Request</span>
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardBody className="p-0">
                                    <div className="overflow-x-auto">
                                        {loading ? (
                                            <TableSkeleton rows={5} columns={7} />
                                        ) : paginatedEventRequests.length === 0 ? (
                                            <div className="p-6 text-center">
                                                <p className="text-gray-500">
                                                    {sortedEventRequests.length === 0 ? 'No event requests found' : 'No events match the current filters'}
                                                </p>
                                                {sortedEventRequests.length > 0 && (
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
                                                eventRequests={paginatedEventRequests}
                                                sortBy={sortBy}
                                                currentUserRole={currentUserRole}
                                                currentUserId={user?.uid}
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
                                <EventsPagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={sortedEventRequests.length}
                                    startIndex={startIndex}
                                    endIndex={endIndex}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </Tab>

                        <Tab
                            key="calendar"
                            title={
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4" />
                                    <span>Event Planning</span>
                                </div>
                            }
                        >
                            <EventCalendarView
                                eventRequests={sortedEventRequests}
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
                }}
                preselectedDate={selectedDate}
                onSuccess={() => {
                    setShowDraftEventModal(false);
                    setSelectedDate(null);
                }}
            />

            {/* Event Request Modal */}
            {showEventRequestModal && (
                <EventRequestModal
                    onClose={() => {
                        setShowEventRequestModal(false);
                        setEditingRequest(null);
                        setSelectedDate(null);
                    }}
                    editingRequest={editingRequest}
                    preselectedDate={selectedDate}
                    onSuccess={() => {
                        // Real-time updates will handle the refresh automatically
                        setSuccess(editingRequest ? 'Event request updated successfully' : 'Event request created successfully');
                        setSelectedDate(null);
                    }}
                />
            )
            }

            {/* Draft View Modal */}
            {
                showDraftViewModal && viewingDraft && (
                    <DraftViewModal
                        isOpen={showDraftViewModal}
                        onClose={() => {
                            setShowDraftViewModal(false);
                            setViewingDraft(null);
                        }}
                        draftEvent={viewingDraft}
                        onConvertToFull={handleConvertDraftFromView}
                        onDelete={handleDeleteDraft}
                        userName={getUserName(viewingDraft.requestedUser)}
                    />
                )
            }

            {/* Event View Modal */}
            {
                showEventViewModal && (
                    <EventViewModal
                        request={viewingRequest}
                        users={users}
                        onClose={() => {
                            setShowEventViewModal(false);
                            setViewingRequest(null);
                        }}
                        onSuccess={() => {
                            // The real-time listener will automatically update the data
                            // No need to manually refresh since we're using onSnapshot
                        }}
                    />
                )
            }

            {/* File Management Modal */}
            {
                showFileManagementModal && (
                    <FileManagementModal
                        request={managingFilesRequest}
                        onClose={() => {
                            setShowFileManagementModal(false);
                            setManagingFilesRequest(null);
                        }}
                    />
                )
            }

            {/* Bulk Actions Modal */}
            {
                showBulkActionsModal && (
                    <BulkActionsModal
                        events={sortedEventRequests}
                        users={users}
                        onClose={() => setShowBulkActionsModal(false)}
                        onSuccess={(message: string) => setSuccess(message)}
                        onError={(message: string) => setError(message)}
                    />
                )
            }

            {/* Graphics Upload Modal */}
            {
                showGraphicsUploadModal && graphicsUploadRequest && (
                    <GraphicsUploadModal
                        request={graphicsUploadRequest}
                        onClose={() => {
                            setShowGraphicsUploadModal(false);
                            setGraphicsUploadRequest(null);
                        }}
                        onSuccess={() => {
                            setSuccess('Graphics files uploaded and marked as completed');
                            // Real-time listener will automatically update the data
                        }}
                    />
                )
            }

        </div >
    );
}