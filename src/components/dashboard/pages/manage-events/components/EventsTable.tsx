import React from 'react';
import { Edit, Trash2, Eye, MapPin, Calendar, FileUp, Clock, AlertCircle, CheckCircle, XCircle, User } from 'lucide-react';
import { Button, Chip, Tooltip, Checkbox, Card, CardBody } from '@heroui/react';
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
    published?: boolean;
    isDraft?: boolean;
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
    onConvertDraftToFull?: (request: EventRequest) => void;
    getUserName: (userId: string) => string;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'approved': return CheckCircle;
        case 'submitted': return Clock;
        case 'pending': return AlertCircle;
        case 'rejected':
        case 'declined': return XCircle;
        default: return Clock;
    }
};

const getChipColor = (status: string): "success" | "warning" | "danger" | "default" | "secondary" => {
    switch (status) {
        case 'approved': return 'success';
        case 'submitted': return 'secondary';
        case 'pending':
        case 'needs_review': return 'warning';
        case 'declined':
        case 'rejected': return 'danger';
        default: return 'default';
    }
};

export function EventsTable({
    eventRequests,
    currentUserRole,
    currentUserId,
    onViewRequest,
    onEditRequest,
    onDeleteRequest,
    onGraphicsToggle,
    onConvertDraftToFull,
    getUserName
}: EventsTableProps) {

    const canEditEvent = (request: EventRequest) => checkCanEditEvent(request, currentUserId, currentUserRole);
    const canDeleteEvent = (request: EventRequest) => checkCanDeleteEvent(request, currentUserId, currentUserRole);

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'No date';
        const date = timestamp?.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="flex flex-col gap-4">
            {eventRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);

                return (
                    <Card
                        key={request.id}
                        isPressable
                        onPress={() => onViewRequest(request)}
                        className="w-full border border-default-200 shadow-sm hover:border-primary-300 hover:shadow-md transition-all duration-200"
                    >
                        <CardBody className="p-4 sm:p-5">
                            <div className="flex flex-col md:flex-row gap-5 items-start md:items-center">
                                {/* Status Bar */}
                                <div className={`
                                    hidden md:block w-1.5 self-stretch rounded-full
                                    ${request.status === 'approved' ? 'bg-success-500' :
                                        (request.status === 'declined' || request.status === 'rejected') ? 'bg-danger-500' :
                                            'bg-warning-500'}
                                `} />

                                <div className="flex-1 min-w-0 space-y-2 w-full">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <h3 className="text-lg font-semibold text-foreground truncate max-w-full">
                                            {request.name}
                                        </h3>
                                        <Chip
                                            size="sm"
                                            color={getChipColor(request.status)}
                                            variant="flat"
                                            className="border-none gap-1 pl-1"
                                            startContent={<StatusIcon className="w-3.5 h-3.5" />}
                                        >
                                            <span className="font-medium text-xs capitalize">{request.status.replace('_', ' ')}</span>
                                        </Chip>
                                        {request.published && (
                                            <Chip color="success" variant="flat" size="sm" className="h-5 text-[10px] px-1">Published</Chip>
                                        )}
                                        {request.isDraft && (
                                            <Chip variant="bordered" size="sm" className="h-5 text-[10px] px-1">DRAFT</Chip>
                                        )}
                                    </div>

                                    <p className="text-sm text-default-500 line-clamp-1">{request.eventDescription}</p>

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-default-400 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(request.startDateTime)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[200px]">{request.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5" />
                                            <span>{getUserName(request.requestedUser)}</span>
                                        </div>
                                    </div>

                                    {/* Requirements */}
                                    {(request.needsGraphics || request.needsAsFunding) && (
                                        <div className="flex items-center gap-3 mt-2">
                                            {request.needsGraphics && (
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent card click
                                                        if (canManageGraphics(currentUserRole)) {
                                                            onGraphicsToggle(request.id, request.graphicsCompleted || false);
                                                        }
                                                    }}
                                                >
                                                    <Checkbox
                                                        size="sm"
                                                        isSelected={request.graphicsCompleted}
                                                        isDisabled={!canManageGraphics(currentUserRole)}
                                                        isReadOnly
                                                    />
                                                    <span className="text-xs font-medium text-default-500">Graphics</span>
                                                </div>
                                            )}
                                            {request.needsAsFunding && (
                                                <Chip color="success" variant="flat" size="sm" className="h-5 text-[10px] px-1">Funding</Chip>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0 border-t md:border-t-0 border-default-100 pt-3 md:pt-0 w-full md:w-auto justify-end">
                                    {(request.isDraft && request.status === 'draft' && onConvertDraftToFull) && (
                                        <Tooltip content="Convert to Full">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                color="primary"
                                                onPress={() => onConvertDraftToFull(request)}
                                                className="bg-primary-50 text-primary-600"
                                            >
                                                <FileUp className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                    {canEditEvent(request) && (
                                        <Tooltip content="Edit">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                color="warning" // Changed to match FundRequests style usually using primary/default, but orange for edit is fine or primary
                                                onPress={() => onEditRequest(request)}
                                                className="bg-warning-50 text-warning-600"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                    {canDeleteEvent(request) && (
                                        <Tooltip content="Delete" color="danger">
                                            <Button
                                                isIconOnly
                                                size="sm"
                                                variant="flat"
                                                color="danger"
                                                onPress={() => onDeleteRequest(request.id, request.name)}
                                                className="bg-danger-50 text-danger-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </Tooltip>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onPress={() => onViewRequest(request)}
                                        endContent={<Eye className="w-3.5 h-3.5" />}
                                        className="font-medium text-default-500"
                                    >
                                        Details
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                );
            })}
        </div>
    );
}
