import React from 'react';
import { Edit, Trash2, Eye, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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
    onFileManagement: (request: EventRequest) => void;
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
    onFileManagement,
    onDeleteRequest,
    onGraphicsToggle,
    getUserName
}: EventsTableProps) {
    const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
        <th
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                <span>{children}</span>
                {(sortBy === `${field}-asc` || sortBy === `${field}-desc`) ? (
                    sortBy === `${field}-asc` ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                )}
            </div>
        </th>
    );

    const canEditEvent = (request: EventRequest) => checkCanEditEvent(request, currentUserId, currentUserRole);
    const canDeleteEvent = (request: EventRequest) => checkCanDeleteEvent(request, currentUserId, currentUserRole);

    return (
        <table className="w-full">
            <thead className="bg-gray-50">
                <tr>
                    <SortableHeader field="name">Event</SortableHeader>
                    <SortableHeader field="date">Date & Location</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requirements
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Graphics Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By & Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {eventRequests.map((request) => {
                    const StatusIcon = getStatusIcon(request.status);
                    
                    return (
                        <tr key={request.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{request.name}</div>
                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                        {request.eventDescription}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm text-gray-900">
                                        {request.startDateTime?.toDate?.()?.toLocaleDateString() || 'No date'}
                                    </div>
                                    <div className="text-sm text-gray-500">{request.location}</div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                                    <StatusIcon className="w-4 h-4" />
                                    <span className="capitalize">{request.status}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex space-x-2">
                                    {request.needsGraphics && (
                                        <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                            Graphics
                                        </span>
                                    )}
                                    {request.needsAsFunding && (
                                        <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                            Funding
                                        </span>
                                    )}
                                    {!request.needsGraphics && !request.needsAsFunding && (
                                        <span className="text-xs text-gray-400">None</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {request.needsGraphics ? (
                                    <div className="flex items-center space-x-2">
                                        {canManageGraphics(currentUserRole) ? (
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={request.graphicsCompleted || false}
                                                    onChange={(e) => onGraphicsToggle(request.id, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {request.graphicsCompleted ? 'Completed' : 'Mark Complete'}
                                                </span>
                                            </label>
                                        ) : (
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${request.graphicsCompleted
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {request.graphicsCompleted ? 'Completed' : 'Pending'}
                                            </span>
                                        )}
                                        {request.graphicsFiles && request.graphicsFiles.length > 0 && (
                                            <span className="text-xs text-blue-600">
                                                {request.graphicsFiles.length} file(s)
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-100 px-2 py-1 rounded">
                                        <span className="text-xs text-gray-500">No graphics needed</span>
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {getUserName(request.requestedUser)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                    <button
                                        onClick={() => onViewRequest(request)}
                                        className="text-green-600 hover:text-green-900"
                                        title="View Request"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {canEditEvent(request) && (
                                        <button
                                            onClick={() => onFileManagement(request)}
                                            className="text-purple-600 hover:text-purple-900"
                                            title="Manage Files"
                                        >
                                            <FileText className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canEditEvent(request) && (
                                        <button
                                            onClick={() => onEditRequest(request)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Edit Request"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canDeleteEvent(request) && (
                                        <button
                                            onClick={() => onDeleteRequest(request.id, request.name)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete Request"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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

