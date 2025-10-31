import React, { useMemo, useState } from 'react';
import { Card, CardBody, Button } from '@heroui/react';
import { Users } from 'lucide-react';
import AttendeeTable from './AttendeeTable';
import type { AttendeeRecord, UserDirectory } from './types';
import { getUserName } from './utils';

interface AttendeesTabProps {
    attendees: AttendeeRecord[];
    loadingAttendees: boolean;
    users: UserDirectory;
}

export default function AttendeesTab({ attendees, loadingAttendees, users }: AttendeesTabProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAttendees = useMemo(() => {
        if (!searchTerm) return attendees;
        const lowered = searchTerm.toLowerCase();
        return attendees.filter(attendee => {
            const attendeeId = (attendee.userId || attendee.id || '').toLowerCase();
            const attendeeName = (getUserName(users, attendee.userId || attendee.id || '') || '').toLowerCase();
            const food = (attendee.food || '').toLowerCase();
            const email = (users[attendee.userId || attendee.id || '']?.email || '').toLowerCase();
            return attendeeId.includes(lowered) || attendeeName.includes(lowered) || food.includes(lowered) || email.includes(lowered);
        });
    }, [attendees, users, searchTerm]);

    const totalPoints = attendees.reduce((sum, attendee) => sum + (attendee.pointsEarned || 0), 0);
    const foodPreferences = attendees.filter(attendee => attendee.food).length;

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-purple-600" />
                        Event Attendees ({filteredAttendees.length})
                    </h3>
                    {attendees.length > 0 && (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search attendees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                            />
                            <Users className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    )}
                </div>
                {loadingAttendees ? (
                    <div className="text-center py-4">
                        <p className="text-gray-500">Loading attendees...</p>
                    </div>
                ) : attendees.length > 0 ? (
                    <div className="space-y-4">
                        <Card shadow="sm" className="border border-purple-200 bg-purple-50">
                            <CardBody className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-purple-800">Total Attendees:</span>
                                        <p className="text-purple-700 text-lg font-semibold">{attendees.length}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-purple-800">Total Points Awarded:</span>
                                        <p className="text-purple-700 text-lg font-semibold">{totalPoints}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-purple-800">Food Preferences:</span>
                                        <p className="text-purple-700 text-lg font-semibold">{foodPreferences} specified</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                        <Card shadow="sm" className="border border-gray-200">
                            <CardBody className="p-0">
                                <AttendeeTable attendees={filteredAttendees} users={users} />
                            </CardBody>
                        </Card>

                        {filteredAttendees.length === 0 && searchTerm && (
                            <Card shadow="sm" className="border border-gray-200">
                                <CardBody className="text-center py-8">
                                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500">No attendees match your search</p>
                                    <Button
                                        size="sm"
                                        color="primary"
                                        variant="light"
                                        onPress={() => setSearchTerm('')}
                                        className="mt-2"
                                    >
                                        Clear search
                                    </Button>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No attendees have checked in yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
