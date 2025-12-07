import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, Users, Award, TrendingUp, Clock, CheckCircle, DollarSign, Plus, Eye, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Avatar, Divider, Skeleton } from '@heroui/react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../../../firebase/client';
import type { User as UserType } from '../../shared/types/firestore';
import PointsChart from './PointsChart';

interface UserStats {
    totalPoints: number;
    eventsAttended: number;
    reimbursementsSubmitted: number;
    reimbursementsApproved: number;
    lastEventAttended: string;
    rank: number;
    totalMembers: number;
}

interface RecentActivity {
    id: string;
    type: 'event' | 'reimbursement' | 'achievement';
    title: string;
    description: string;
    date: any;
    points?: number;
}

export default function OverviewContent() {
    const [user] = useAuthState(auth);
    const [userData, setUserData] = useState<UserType | null>(null);
    const [userStats, setUserStats] = useState<UserStats>({
        totalPoints: 0,
        eventsAttended: 0,
        reimbursementsSubmitted: 0,
        reimbursementsApproved: 0,
        lastEventAttended: 'None',
        rank: 0,
        totalMembers: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
    const [pointsHistory, setPointsHistory] = useState<{ date: Date; points: number; cumulative: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Set up real-time listener for user data
        const unsubscribeUser = onSnapshot(
            doc(db, 'users', user.uid),
            (userDoc) => {
                if (userDoc.exists()) {
                    const data = userDoc.data() as UserType;
                    setUserData(data);
                    setUserStats(prev => ({
                        ...prev,
                        totalPoints: data.points || 0,
                        eventsAttended: data.eventsAttended || 0
                    }));
                }
            },
            (error) => {
                console.error('Error fetching user data:', error);
            }
        );

        // Fetch leaderboard data
        const publicProfilesQuery = query(
            collection(db, 'public_profiles'),
            orderBy('points', 'desc')
        );

        const unsubscribeRanking = onSnapshot(publicProfilesQuery, (snapshot) => {
            const profiles = snapshot.docs.map((doc, index) => ({
                id: doc.id,
                rank: index + 1,
                name: doc.data().name,
                points: doc.data().points || 0
            }));
            const validProfiles = profiles.filter(p => p.name && p.name !== 'Unknown User' && p.name.trim() !== '');
            const currentUserProfile = validProfiles.find(p => p.id === user.uid);

            setUserStats(prev => ({
                ...prev,
                rank: currentUserProfile?.rank || 0,
                totalMembers: validProfiles.length
            }));
        });

        // Fetch upcoming events
        const eventsQuery = query(
            collection(db, 'events'),
            where('published', '==', true),
            orderBy('startDate', 'asc'),
            limit(3)
        );

        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const now = new Date();
            const upcoming = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((event: any) => {
                    const startDate = event.startDate?.toDate ? event.startDate.toDate() : new Date(event.startDate);
                    return startDate > now;
                });
            setUpcomingEvents(upcoming);
        });

        // Combined fetch for activities (Reimbursements + Attended Events)
        const attendedEventsQuery = query(
            collectionGroup(db, 'attendees'),
            where('userId', '==', user.uid)
        );

        const reimbursementsQuery = query(
            collection(db, 'reimbursements'),
            where('submittedBy', '==', user.uid)
        );

        let localReimbursements: any[] = [];
        let localAttendedEvents: any[] = [];

        const updateCombinedActivity = () => {
            // Process Reimbursements
            const reimbursementActivities: RecentActivity[] = localReimbursements.map((r: any, index) => ({
                id: `reimbursement-${r.id || index}`,
                type: 'reimbursement',
                title: `Reimbursement ${r.status === 'approved' ? 'Approved' : r.status === 'paid' ? 'Paid' : 'Submitted'}`,
                description: r.title || 'Reimbursement request',
                date: r.submittedAt
            }));

            // Process Events
            const eventActivities: RecentActivity[] = localAttendedEvents.map((e: any) => ({
                id: `event-${e.id}`,
                type: 'event',
                title: 'Attended Event',
                description: e.eventName || 'Event',
                date: e.startDate, 
                points: e.pointsToReward || 0
            }));

            // Combine and Sort
            const allActivities = [...reimbursementActivities, ...eventActivities].sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime();
            });

            setRecentActivity(allActivities.slice(0, 5));

            // Calculate Points History
            // 1. Determine Start Date (Account Creation)
            const creationTime = user?.metadata.creationTime;
            const creationDate = creationTime ? new Date(creationTime) : new Date();

            // 2. Determine End Date (Last Event Check-in)
            let lastEventDate: Date | null = null;
            if (localAttendedEvents.length > 0) {
                const sortedEvents = [...localAttendedEvents].sort((a, b) => {
                    const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
                    const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
                    return dateB.getTime() - dateA.getTime();
                });
                const lastEvent = sortedEvents[0];
                lastEventDate = lastEvent.startDate?.toDate ? lastEvent.startDate.toDate() : new Date(lastEvent.startDate);
            }

            // 3. Build History
            const chronologicalActivities = [...allActivities].reverse();
            let runningTotal = 0;
            
            // Start with initial point at creation time
            let history = [{
                date: creationDate,
                points: 0,
                cumulative: 0
            }];

            chronologicalActivities.forEach(a => {
                const activityDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                // Ensure we don't add points before creation (data integrity check)
                if (activityDate >= creationDate) {
                    runningTotal += (a.points || 0);
                    history.push({
                        date: activityDate,
                        points: a.points || 0,
                        cumulative: runningTotal
                    });
                }
            });

            setPointsHistory(history);
            
            // Update stats
            const submitted = localReimbursements.length;
            const approved = localReimbursements.filter((r: any) => r.status === 'approved' || r.status === 'paid').length;
            
            setUserStats(prev => ({
                ...prev,
                eventsAttended: localAttendedEvents.length,
                reimbursementsSubmitted: submitted,
                reimbursementsApproved: approved
            }));
            
            setLoading(false);
        };

        const unsubscribeReimbursements = onSnapshot(reimbursementsQuery, (snapshot) => {
            localReimbursements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateCombinedActivity();
        });

        const unsubscribeAttendedEvents = onSnapshot(attendedEventsQuery, async (snapshot) => {
            const eventIds = snapshot.docs.map(doc => doc.ref.parent.parent!.id);
            const uniqueEventIds = [...new Set(eventIds)];
            
            // Fetch actual event data for each event ID
            const eventPromises = uniqueEventIds.map(id => getDoc(doc(db, 'events', id)));
            const eventDocs = await Promise.all(eventPromises);
            
            localAttendedEvents = eventDocs
                .filter(doc => doc.exists())
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((event: any) => event.published === true);
            
            updateCombinedActivity();
        });

        return () => {
            unsubscribeUser();
            unsubscribeRanking();
            unsubscribeEvents();
            unsubscribeReimbursements();
            unsubscribeAttendedEvents();
        };
    }, [user]);

    const quickActions = [
        {
            title: 'Reimbursement',
            icon: CreditCard,
            href: '/dashboard/reimbursement',
            color: 'bg-green-100 text-green-600'
        },
        {
            title: 'Events',
            icon: Calendar,
            href: '/dashboard/events',
            color: 'bg-blue-100 text-blue-600'
        },
        {
            title: 'Leaderboard',
            icon: Award,
            href: '/dashboard/leaderboard',
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            title: 'Profile',
            icon: Users,
            href: '/dashboard/settings',
            color: 'bg-purple-100 text-purple-600'
        }
    ];

    return (
        <div className="flex-1 overflow-auto">
            <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* Header Section: Welcome + Key Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Welcome Card - Spans 2 columns */}
                    <Card className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white border-none shadow-md">
                        <CardBody className="p-6 flex flex-row items-center justify-between">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                                    Welcome, {userData?.name?.split(' ')[0] || 'Member'}!
                                </h1>
                                <p className="text-blue-100 text-sm md:text-base">
                                    You've earned <span className="font-bold text-white">{userStats.totalPoints} points</span> and attended <span className="font-bold text-white">{userStats.eventsAttended} events</span> this year.
                                </p>
                            </div>
                            <div className="hidden sm:block">
                                <Avatar
                                    icon={<Award className="w-8 h-8" />}
                                    className="w-16 h-16 bg-white/20 text-white"
                                />
                            </div>
                        </CardBody>
                    </Card>

                    {/* Rank Card - Compact */}
                    <Card className="bg-white border border-gray-100 shadow-sm">
                        <CardBody className="p-6 flex flex-col justify-center items-center text-center">
                            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Current Rank</p>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-bold text-gray-900">#{userStats.rank || '-'}</span>
                                <span className="text-gray-400 text-sm">/ {userStats.totalMembers}</span>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <Chip size="sm" variant="flat" color="primary" className="text-xs">
                                    Top {userStats.totalMembers > 0 ? Math.ceil((userStats.rank / userStats.totalMembers) * 100) : 0}%
                                </Chip>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Quick Actions Bar - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quickActions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={index}
                                as="a"
                                href={action.href}
                                variant="flat"
                                className="bg-white hover:bg-gray-50 border border-gray-200 h-auto py-3 px-4 justify-start gap-3 shadow-sm"
                            >
                                <div className={`p-2 rounded-lg ${action.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-gray-700">{action.title}</span>
                            </Button>
                        );
                    })}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Left Column (2/3 width on large screens) */}
                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                        {/* Points Chart - Only show if we have data */}
                        {pointsHistory.length > 1 && (
                            <div className="w-full h-[280px]">
                                <PointsChart data={pointsHistory} />
                            </div>
                        )}

                        {/* Upcoming Events - Compact List */}
                        <Card className="w-full border border-gray-200" shadow="none">
                            <CardHeader className="pb-0 pt-4 px-5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-base font-semibold text-gray-900">Upcoming Events</h2>
                                </div>
                                <Button
                                    as="a"
                                    href="/dashboard/events"
                                    variant="light"
                                    color="primary"
                                    size="sm"
                                    className="h-8 min-w-0 px-2"
                                >
                                    View all
                                </Button>
                            </CardHeader>
                            <CardBody className="p-5 pt-3">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(2)].map((_, i) => (
                                            <Skeleton key={i} className="w-full h-16 rounded-lg" />
                                        ))}
                                    </div>
                                ) : upcomingEvents.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500 text-sm">
                                        No upcoming events scheduled
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {upcomingEvents.slice(0, 3).map((event: any) => (
                                            <div 
                                                key={event.id} 
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-100"
                                                onClick={() => window.location.href = '/dashboard/events'}
                                            >
                                                <div className="flex-shrink-0 w-12 text-center bg-blue-50 rounded-md p-1">
                                                    <div className="text-xs text-blue-600 font-bold uppercase">
                                                        {event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString(undefined, { month: 'short' }) : 'TBD'}
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900 leading-none">
                                                        {event.startDate?.toDate ? event.startDate.toDate().getDate() : '--'}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 text-sm truncate">
                                                        {event.eventName}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <Clock className="w-3 h-3" />
                                                        {event.startDate?.toDate ? event.startDate.toDate().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'TBD'}
                                                    </div>
                                                </div>
                                                {event.pointsToReward > 0 && (
                                                    <Chip size="sm" variant="flat" color="success" className="h-6 text-xs">
                                                        +{event.pointsToReward}
                                                    </Chip>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>

                    {/* Right Column: Recent Activity */}
                    <div className="space-y-6">
                        <Card className="w-full border border-gray-200 h-full" shadow="none">
                            <CardHeader className="pb-0 pt-4 px-5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-gray-500" />
                                    <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
                                </div>
                            </CardHeader>
                            <CardBody className="p-5 pt-3">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="flex gap-3">
                                                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="w-3/4 h-3 rounded" />
                                                    <Skeleton className="w-1/2 h-2 rounded" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : recentActivity.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No recent activity found
                                    </div>
                                ) : (
                                    <div className="relative space-y-0">
                                        {/* Vertical Line */}
                                        <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />
                                        
                                        {recentActivity.map((activity, index) => {
                                            const config = {
                                                event: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                                                reimbursement: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                                                achievement: { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' }
                                            }[activity.type];
                                            
                                            const Icon = config.icon;

                                            return (
                                                <div key={activity.id} className="relative flex gap-4 py-3 group">
                                                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center border-2 border-white ring-1 ring-gray-100`}>
                                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {activity.title}
                                                            </p>
                                                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                                                {activity.date?.toDate ? activity.date.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {activity.description}
                                                        </p>
                                                        {activity.points && (
                                                            <span className="inline-flex items-center text-xs font-medium text-green-600 mt-1">
                                                                <Plus className="w-3 h-3 mr-0.5" /> {activity.points} points
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}