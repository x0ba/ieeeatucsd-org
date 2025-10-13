import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardHeader, CardBody, Button } from '@heroui/react';
import { auth } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { EventManagementStats } from './EventManagementStats';
import EventRequestModal from './EventRequestModal';
import EventViewModal from './EventViewModal';
import FileManagementModal from './FileManagementModal';
import BulkActionsModal from './BulkActionsModal';
import GraphicsUploadModal from './GraphicsUploadModal';
import { TableSkeleton } from '../../../ui/loading';
import DashboardHeader from '../../shared/DashboardHeader';
import { EventsTable } from './components/EventsTable';
import { EventsPagination } from './components/EventsPagination';
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

    // Modal states
    const [showEventRequestModal, setShowEventRequestModal] = useState(false);
    const [showEventViewModal, setShowEventViewModal] = useState(false);
    const [showFileManagementModal, setShowFileManagementModal] = useState(false);
    const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
    const [showEventTemplatesModal, setShowEventTemplatesModal] = useState(false);
    const [showGraphicsUploadModal, setShowGraphicsUploadModal] = useState(false);
    const [graphicsUploadRequest, setGraphicsUploadRequest] = useState<EventRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<EventRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<EventRequest | null>(null);
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
        setViewingRequest(request);
        setShowEventViewModal(true);
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



    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <DashboardHeader
                title="Manage Events"
                subtitle="Create, edit, and manage IEEE UCSD events"
                searchPlaceholder="Search events..."
                searchValue={searchTerm}
                onSearchChange={handleSearch}
            >
                {searchTerm && (
                    <button
                        onClick={handleClearFilters}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] text-sm md:text-base"
                    >
                        <span className="hidden sm:inline">Clear</span>
                        <span className="sm:hidden">✕</span>
                    </button>
                )}
            </DashboardHeader>

            {/* Manage Events Content */}
            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 mb-4 md:mb-6">
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

                    {/* Event Requests Table */}
                    <Card key={currentUserRole} shadow="sm" className="border border-gray-200">
                        <CardHeader className="flex flex-col items-start px-4 md:px-6 py-4">
                            <h2 className="text-base md:text-lg font-semibold text-gray-900">
                                Event Requests ({sortedEventRequests.length})
                            </h2>
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

                </div>
            </main >

            {/* Event Request Modal */}
            {
                showEventRequestModal && (
                    <EventRequestModal
                        onClose={() => {
                            setShowEventRequestModal(false);
                            setEditingRequest(null);
                        }}
                        editingRequest={editingRequest}
                        onSuccess={() => {
                            // Real-time updates will handle the refresh automatically
                            setSuccess(editingRequest ? 'Event request updated successfully' : 'Event request created successfully');
                        }}
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