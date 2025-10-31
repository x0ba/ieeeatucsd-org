import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, TrendingUp, Users, Star, Search } from 'lucide-react';
import { Pagination } from '@heroui/react';
import { collection, query, orderBy, onSnapshot, getCountFromServer, limit } from 'firebase/firestore';
import { db } from '../../../../firebase/client';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../../../firebase/client';
import { PublicProfileService, type PublicProfile } from '../../shared/services/publicProfile';
import { LeaderboardTableSkeleton, MetricCardSkeleton, CardSkeleton } from '../../../ui/loading';

interface LeaderboardUser {
    id: string;
    name: string;
    points: number;
    major?: string;
    graduationYear?: number;
    eventsAttended: number;
    position: string;
    rank: number;
}

export default function LeaderboardContent() {
    const [user] = useAuthState(auth);
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
    const [currentUserRank, setCurrentUserRank] = useState<number>(0);
    const [loading, setLoading] = useState(true); // Start true for better UX on first visit
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5); // Show 5 users per page
    const [totalUsersCount, setTotalUsersCount] = useState<number>(0);

    useEffect(() => {
        // Set up real-time listener for public profiles leaderboard
        // SCALABILITY: Limit to top 1000 users to prevent unbounded query issues
        // For organizations with >1000 members, consider implementing pagination or virtual scrolling
        try {
            const LEADERBOARD_LIMIT = 1000; // Reasonable limit for most organizations

            const publicProfilesQuery = query(
                collection(db, 'public_profiles'),
                orderBy('points', 'desc'),
                limit(LEADERBOARD_LIMIT) // Add limit to prevent unbounded query
            );

            // Separate query to get total count of all users
            const totalCountQuery = collection(db, 'public_profiles');

            // Get total count (non-real-time, just once)
            getCountFromServer(totalCountQuery).then((snapshot) => {
                setTotalUsersCount(snapshot.data().count);
            }).catch((error) => {
                console.error('Error getting total count:', error);
            });

            const unsubscribe = onSnapshot(publicProfilesQuery, (snapshot) => {
                const users = snapshot.docs.map((doc, index) => {
                    const data = doc.data();

                    return {
                        id: doc.id,
                        name: data.name || 'Unknown User',
                        points: data.points || 0,
                        major: data.major || '',
                        graduationYear: data.graduationYear || null,
                        eventsAttended: data.eventsAttended || 0,
                        position: data.position || 'Member',
                        rank: index + 1
                    };
                }) as LeaderboardUser[];

                // Only filter out users with invalid names, but keep users with 0 points
                const validUsers = users.filter(u => u.name && u.name !== 'Unknown User' && u.name.trim() !== '');

                setLeaderboardData(validUsers);

                // Find current user's rank and calculate accurate ranking beyond top 1000
                if (user) {
                    const currentUserIndex = validUsers.findIndex(u => u.id === user.uid);
                    if (currentUserIndex !== -1) {
                        // User is in top 1000, use their assigned rank
                        setCurrentUserRank(validUsers[currentUserIndex].rank);
                    } else {
                        // User is beyond top 1000, need to calculate their rank
                        // This would require a separate query to count users with higher points
                        // For now, show "1000+" to indicate they're beyond the displayed leaderboard
                        setCurrentUserRank(-1); // Special value to indicate beyond top 1000
                    }
                }

                setLoading(false);
            }, (error) => {
                console.error('Error in leaderboard listener:', error);
                setLoading(false);
                // Don't clear data on error, keep showing what we have
            });

            return () => {
                unsubscribe();
            };
        } catch (error) {
            console.error('Error setting up leaderboard listener:', error);
            setLoading(false);
        }
    }, [user]);

    const filteredData = leaderboardData.filter(userData => {
        try {
            const searchLower = searchTerm.toLowerCase();
            return (userData.name && userData.name.toLowerCase().includes(searchLower)) ||
                (userData.major && userData.major.toLowerCase().includes(searchLower));
        } catch (error) {
            console.error('Error filtering leaderboard data:', error, userData);
            return true; // Include the item if there's an error to avoid blank pages
        }
    });

    // Pagination calculations
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const topThree = filteredData.slice(0, 3);
    const restOfLeaderboard = filteredData.slice(3);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="w-6 h-6 text-yellow-500" />;
            case 2:
                return <Medal className="w-6 h-6 text-gray-400" />;
            case 3:
                return <Award className="w-6 h-6 text-amber-600" />;
            default:
                return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
        }
    };

    const getPodiumHeight = (rank: number) => {
        switch (rank) {
            case 1:
                return 'h-32';
            case 2:
                return 'h-24';
            case 3:
                return 'h-20';
            default:
                return 'h-16';
        }
    };

    const getPodiumColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
            case 2:
                return 'bg-gradient-to-t from-gray-400 to-gray-300';
            case 3:
                return 'bg-gradient-to-t from-amber-600 to-amber-500';
            default:
                return 'bg-gray-200';
        }
    };

    const getTotalStats = () => {
        const totalUsers = filteredData.length;
        const totalPoints = filteredData.reduce((sum, user) => sum + user.points, 0);
        const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;
        const topPerformer = filteredData[0];

        return { totalUsers, totalPoints, avgPoints, topPerformer };
    };

    const stats = getTotalStats();

    // Utility function to truncate majors
    const truncateMajor = (major: string, maxLength: number = 20) => {
        if (!major || major.length <= maxLength) return major;
        return major.substring(0, maxLength) + '...';
    };

    return (
        <div className="flex-1 overflow-auto">
            <main className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {/* Search Bar */}
                    <div className="mb-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px]"
                            />
                        </div>
                    </div>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {loading ? (
                            <>
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                                <MetricCardSkeleton />
                            </>
                        ) : (
                            <>
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Total Members</p>
                                            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                                        </div>
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600">Total Points</p>
                                            <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.totalPoints.toLocaleString()}</p>
                                        </div>
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Star className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Average Points</p>
                                            <p className="text-2xl font-bold text-gray-900">{stats.avgPoints}</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <TrendingUp className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Your Rank</p>
                                            <p
                                                className="text-2xl font-bold text-gray-900"
                                                aria-label={`Your current leaderboard ranking is ${currentUserRank === -1 ? 'beyond top 1000' : currentUserRank === 0 ? 'not ranked' : '#' + currentUserRank}`}
                                            >
                                                {currentUserRank === -1 ? '1000+' : currentUserRank ? '#' + currentUserRank : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                            <Trophy className="w-6 h-6 text-purple-600" aria-label="Trophy icon representing your ranking" />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Podium - Top 3 */}
                    {loading ? (
                        <CardSkeleton variant="content" size="lg" className="h-64" />
                    ) : topThree.length >= 3 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">🏆 Top Performers 🏆</h2>
                            <div className="flex justify-center items-end space-x-4 mb-6">
                                {/* Second Place */}
                                {topThree[1] && (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                            <Medal className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm text-center">{topThree[1].name.split(' ')[0]}</p>
                                        <p className="text-xs text-gray-500 mb-2">{topThree[1].points} pts</p>
                                        <div className={`w-20 ${getPodiumHeight(2)} ${getPodiumColor(2)} rounded-t-lg flex items-end justify-center pb-2`}>
                                            <span className="text-white font-bold text-lg">2</span>
                                        </div>
                                    </div>
                                )}

                                {/* First Place */}
                                {topThree[0] && (
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-2 relative">
                                            <Crown className="w-10 h-10 text-yellow-500" />
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">👑</span>
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-900 text-base text-center">{topThree[0].name.split(' ')[0]}</p>
                                        <p className="text-sm text-yellow-600 font-medium mb-2">{topThree[0].points} pts</p>
                                        <div className={`w-24 ${getPodiumHeight(1)} ${getPodiumColor(1)} rounded-t-lg flex items-end justify-center pb-2`}>
                                            <span className="text-white font-bold text-xl">1</span>
                                        </div>
                                    </div>
                                )}

                                {/* Third Place */}
                                {topThree[2] && (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                                            <Award className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm text-center">{topThree[2].name.split(' ')[0]}</p>
                                        <p className="text-xs text-gray-500 mb-2">{topThree[2].points} pts</p>
                                        <div className={`w-20 ${getPodiumHeight(3)} ${getPodiumColor(3)} rounded-t-lg flex items-end justify-center pb-2`}>
                                            <span className="text-white font-bold text-lg">3</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Full Leaderboard */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Full Leaderboard</h2>
                        </div>
                        <div className="overflow-x-auto">
                            {loading ? (
                                <LeaderboardTableSkeleton rows={10} />
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rank
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Member
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Points
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Major
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Graduation Year
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Events
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Position
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedData.map((member) => (
                                            <tr
                                                key={member.id}
                                                className={`hover:bg-gray-50 ${member.id === user?.uid ? 'bg-blue-50' : ''}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        {getRankIcon(member.rank)}
                                                        {member.rank <= 3 && (
                                                            <span className="ml-2 text-xs font-medium text-gray-500">
                                                                {member.rank === 1 ? 'Champion' : member.rank === 2 ? 'Runner-up' : 'Third Place'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <span className="text-blue-600 font-medium text-sm">
                                                                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {member.name}
                                                                {member.id === user?.uid && (
                                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500" title={member.major || member.position}>{truncateMajor(member.major || member.position)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{member.points}</div>
                                                    <div className="text-xs text-gray-500">points</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900" title={member.major || 'N/A'}>{truncateMajor(member.major || 'N/A')}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{member.graduationYear || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{member.eventsAttended || 0}</div>
                                                    <div className="text-xs text-gray-500">events</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                                        {member.position || 'Member'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                                            <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                                            <span className="font-medium">{totalItems}</span> results
                                        </p>
                                    </div>
                                    <Pagination
                                        total={totalPages}
                                        page={currentPage}
                                        onChange={setCurrentPage}
                                        showControls
                                        showShadow
                                        color="primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
