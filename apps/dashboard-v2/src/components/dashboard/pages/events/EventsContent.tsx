import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, MapPin, Clock, Users, UserCheck, Award, FileText, Eye, Download, TrendingUp } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from "#convex/_generated/api";
import { useCurrentUser, usePublishedEvents, useUserAttendedEvents } from '../../../../hooks/useConvexAuth';
import { PublicProfileService } from '../../shared/services/publicProfile';
import { EventCardSkeleton, MetricCardSkeleton } from '../../../ui/loading';
import { showToast } from '../../shared/utils/toast';
import {
    Card,
    CardBody,
    Button,
    Input,
    Tabs,
    Tab,
    Chip,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Divider,
    Pagination
} from "@heroui/react";

interface Event {
    id: string;
    eventName: string;
    eventDescription: string;
    location: string;
    startDate: number;
    endDate: number;
    pointsToReward: number;
    published?: boolean;
    capacity?: number;
    eventCode: string;
    hasFood?: boolean;
    files?: string[];
    eventType?: string;
}

interface UserStats {
    lastEventAttended?: string;
    eventsAttended: number;
    totalPointsEarned: number;
    totalEventsAttended: number;
}

export default function EventsContent() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    
    const currentUser = useCurrentUser();
    const authUserId = currentUser?.authUserId || '';
    
    const events = mounted ? usePublishedEvents() || [] : [];
    const attendedEvents = mounted && authUserId ? useUserAttendedEvents(authUserId) || [] : [];
    
    const [userStats, setUserStats] = useState<UserStats>({
        lastEventAttended: 'None',
        eventsAttended: 0,
        totalPointsEarned: 0,
        totalEventsAttended: 0
    });
    const [eventsLoading, setEventsLoading] = useState(true);
    const [userStatsLoading, setUserStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [checkedInEvents, setCheckedInEvents] = useState<Set<string>>(new Set());
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Pagination states
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [pastPage, setPastPage] = useState(1);
    const rowsPerPage = 9;

    const checkInUser = useMutation(api.events.checkInUser);
    const updateUserStats = useMutation(api.events.updateUserStats);

    // Utility function to determine if an event is currently active
    const isEventCurrentlyActive = (event: Event) => {
        if (!event.published) return false;

        const now = new Date();
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);

        return now >= startDate && now <= endDate;
    };

    // Set loading to false when data is loaded
    useEffect(() => {
        setEventsLoading(false);
    }, [events]);

    // Real-time listener for user stats
    useEffect(() => {
        if (!currentUser) {
            setUserStats({
                lastEventAttended: 'None',
                eventsAttended: 0,
                totalPointsEarned: 0,
                totalEventsAttended: 0
            });
            setUserStatsLoading(false);
            return;
        }

        setUserStatsLoading(true);
        setUserStats({
            eventsAttended: currentUser.eventsAttended || 0,
            totalPointsEarned: currentUser.points || 0,
            totalEventsAttended: currentUser.eventsAttended || 0
        });
        setUserStatsLoading(false);
    }, [currentUser]);

    // Track checked-in events
    useEffect(() => {
        const checkedInEventIds = new Set<string>(attendedEvents.map((e: any) => e.id));
        setCheckedInEvents(checkedInEventIds);
    }, [attendedEvents]);

    const handleCheckIn = async (event: Event) => {
        if (!currentUser) {
            setError('Please log in to check in');
            return;
        }

        if (!isEventCurrentlyActive(event)) {
            const now = new Date();
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);

            if (now < startDate) {
                showToast.warning(`This event hasn't started yet. Check-in opens on ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}.`);
                return;
            } else if (now > endDate) {
                showToast.warning('This event has already ended. Check-in is no longer available.');
                return;
            } else if (!event.published) {
                showToast.warning('This event is not currently available for check-in.');
                return;
            }
        }

        try {
            setCheckingIn(event.id);

            const enteredCode = prompt(`Please enter event code for "${event.eventName}":`);
            if (!enteredCode) {
                setCheckingIn(null);
                return;
            }

            if (enteredCode.toUpperCase() !== event.eventCode?.toUpperCase()) {
                showToast.error('Incorrect event code. Please try again.');
                setCheckingIn(null);
                return;
            }

            let foodPreference = '';
            if (event.hasFood) {
                foodPreference = prompt('This event has food! What would you like? (e.g., Vegetarian, Vegan, No preference, etc.)') || 'No preference';
            }

            // Check in user
            await checkInUser({
                eventId: event.id as any,
                authUserId: authUserId
            });

            // Update user stats
            const newPoints = userStats.totalPointsEarned + event.pointsToReward;
            const newEventsAttended = userStats.totalEventsAttended + 1;

            try {
                await updateUserStats({
                    authUserId: authUserId,
                    pointsEarned: event.pointsToReward
                });
            } catch (error) {
                console.error('Error updating user stats:', error);
            }

            try {
                const updateUserStats = PublicProfileService.updateUserStats();
                await updateUserStats({
                    userId: authUserId,
                    points: newPoints,
                    eventsAttended: newEventsAttended
                });
            } catch (error) {
                // Ignore public profile sync error
            }

            const message = event.hasFood && foodPreference
                ? `Successfully checked in to ${event.eventName}! You earned ${event.pointsToReward} points. Food preference: ${foodPreference}`
                : `Successfully checked in to ${event.eventName}! You earned ${event.pointsToReward} points.`;
            showToast.success(message);

        } catch (error) {
            const errorMessage = 'Failed to check in to event: ' + (error as Error).message;
            setError(errorMessage);
            showToast.error('Check-in failed', errorMessage);
        } finally {
            setCheckingIn(null);
        }
    };

    const getUpcomingEvents = () => {
        const now = new Date();
        return events.filter(event => {
            const eventDate = new Date(event.startDate);
            return eventDate >= now;
        });
    };

    const getPastEvents = () => {
        const now = new Date();
        return events.filter(event => {
            const eventDate = new Date(event.endDate);
            return eventDate < now;
        });
    };

    const getFilteredEvents = (eventsList: Event[]) => {
        if (!searchTerm) return eventsList;

        return eventsList.filter(event => {
            try {
                const searchLower = searchTerm.toLowerCase();
                return (event.eventName && event.eventName.toLowerCase().includes(searchLower)) ||
                    (event.location && event.location.toLowerCase().includes(searchLower)) ||
                    (event.eventDescription && event.eventDescription.toLowerCase().includes(searchLower));
            } catch (error) {
                return true;
            }
        });
    };

    const isUserCheckedIn = (event: Event) => {
        return currentUser && checkedInEvents.has(event.id);
    };

    const upcomingEvents = getFilteredEvents(getUpcomingEvents());
    const pastEvents = getFilteredEvents(getPastEvents());
    const loading = eventsLoading || userStatsLoading;

    const paginatedUpcomingEvents = useMemo(() => {
        const start = (upcomingPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return upcomingEvents.slice(start, end);
    }, [upcomingPage, upcomingEvents]);

    const paginatedPastEvents = useMemo(() => {
        const start = (pastPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return pastEvents.slice(start, end);
    }, [pastPage, pastEvents]);

    // Helper component for event cards
    const EventCard = ({ event, isPast = false }: { event: Event; isPast?: boolean }) => {
        const eventDate = new Date(event.startDate);
        const isActive = isEventCurrentlyActive(event);
        const checkedIn = isUserCheckedIn(event);

        return (
            <Card
                isPressable
                onPress={() => {
                    setSelectedEvent(event);
                    onOpen();
                }}
                className={`w-full h-full border-none shadow-sm hover:shadow-md transition-all duration-200 ${isPast ? 'opacity-80 hover:opacity-100' : ''}`}
            >
                <CardBody className="p-5 flex flex-col gap-4 justify-between h-full">
                    <div className="space-y-4">
                        <div className="flex justify-between items-start gap-3">
                            <h3 className="font-bold text-xl leading-tight line-clamp-2 text-default-900">{event.eventName}</h3>
                            <div className="flex-shrink-0">
                                {event.hasFood && (
                                    <Chip size="sm" variant="flat" color="warning" className="mb-1 flex items-center justify-center">Food</Chip>
                                )}
                                {isPast ? (
                                    <Chip variant="flat" size="sm" color={checkedIn ? "success" : "default"}>
                                        {checkedIn ? "Attended" : "Missed"}
                                    </Chip>
                                ) : checkedIn ? (
                                    <Chip variant="flat" size="sm" color="success" startContent={<UserCheck size={12} />}>
                                        Checked In
                                    </Chip>
                                ) : isActive && (
                                    <Chip variant="shadow" size="sm" color="primary" className="animate-pulse">
                                        Live
                                    </Chip>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-small text-default-500">
                                <Calendar size={16} className="text-default-400" />
                                <span>{eventDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span className="text-default-300">•</span>
                                <Clock size={16} className="text-default-400" />
                                <span>{eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>

                            <div className="flex items-center gap-2 text-small text-default-500">
                                <MapPin size={16} className="text-default-400" />
                                <span className="truncate">{event.location}</span>
                            </div>

                            <div className="flex items-center gap-2 text-small text-default-500">
                                <Award size={16} className="text-warning-500" />
                                <span className="font-medium text-default-600">{event.pointsToReward} Points</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                        {isPast ? (
                            <Button fullWidth size="sm" variant="flat" isDisabled className="bg-default-100 text-default-400">
                                Event Ended
                            </Button>
                        ) : checkedIn ? (
                            <Button fullWidth size="sm" color="success" variant="flat" isDisabled startContent={<UserCheck size={16} />}>
                                Checked In
                            </Button>
                        ) : isActive ? (
                            <Button
                                fullWidth
                                size="sm"
                                color="primary"
                                className="shadow-md shadow-primary/20 font-semibold"
                                isLoading={checkingIn === event.id}
                                onPress={() => handleCheckIn(event)}
                            >
                                Check In Now
                            </Button>
                        ) : (
                            <Button fullWidth size="sm" variant="bordered" isDisabled className="border-default-200">
                                Check-in Not Open
                            </Button>
                        )}
                    </div>
                </CardBody>
            </Card>
        );
    };

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-default-50/50 dark:bg-background">
            <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-default-900">Events</h1>
                        <p className="text-small text-default-500">Discover and check in to IEEE events</p>
                    </div>
                </div>

                {error && (
                    <Card className="bg-danger-50 border border-danger-100 shadow-none">
                        <CardBody className="py-3 px-4 flex flex-row items-center gap-3">
                            <div className="p-1 bg-danger-100 rounded-full text-danger">
                                <FileText size={16} />
                            </div>
                            <p className="text-danger text-small font-medium">{error}</p>
                        </CardBody>
                    </Card>
                )}

                {/* Stats Section - Compact & Nice Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {loading ? (
                        <>
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                        </>
                    ) : (
                        <>
                            <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50/50 to-white hover:shadow-md transition-all duration-300">
                                <CardBody className="p-5">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Latest Event</p>
                                        <h4 className="text-xl font-bold text-gray-900 truncate" title={userStats.lastEventAttended}>
                                            {userStats.lastEventAttended}
                                        </h4>
                                    </div>
                                </CardBody>
                            </Card>

                            <Card className="border-none shadow-sm bg-gradient-to-br from-yellow-50/50 to-white hover:shadow-md transition-all duration-300">
                                <CardBody className="p-5">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Points</p>
                                        <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-amber-600">
                                            {userStats.totalPointsEarned}
                                        </h4>
                                    </div>
                                </CardBody>
                            </Card>

                            <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50/50 to-white hover:shadow-md transition-all duration-300">
                                <CardBody className="p-5">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Events Attended</p>
                                        <h4 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                                            {userStats.totalEventsAttended}
                                        </h4>
                                    </div>
                                </CardBody>
                            </Card>
                        </>
                    )}
                </div>

                {/* Quick Check-in (Today's Events) */}
                {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const todaysEvents = events.filter(event => {
                        const eventDate = new Date(event.startDate);
                        return eventDate >= today && eventDate < tomorrow;
                    });

                    if (todaysEvents.length > 0) {
                        return (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary-100 rounded-lg text-primary">
                                        <UserCheck size={18} />
                                    </div>
                                    <h2 className="text-lg font-bold">Happening Today</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {todaysEvents.map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Search Bar Repositioned & More Visible */}
                <div className="w-full">
                    <Input
                        classNames={{
                            base: "w-full",
                            inputWrapper: "h-12 bg-content1 shadow-md border-default-200 hover:border-primary focus-within:border-primary transition-colors",
                            input: "text-base",
                        }}
                        placeholder="Search events by name, location, or description..."
                        size="lg"
                        startContent={<Search size={20} className="text-default-400" />}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                        isClearable
                        onClear={() => setSearchTerm('')}
                    />
                </div>

                {/* Events Lists */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <EventCardSkeleton />
                        <EventCardSkeleton />
                        <EventCardSkeleton />
                    </div>
                ) : (
                    <Tabs
                        aria-label="Events"
                        color="primary"
                        variant="underlined"
                        classNames={{
                            base: "w-full",
                            tabList: "gap-0 w-full relative rounded-none p-0 border-b border-divider flex",
                            cursor: "w-full bg-primary",
                            tab: "flex-1 h-12 text-base",
                            tabContent: "group-data-[selected=true]:text-primary font-medium"
                        }}
                    >
                        <Tab
                            key="upcoming"
                            title={
                                <div className="flex items-center justify-center gap-2 w-full">
                                    <span>Upcoming Events</span>
                                    <Chip size="sm" variant="flat" color="primary">{upcomingEvents.length}</Chip>
                                </div>
                            }
                        >
                            <div className="flex flex-col gap-6 mt-6">
                                {paginatedUpcomingEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-default-400 bg-content1 rounded-large border border-dashed border-divider">
                                        <Calendar size={48} className="mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No upcoming events found</p>
                                        <p className="text-sm">Check back later for new events!</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {paginatedUpcomingEvents.map(event => <EventCard key={event.id} event={event} />)}
                                        </div>
                                        {upcomingEvents.length > rowsPerPage && (
                                            <div className="flex justify-center mt-4">
                                                <Pagination
                                                    total={Math.ceil(upcomingEvents.length / rowsPerPage)}
                                                    page={upcomingPage}
                                                    onChange={setUpcomingPage}
                                                    showControls
                                                    color="primary"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Tab>
                        <Tab
                            key="past"
                            title={
                                <div className="flex items-center justify-center gap-2 w-full">
                                    <span>Past Events</span>
                                    <Chip size="sm" variant="flat">{pastEvents.length}</Chip>
                                </div>
                            }
                        >
                            <div className="flex flex-col gap-6 mt-6">
                                {paginatedPastEvents.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-default-400 bg-content1 rounded-large border border-dashed border-divider">
                                        <Calendar size={48} className="mb-4 opacity-50" />
                                        <p className="text-lg font-medium">No past events found</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {paginatedPastEvents.map(event => <EventCard key={event.id} event={event} isPast />)}
                                        </div>
                                        {pastEvents.length > rowsPerPage && (
                                            <div className="flex justify-center mt-4">
                                                <Pagination
                                                    total={Math.ceil(pastEvents.length / rowsPerPage)}
                                                    page={pastPage}
                                                    onChange={setPastPage}
                                                    showControls
                                                    color="primary"
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </Tab>
                    </Tabs>
                )}
            </main>

            {/* Event Details Modal */}
            <Modal
                isOpen={isOpen || !!selectedEvent}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedEvent(null);
                        onClose();
                    } else {
                        onOpen();
                    }
                }}
                size="2xl"
                scrollBehavior="inside"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => {
                        // Calculate status for modal
                        let modalStatus: 'live' | 'upcoming' | 'ended' = 'ended';
                        if (selectedEvent) {
                            if (isEventCurrentlyActive(selectedEvent)) {
                                modalStatus = 'live';
                            } else {
                                const now = new Date();
                                const startDate = new Date(selectedEvent.startDate);
                                if (now < startDate) {
                                    modalStatus = 'upcoming';
                                }
                            }
                        }

                        return (
                            <>
                                <ModalHeader className="flex flex-col gap-1 border-b border-divider">
                                    <h2 className="text-2xl font-bold">{selectedEvent?.eventName}</h2>
                                    {selectedEvent && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Chip size="sm" variant="flat" color="primary" startContent={<Award size={14} />}>
                                                {selectedEvent.pointsToReward} Points
                                            </Chip>
                                            {selectedEvent.hasFood && (
                                                <Chip size="sm" variant="flat" color="warning">Food Provided</Chip>
                                            )}
                                            {modalStatus === 'live' ? (
                                                <Chip size="sm" variant="flat" color="success" className="animate-pulse">Live Now</Chip>
                                            ) : modalStatus === 'upcoming' ? (
                                                <Chip size="sm" variant="flat" color="primary">Upcoming</Chip>
                                            ) : (
                                                <Chip size="sm" variant="flat" color="default">Ended</Chip>
                                            )}
                                        </div>
                                    )}
                                </ModalHeader>
                                <ModalBody className="py-6">
                                    {selectedEvent && (
                                        <div className="space-y-8">
                                            {/* Description */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-2">About Event</h3>
                                                <div className="p-4 bg-default-50 rounded-large">
                                                    <p className="text-default-700 whitespace-pre-wrap leading-relaxed">
                                                        {selectedEvent.eventDescription || 'No description available.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-2">When</h3>
                                                        <div className="flex items-center gap-3 text-default-900 bg-default-50 p-3 rounded-lg">
                                                            <Clock size={20} className="text-primary" />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{new Date(selectedEvent.startDate).toLocaleDateString()}</span>
                                                                <span className="text-tiny text-default-500">
                                                                    {new Date(selectedEvent.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-2">Where</h3>
                                                        <div className="flex items-center gap-3 text-default-900 bg-default-50 p-3 rounded-lg">
                                                            <MapPin size={20} className="text-primary" />
                                                            <span className="font-medium">{selectedEvent.location}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attendance Stats */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-2">Attendance</h3>
                                                <div className="flex items-center gap-3 text-default-900 bg-default-50 p-3 rounded-lg">
                                                    <Users size={20} className="text-primary" />
                                                    <span className="font-medium">
                                                        {checkedInEvents.size || 0} checked in
                                                        {selectedEvent.capacity ? ` / ${selectedEvent.capacity} capacity` : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Files Section */}
                                            {selectedEvent.files && selectedEvent.files.length > 0 && (
                                                <>
                                                    <Divider />
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-default-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                            Event Resources
                                                        </h3>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {selectedEvent.files.map((fileUrl, index) => {
                                                                const fileName = `Event File ${index + 1}`;
                                                                const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
                                                                const isPdf = /\.pdf$/i.test(fileUrl);

                                                                return (
                                                                    <Card key={index} isPressable onPress={() => window.open(fileUrl, '_blank')} className="border-default-200 border shadow-sm hover:border-primary transition-colors">
                                                                        <CardBody className="p-3 flex flex-row items-center gap-3">
                                                                            <div className={`p-2.5 rounded-lg ${isPdf ? 'bg-danger-100 text-danger' : isImage ? 'bg-secondary-100 text-secondary' : 'bg-primary-100 text-primary'}`}>
                                                                                {isImage ? <Eye size={20} /> : <FileText size={20} />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium truncate">{fileName}</p>
                                                                                <p className="text-tiny text-default-400">{isPdf ? 'PDF Document' : isImage ? 'Image File' : 'Resource'}</p>
                                                                            </div>
                                                                            <Button isIconOnly size="sm" variant="light" onPress={() => window.open(fileUrl, '_blank')}>
                                                                                <Download size={16} />
                                                                            </Button>
                                                                        </CardBody>
                                                                    </Card>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </ModalBody>
                                <ModalFooter className="border-t border-divider">
                                    <Button variant="flat" onPress={onClose}>
                                        Close
                                    </Button>
                                    {selectedEvent && !isUserCheckedIn(selectedEvent) && isEventCurrentlyActive(selectedEvent) && (
                                        <Button
                                            color="primary"
                                            onPress={() => {
                                                handleCheckIn(selectedEvent);
                                                onClose();
                                            }}
                                            isLoading={checkingIn === selectedEvent.id}
                                            startContent={<UserCheck size={18} />}
                                        >
                                            Check In Now
                                        </Button>
                                    )}
                                </ModalFooter>
                            </>
                        );
                    }}
                </ModalContent>
            </Modal>
        </div>
    );
}
