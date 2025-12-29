import React from 'react';
import { Calendar, Eye, Users } from 'lucide-react';
import { Card, CardBody } from '@heroui/react';
import type { EventStats } from './types';
import { MetricCardSkeleton } from '../../../ui/loading';
import { AttendanceMetricsSkeleton } from './AttendanceMetricsSkeleton';

interface EventManagementStatsProps {
    stats: EventStats;
    loading?: boolean;
    attendanceLoading?: boolean;
}

export function EventManagementStats({ stats, loading = false, attendanceLoading = false }: EventManagementStatsProps) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-default-200 shadow-sm bg-default-50/50">
                <CardBody className="p-4">
                    <p className="text-small text-default-500 font-medium">Total Events</p>
                    <p className="text-2xl font-semibold text-foreground mt-1">{stats.total}</p>
                </CardBody>
            </Card>

            <Card className="border border-default-200 shadow-sm bg-default-50/50">
                <CardBody className="p-4">
                    <p className="text-small text-default-500 font-medium">Published</p>
                    <p className="text-2xl font-semibold text-success-600 mt-1">{stats.published}</p>
                </CardBody>
            </Card>

            {attendanceLoading ? (
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <MetricCardSkeleton />
                    </CardBody>
                </Card>
            ) : (
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Total Attendees</p>
                        <p className="text-2xl font-semibold text-purple-600 mt-1">{stats.totalAttendees}</p>
                    </CardBody>
                </Card>
            )}

            {attendanceLoading ? (
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <MetricCardSkeleton />
                    </CardBody>
                </Card>
            ) : (
                <Card className="border border-default-200 shadow-sm bg-default-50/50">
                    <CardBody className="p-4">
                        <p className="text-small text-default-500 font-medium">Unique Attendees</p>
                        <p className="text-2xl font-semibold text-purple-600 mt-1">{stats.uniqueAttendees}</p>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}