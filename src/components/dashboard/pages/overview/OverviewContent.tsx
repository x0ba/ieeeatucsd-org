import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, Users, Award, TrendingUp, Clock, CheckCircle, DollarSign, Plus, Eye, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Avatar, Divider, Skeleton } from '@heroui/react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../../../firebase/client';
import DashboardHeader from '../../shared/DashboardHeader';
import type { User as UserType } from '../../shared/types/firestore';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Fetch user data
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data() as UserType;
                    setUserData(data);
                    setUserStats(prev => ({
                        ...prev,
                        totalPoints: data.points || 0,
                        eventsAttended: data.eventsAttended || 0
                    }));
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();

        // Set up real-time listener for leaderboard ranking with delay to ensure auth is ready
        const timeoutId = setTimeout(() => {
            if (!user?.uid) return;

            console.log('Setting up ranking listener for user:', user.uid);

            const publicProfilesQuery = query(
                collection(db, 'public_profiles'),
                orderBy('points', 'desc')
            );

            const unsubscribeRanking = onSnapshot(publicProfilesQuery, (snapshot) => {
                console.log('Ranking snapshot received:', snapshot.size, 'documents');
                const profiles = snapshot.docs.map((doc, index) => ({
                    id: doc.id,
                    rank: index + 1,
                    name: doc.data().name,
                    points: doc.data().points || 0
                }));

                // Filter out users with invalid names
                const validProfiles = profiles.filter(p => p.name && p.name !== 'Unknown User' && p.name.trim() !== '');

                // Find current user's rank
                const currentUserProfile = validProfiles.find(p => p.id === user.uid);
                const currentUserRank = currentUserProfile?.rank || 0;
                const totalMembers = validProfiles.length;

                setUserStats(prev => ({
                    ...prev,
                    rank: currentUserRank,
                    totalMembers: totalMembers
                }));
            }, (error) => {
                console.error('Error in ranking listener:', error);
                // Don't break the component if ranking fails
                setUserStats(prev => ({
                    ...prev,
                    rank: 0,
                    totalMembers: 0
                }));
            });

            // Store the unsubscribe function to clean up later
            (window as any).__rankingUnsubscribe = unsubscribeRanking;
        }, 1000); // 1 second delay to ensure auth is fully ready

        return () => {
            clearTimeout(timeoutId);
            if ((window as any).__rankingUnsubscribe) {
                (window as any).__rankingUnsubscribe();
                delete (window as any).__rankingUnsubscribe;
            }
        };
    }, [user, db]);

    useEffect(() => {
        if (!user) return;

        // Fetch upcoming events
        const eventsQuery = query(
            collection(db, 'events'),
            where('published', '==', true),
            orderBy('startDate', 'asc'),
            limit(3)
        );

        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter for upcoming events
            const now = new Date();
            const upcoming = events.filter((event: any) => {
                const startDate = event.startDate?.toDate ? event.startDate.toDate() : new Date(event.startDate);
                return startDate > now;
            });

            setUpcomingEvents(upcoming);
        });

        // Fetch reimbursements for stats
        const reimbursementsQuery = query(
            collection(db, 'reimbursements'),
            where('submittedBy', '==', user.uid),
            orderBy('submittedAt', 'desc')
        );

        const unsubscribeReimbursements = onSnapshot(reimbursementsQuery, (snapshot) => {
            const reimbursements = snapshot.docs.map(doc => doc.data());
            const submitted = reimbursements.length;
            const approved = reimbursements.filter((r: any) => r.status === 'approved' || r.status === 'paid').length;

            setUserStats(prev => ({
                ...prev,
                reimbursementsSubmitted: submitted,
                reimbursementsApproved: approved
            }));

            // Create recent activity from reimbursements
            const reimbursementActivity: RecentActivity[] = reimbursements.slice(0, 3).map((r: any, index) => ({
                id: `reimbursement-${index}`,
                type: 'reimbursement' as const,
                title: `Reimbursement ${r.status === 'approved' ? 'Approved' : r.status === 'paid' ? 'Paid' : 'Submitted'}`,
                description: r.title || 'Reimbursement request',
                date: r.submittedAt,
                points: r.status === 'paid' ? 10 : 0
            }));

            setRecentActivity(reimbursementActivity);
        });

        setLoading(false);

        return () => {
            unsubscribeEvents();
            unsubscribeReimbursements();
        };
    }, [user, db]);

    const quickActions = [
        {
            title: 'Submit Reimbursement',
            description: 'Request reimbursement for expenses',
            icon: CreditCard,
            href: '/dashboard/reimbursement',
            color: 'bg-green-100 text-green-600'
        },
        {
            title: 'View Events',
            description: 'Check in to upcoming events',
            icon: Calendar,
            href: '/dashboard/events',
            color: 'bg-blue-100 text-blue-600'
        },
        {
            title: 'View Leaderboard',
            description: 'See your ranking and points',
            icon: Award,
            href: '/dashboard/leaderboard',
            color: 'bg-yellow-100 text-yellow-600'
        },
        {
            title: 'Update Profile',
            description: 'Manage your account settings',
            icon: Users,
            href: '/dashboard/settings',
            color: 'bg-purple-100 text-purple-600'
        }
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="flex-1 overflow-auto">
            <DashboardHeader
                title="Overview"
                subtitle={`${getGreeting()}, ${userData?.name || 'Member'}! Here's your IEEE UCSD activity summary.`}
                showSearch={false}
            />

            <main className="p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 gap-6 md:gap-8 max-w-7xl mx-auto">
                    {/* Welcome Banner */}
                    <Card
                        className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border-none"
                        shadow="lg"
                    >
                        <CardBody className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <Avatar
                                        icon={<Award className="w-6 h-6" />}
                                        className="bg-white/20 text-white hidden sm:flex flex-shrink-0"
                                        size="lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
                                            Welcome back, {userData?.name?.split(' ')[0] || 'Member'}!
                                        </h2>
                                        <p className="text-sm md:text-base text-blue-100 leading-relaxed">
                                            You have <span className="font-semibold text-white">{userStats.totalPoints} points</span> and have attended{' '}
                                            <span className="font-semibold text-white">{userStats.eventsAttended} events</span>.
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden lg:flex items-center justify-center">
                                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                        <Award className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {loading ? (
                            <>
                                {[...Array(4)].map((_, i) => (
                                    <Card key={i} className="w-full" shadow="sm">
                                        <CardBody className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 space-y-3">
                                                    <Skeleton className="w-24 h-4 rounded-lg" />
                                                    <Skeleton className="w-16 h-8 rounded-lg" />
                                                    <Skeleton className="w-20 h-3 rounded-lg" />
                                                </div>
                                                <Skeleton className="w-12 h-12 rounded-full" />
                                            </div>
                                        </CardBody>
                                    </Card>
                                ))}
                            </>
                        ) : (
                            <>
                                <Card className="w-full hover:shadow-md transition-shadow" shadow="sm" isPressable>
                                    <CardBody className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Total Points</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 leading-tight">
                                                    {userStats.totalPoints}
                                                </p>
                                            </div>
                                            <Avatar
                                                icon={<Award className="w-6 h-6" />}
                                                className="bg-yellow-100 text-yellow-600 flex-shrink-0"
                                                size="lg"
                                            />
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card className="w-full hover:shadow-md transition-shadow" shadow="sm" isPressable>
                                    <CardBody className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Events Attended</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 leading-tight">
                                                    {userStats.eventsAttended}
                                                </p>
                                            </div>
                                            <Avatar
                                                icon={<Calendar className="w-6 h-6" />}
                                                className="bg-blue-100 text-blue-600 flex-shrink-0"
                                                size="lg"
                                            />
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card className="w-full hover:shadow-md transition-shadow" shadow="sm" isPressable>
                                    <CardBody className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Reimbursements</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 leading-tight">
                                                    {userStats.reimbursementsSubmitted}
                                                </p>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    {userStats.reimbursementsApproved} approved
                                                </p>
                                            </div>
                                            <Avatar
                                                icon={<DollarSign className="w-6 h-6" />}
                                                className="bg-green-100 text-green-600 flex-shrink-0"
                                                size="lg"
                                            />
                                        </div>
                                    </CardBody>
                                </Card>

                                <Card className="w-full hover:shadow-md transition-shadow" shadow="sm" isPressable>
                                    <CardBody className="p-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-600 mb-1">Member Rank</p>
                                                <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 leading-tight">
                                                    #{userStats.rank || 'N/A'}
                                                </p>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    of {userStats.totalMembers} members
                                                </p>
                                            </div>
                                            <Avatar
                                                icon={<TrendingUp className="w-6 h-6" />}
                                                className="bg-purple-100 text-purple-600 flex-shrink-0"
                                                size="lg"
                                            />
                                        </div>
                                    </CardBody>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <Card className="w-full" shadow="sm">
                        <CardHeader className="pb-0 pt-6 px-6">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900">Quick Actions</h2>
                        </CardHeader>
                        <CardBody className="p-6 pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {quickActions.map((action, index) => {
                                    const IconComponent = action.icon;

                                    return (
                                        <Card
                                            key={index}
                                            as="a"
                                            href={action.href}
                                            isPressable
                                            isHoverable
                                            className="border border-gray-200 h-full"
                                            shadow="none"
                                        >
                                            <CardBody className="p-5 flex items-start justify-start">
                                                <div className="flex items-start gap-4 w-full">
                                                    <div className="flex-shrink-0 mt-0.5">
                                                        <Avatar
                                                            icon={<IconComponent className="w-5 h-5" />}
                                                            className={action.color}
                                                            size="md"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                        <p className="font-semibold text-gray-900 text-sm md:text-base leading-snug">
                                                            {action.title}
                                                        </p>
                                                        <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                                                            {action.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        {/* Upcoming Events */}
                        <Card className="w-full" shadow="sm">
                            <CardHeader className="pb-0 pt-6 px-6 flex justify-between items-center">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900">Upcoming Events</h2>
                                <Button
                                    as="a"
                                    href="/dashboard/events"
                                    variant="light"
                                    color="primary"
                                    size="sm"
                                    className="font-medium"
                                >
                                    View all →
                                </Button>
                            </CardHeader>
                            <CardBody className="p-6 pt-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <Card key={i} className="w-full border border-gray-100" shadow="none">
                                                <CardBody className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="w-12 h-12 rounded-lg" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="w-3/4 h-4 rounded-lg" />
                                                            <Skeleton className="w-1/2 h-3 rounded-lg" />
                                                        </div>
                                                        <Skeleton className="w-16 h-6 rounded-full" />
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : upcomingEvents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Avatar
                                            icon={<Calendar className="w-8 h-8" />}
                                            className="bg-gray-100 text-gray-400 mx-auto mb-4"
                                            size="lg"
                                        />
                                        <p className="text-base text-gray-500 leading-relaxed">No upcoming events</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.slice(0, 3).map((event: any) => (
                                            <Card key={event.id} className="w-full border border-gray-100" shadow="none" isPressable>
                                                <CardBody className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            icon={<Calendar className="w-5 h-5" />}
                                                            className="bg-blue-100 text-blue-600 flex-shrink-0"
                                                            size="md"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 text-sm md:text-base truncate leading-tight mb-1">
                                                                {event.eventName}
                                                            </p>
                                                            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                                                                {event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'TBD'}
                                                            </p>
                                                        </div>
                                                        <Chip
                                                            color="success"
                                                            variant="flat"
                                                            size="sm"
                                                            className="flex-shrink-0"
                                                        >
                                                            +{event.pointsToReward || 0} pts
                                                        </Chip>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardBody>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="w-full" shadow="sm">
                            <CardHeader className="pb-0 pt-6 px-6">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900">Recent Activity</h2>
                            </CardHeader>
                            <CardBody className="p-6 pt-4">
                                {loading ? (
                                    <div className="space-y-3">
                                        {[...Array(3)].map((_, i) => (
                                            <Card key={i} className="w-full border border-gray-100" shadow="none">
                                                <CardBody className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="w-10 h-10 rounded-full" />
                                                        <div className="flex-1 space-y-2">
                                                            <Skeleton className="w-3/4 h-4 rounded-lg" />
                                                            <Skeleton className="w-full h-3 rounded-lg" />
                                                            <Skeleton className="w-1/3 h-3 rounded-lg" />
                                                        </div>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                ) : recentActivity.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Avatar
                                            icon={<Clock className="w-8 h-8" />}
                                            className="bg-gray-100 text-gray-400 mx-auto mb-4"
                                            size="lg"
                                        />
                                        <p className="text-base text-gray-500 leading-relaxed">No recent activity</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentActivity.map((activity) => {
                                            const activityConfig = {
                                                event: {
                                                    icon: Calendar,
                                                    bgColor: 'bg-blue-100',
                                                    iconColor: 'text-blue-600'
                                                },
                                                reimbursement: {
                                                    icon: DollarSign,
                                                    bgColor: 'bg-green-100',
                                                    iconColor: 'text-green-600'
                                                },
                                                achievement: {
                                                    icon: Award,
                                                    bgColor: 'bg-yellow-100',
                                                    iconColor: 'text-yellow-600'
                                                }
                                            };

                                            const config = activityConfig[activity.type];
                                            const IconComponent = config.icon;

                                            return (
                                                <Card key={activity.id} className="w-full border border-gray-100" shadow="none" isPressable>
                                                    <CardBody className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar
                                                                icon={<IconComponent className="w-4 h-4" />}
                                                                className={`${config.bgColor} ${config.iconColor} flex-shrink-0`}
                                                                size="sm"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-900 text-sm md:text-base truncate leading-tight mb-1">
                                                                    {activity.title}
                                                                </p>
                                                                <p className="text-xs md:text-sm text-gray-500 truncate leading-relaxed mb-1">
                                                                    {activity.description}
                                                                </p>
                                                                <p className="text-xs text-gray-400 leading-relaxed">
                                                                    {activity.date?.toDate ? activity.date.toDate().toLocaleDateString() : 'Recently'}
                                                                </p>
                                                            </div>
                                                            {activity.points && (
                                                                <Chip
                                                                    color="success"
                                                                    variant="flat"
                                                                    size="sm"
                                                                    className="flex-shrink-0"
                                                                >
                                                                    +{activity.points} pts
                                                                </Chip>
                                                            )}
                                                        </div>
                                                    </CardBody>
                                                </Card>
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