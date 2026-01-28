import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, Users, Award, Clock, CheckCircle, DollarSign, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Chip, Avatar, Skeleton, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { useQuery } from 'convex/react';
import { api } from "#convex/_generated/api";
import { useAuth } from "../../../../hooks/useConvexAuth";
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
  type: 'event' | 'reimbursement' | 'achievement' | 'fund_deposit';
  title: string;
  description: string;
  date: number;
  points?: number;
}

interface Event {
  id: string;
  eventName: string;
  eventDescription: string;
  location?: string;
  startDate: number;
  endDate?: number;
  pointsToReward: number;
  hasFood?: boolean;
  eventCode: string;
  files?: string[];
}

const PREVIOUS_EVENTS_PREVIEW_COUNT = 3;
const RECENT_ACTIVITY_PREVIEW_COUNT = 5;

export default function OverviewContent() {
  const { user, authUserId } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // Always call useQuery unconditionally - use "skip" when not ready
  const overviewData = useQuery(
    api.overview.getOverviewData,
    mounted && authUserId ? { authUserId } : "skip"
  );

  const [showEventsModal, setShowEventsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const userData = overviewData?.user;
  const userStats: UserStats = overviewData
    ? {
        totalPoints: overviewData.stats.totalPoints,
        eventsAttended: overviewData.stats.eventsAttended,
        reimbursementsSubmitted: overviewData.stats.reimbursementsSubmitted,
        reimbursementsApproved: overviewData.stats.reimbursementsApproved,
        lastEventAttended: overviewData.events.length > 0 ? new Date(overviewData.events[0].startDate).toLocaleDateString() : 'None',
        rank: overviewData.rank,
        totalMembers: overviewData.totalMembers,
      }
    : {
        totalPoints: 0,
        eventsAttended: 0,
        reimbursementsSubmitted: 0,
        reimbursementsApproved: 0,
        lastEventAttended: 'None',
        rank: 0,
        totalMembers: 0,
      };

  const recentActivity: RecentActivity[] = overviewData?.recentActivity || [];
  const events: Event[] = (overviewData?.events || []).map((event) => ({
    id: event.id,
    eventName: event.eventName,
    eventDescription: event.eventDescription,
    location: event.location,
    startDate: event.startDate,
    endDate: event.endDate,
    pointsToReward: event.pointsToReward,
    hasFood: event.hasFood,
    eventCode: event.eventCode,
    files: event.files,
  }));

  const pointsHistory = overviewData?.pointsHistory || [];

  const quickActions = [
    {
      title: 'Reimbursement',
      icon: CreditCard,
      href: '/reimbursement',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Events',
      icon: Calendar,
      href: '/events',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Leaderboard',
      icon: Award,
      href: '/leaderboard',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Profile',
      icon: Users,
      href: '/settings',
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const loading = !overviewData;

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
                  You've earned <span className="font-bold text-white">{userStats.totalPoints} points</span> and attended{' '}
                  <span className="font-bold text-white">{userStats.eventsAttended} events</span> this year.
                </p>
              </div>
              <div className="hidden sm:block">
                <Avatar icon={<Award className="w-8 h-8" />} className="w-16 h-16 bg-white/20 text-white" />
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

            {/* Previously Attended Events - Compact List */}
            <Card className="w-full border border-gray-200" shadow="none">
              <CardHeader className="pb-0 pt-4 px-5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Previously Attended Events</h2>
                </div>
                {events.length > 0 && (
                  <Button
                    variant="light"
                    color="primary"
                    size="sm"
                    className="h-8 min-w-0 px-2"
                    onPress={() => setShowEventsModal(true)}
                  >
                    View all
                  </Button>
                )}
              </CardHeader>
              <CardBody className="p-5 pt-3">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="w-full h-16 rounded-lg" />
                    ))}
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">No attended events yet — check in at your next meetup!</div>
                ) : (
                  <div className="space-y-2">
                    {events.slice(0, PREVIOUS_EVENTS_PREVIEW_COUNT).map((event) => {
                      const eventStart = new Date(event.startDate);
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-12 text-center bg-blue-50 rounded-md p-1">
                            <div className="text-xs text-blue-600 font-bold uppercase">
                              {eventStart.toLocaleDateString(undefined, { month: 'short' })}
                            </div>
                            <div className="text-lg font-bold text-gray-900 leading-none">{eventStart.getDate()}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{event.eventName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {eventStart.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </div>
                          </div>
                          {event.pointsToReward > 0 && (
                            <Chip size="sm" variant="flat" color="success" className="h-6 text-xs">
                              +{event.pointsToReward}
                            </Chip>
                          )}
                        </div>
                      );
                    })}
                    {events.length > PREVIOUS_EVENTS_PREVIEW_COUNT && (
                      <p className="text-xs text-gray-500 text-center pt-2">
                        Showing {PREVIOUS_EVENTS_PREVIEW_COUNT} of {events.length} events
                      </p>
                    )}
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
                {recentActivity.length > 0 && (
                  <Button
                    variant="light"
                    color="primary"
                    size="sm"
                    className="h-8 min-w-0 px-2"
                    onPress={() => setShowActivityModal(true)}
                  >
                    View all
                  </Button>
                )}
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
                  <div className="text-center py-8 text-gray-500 text-sm">No recent activity found</div>
                ) : (
                  <div className="relative space-y-0">
                    {/* Vertical Line */}
                    <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-100" />

                    {recentActivity.slice(0, RECENT_ACTIVITY_PREVIEW_COUNT).map((activity) => {
                      const config = {
                        event: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                        reimbursement: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                        achievement: { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                        fund_deposit: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                      }[activity.type];

                      if (!config) return null;

                      const Icon = config.icon;

                      return (
                        <div key={activity.id} className="relative flex gap-4 py-3 group">
                          <div
                            className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center border-2 border-white ring-1 ring-gray-100`}
                          >
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {new Date(activity.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{activity.description}</p>
                            {activity.points && (
                              <span className="inline-flex items-center text-xs font-medium text-green-600 mt-1">
                                <Plus className="w-3 h-3 mr-0.5" /> {activity.points} points
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recentActivity.length > RECENT_ACTIVITY_PREVIEW_COUNT && (
                      <p className="text-xs text-gray-500 text-center pt-2">
                        Showing {RECENT_ACTIVITY_PREVIEW_COUNT} of {recentActivity.length} records
                      </p>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Previously Attended Events Modal */}
        <Modal
          isOpen={showEventsModal}
          onOpenChange={(open) => !open && setShowEventsModal(false)}
          size="lg"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold text-gray-900">Previously Attended Events</h2>
                  <p className="text-sm text-gray-500">Published events you've checked into</p>
                </ModalHeader>
                <ModalBody className="pb-6">
                  {events.length === 0 ? (
                    <p className="text-gray-500 text-sm">No attended events were found.</p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => {
                        const eventStart = new Date(event.startDate);
                        return (
                          <div key={event.id} className="p-3 border border-gray-100 rounded-lg">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{event.eventName}</p>
                                <p className="text-sm text-gray-500">
                                  {eventStart.toLocaleDateString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}{' '}
                                  at{' '}
                                  {eventStart.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                              {event.pointsToReward > 0 && (
                                <Chip size="sm" variant="flat" color="success">
                                  +{event.pointsToReward} pts
                                </Chip>
                              )}
                            </div>
                            {event.eventDescription && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{event.eventDescription}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Recent Activity Modal */}
        <Modal
          isOpen={showActivityModal}
          onOpenChange={(open) => !open && setShowActivityModal(false)}
          size="lg"
          scrollBehavior="inside"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold text-gray-900">All Recent Activity</h2>
                  <p className="text-sm text-gray-500">Events, reimbursements, and achievements</p>
                </ModalHeader>
                <ModalBody className="pb-6">
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-500 text-sm">No activity to show.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => {
                        const config = {
                          event: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                          reimbursement: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                          achievement: { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                          fund_deposit: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
                        }[activity.type];
                        const Icon = config.icon;
                        return (
                          <div key={activity.id} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3">
                            <div className={`flex-shrink-0 w-9 h-9 rounded-full ${config.bg} flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {new Date(activity.date).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                              {activity.points && (
                                <span className="inline-flex items-center text-xs font-medium text-green-600 mt-2">
                                  <Plus className="w-3 h-3 mr-1" /> {activity.points} points
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </main>
    </div>
  );
}
