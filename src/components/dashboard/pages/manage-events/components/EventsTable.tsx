import React from 'react';
import { Edit, Trash2, Eye, ChevronUp, ChevronDown, ChevronsUpDown, MapPin, Calendar } from 'lucide-react';
import { Button, Chip, Tooltip, Checkbox } from '@heroui/react';
import { getStatusColor, getStatusIcon } from '../utils/statusUtils';
import { canEditEvent as checkCanEditEvent, canDeleteEvent as checkCanDeleteEvent, canManageGraphics } from '../utils/permissionUtils';
import type { UserRole } from '../../../shared/types/firestore';

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
    needsGraphics?: boolean;
    needsAsFunding?: boolean;
    graphicsCompleted?: boolean;
    graphicsFiles?: string[];
}

interface EventsTableProps {
    eventRequests: EventRequest[];
    sortBy: string;
    currentUserRole: UserRole;
    currentUserId: string | undefined;
    onSort: (column: string) => void;
    onViewRequest: (request: EventRequest) => void;
    onEditRequest: (request: EventRequest) => void;
    onDeleteRequest: (requestId: string, eventName: string) => void;
    onGraphicsToggle: (requestId: string, isCompleted: boolean) => void;
    getUserName: (userId: string) => string;
}

export function EventsTable({
    eventRequests,
    sortBy,
    currentUserRole,
    currentUserId,
    onSort,
    onViewRequest,
    onEditRequest,
    onDeleteRequest,
    onGraphicsToggle,
    getUserName
}: EventsTableProps) {
    const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
        <th
            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                <span>{children}</span>
                {(sortBy === `${field}-asc` || sortBy === `${field}-desc`) ? (
                    sortBy === `${field}-asc` ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                )}
            </div>
        </th>
    );

    const canEditEvent = (request: EventRequest) => checkCanEditEvent(request, currentUserId, currentUserRole);
    const canDeleteEvent = (request: EventRequest) => checkCanDeleteEvent(request, currentUserId, currentUserRole);

    // Helper to format date
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'No date';
        const date = timestamp?.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Helper to truncate text
    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Helper to get status chip color
    const getChipColor = (status: string): "success" | "primary" | "warning" | "danger" | "default" => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'submitted':
                return 'primary';
            case 'pending':
            case 'needs_review':
                return 'warning';
            case 'declined':
            case 'rejected':
                return 'danger';
            default:
                return 'default';
        }
    };

    return (
        <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <SortableHeader field="name">Event Details</SortableHeader>
                    <SortableHeader field="date">Date</SortableHeader>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Location
                    </th>
                    <SortableHeader field="status">Status</SortableHeader>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        Requirements
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        Submitted By
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {eventRequests.map((request) => {
                    const StatusIcon = getStatusIcon(request.status);

                    return (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                            {/* Event Details Column */}
                            <td className="px-3 py-2">
                                <div className="max-w-[180px]">
                                    <Tooltip content={request.name} delay={500}>
                                        <div className="text-xs font-semibold text-gray-900 truncate">
                                            {truncateText(request.name, 25)}
                                        </div>
                                    </Tooltip>
                                    <Tooltip content={request.eventDescription} delay={500}>
                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                            {truncateText(request.eventDescription, 35)}
                                        </div>
                                    </Tooltip>
                                    {/* Show location on mobile */}
                                    <div className="lg:hidden flex items-center gap-1 mt-1 text-xs text-gray-400">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate">{truncateText(request.location, 20)}</span>
                                    </div>
                                </div>
                            </td>

                            {/* Date Column */}
                            <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-xs text-gray-900">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>{formatDate(request.startDateTime)}</span>
                                </div>
                            </td>

                            {/* Location Column (hidden on mobile) */}
                            <td className="px-3 py-2 hidden lg:table-cell">
                                <Tooltip content={request.location} delay={500}>
                                    <div className="flex items-center gap-1 max-w-[120px]">
                                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                        <span className="text-xs text-gray-700 truncate">{truncateText(request.location, 20)}</span>
                                    </div>
                                </Tooltip>
                            </td>

                            {/* Status Column */}
                            <td className="px-3 py-2">
                                <div className="inline-flex">
                                    <Chip
                                        color={getChipColor(request.status)}
                                        variant="flat"
                                        size="sm"
                                        startContent={<StatusIcon className="w-3 h-3 flex-shrink-0" />}
                                        classNames={{
                                            base: "h-6 gap-1",
                                            content: "text-xs capitalize px-1.5"
                                        }}
                                    >
                                        {request.status.replace('_', ' ')}
                                    </Chip>
                                </div>
                            </td>
                            {/* Requirements Column (hidden on smaller screens) */}
                            <td className="px-3 py-2 hidden xl:table-cell">
                                <div className="flex flex-col gap-1">
                                    {request.needsGraphics && (
                                        <div
                                            className="flex items-center gap-1.5 cursor-pointer select-none"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (canManageGraphics(currentUserRole)) {
                                                    onGraphicsToggle(request.id, request.graphicsCompleted || false);
                                                }
                                            }}
                                        >
                                            <div className="pointer-events-none">
                                                <Checkbox
                                                    size="sm"
                                                    isSelected={request.graphicsCompleted}
                                                    isDisabled={!canManageGraphics(currentUserRole)}
                                                    isReadOnly
                                                    classNames={{
                                                        wrapper: "after:bg-secondary after:text-secondary-foreground"
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-700">Graphics</span>
                                        </div>
                                    )}
                                    {request.needsAsFunding && (
                                        <Chip
                                            color="success"
                                            variant="flat"
                                            size="sm"
                                            className="text-xs h-5"
                                        >
                                            Funding
                                        </Chip>
                                    )}
                                    {!request.needsGraphics && !request.needsAsFunding && (
                                        <span className="text-xs text-gray-400">None</span>
                                    )}
                                </div>
                            </td>

                            {/* Submitted By Column (hidden on mobile) */}
                            <td className="px-3 py-2 hidden md:table-cell">
                                <div>
                                    <div className="text-xs font-medium text-gray-900">
                                        {getUserName(request.requestedUser)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatDate(request.createdAt)}
                                    </div>
                                </div>
                            </td>
                            {/* Actions Column */}
                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                    <Tooltip content="View Details" delay={300}>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="success"
                                            onPress={() => onViewRequest(request)}
                                            aria-label="View Request"
                                            className="min-w-unit-8 w-8 h-8"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                    </Tooltip>

                                    {canEditEvent(request) && (
                                        <Tooltip content="Edit Event" delay={300}>
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                color="primary"
                                                onPress={() => onEditRequest(request)}
                                                aria-label="Edit Request"
                                                className="min-w-unit-8 w-8 h-8"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                        </Tooltip>
                                    )}

                                    {canDeleteEvent(request) && (
                                        <Tooltip content="Delete Event" delay={300}>
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="light"
                                                color="danger"
                                                onPress={() => onDeleteRequest(request.id, request.name)}
                                                aria-label="Delete Request"
                                                className="min-w-unit-8 w-8 h-8"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

