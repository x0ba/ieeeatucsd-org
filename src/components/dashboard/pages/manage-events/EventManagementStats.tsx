import React from 'react';
import { Calendar, Eye, Users } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import type { EventStats } from './types';
import { MetricCardSkeleton } from '../../../ui/loading';

interface EventManagementStatsProps {
    stats: EventStats;
    loading?: boolean;
}

export function EventManagementStats({ stats, loading = false }: EventManagementStatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card shadow="sm" className="border border-gray-200">
                <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Events</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card shadow="sm" className="border border-gray-200">
                <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Published</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{stats.published}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Eye className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card shadow="sm" className="border border-gray-200">
                <CardBody className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Attendees</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalAttendees}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}