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
        <div className="flex-1 overflow-auto bg-gray-50/30">
            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 mb-1">
                            Community Leaderboard
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Track participation and celebrate our most active members
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200 shadow-sm"
                        />
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {loading ? (
                        <>
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                            <MetricCardSkeleton />
                        </>
                    ) : (
                        <>
                            <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Users</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Points</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPoints.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-yellow-50 rounded-lg">
                                    <Star className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Average Score</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgPoints}</p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>

                            <div className={`bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden ${currentUserRank !== -1 && currentUserRank <= 10 ? 'ring-2 ring-blue-500/10' : ''}`}>
                                {currentUserRank !== -1 && currentUserRank <= 10 && (
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-100 to-transparent rounded-bl-3xl opacity-50"></div>
                                )}
                                <div className="relative z-10">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Rank</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {currentUserRank === -1 ? '1000+' : currentUserRank > 0 ? `#${currentUserRank}` : '-'}
                                    </p>
                                </div>
                                <div className="relative z-10 p-3 bg-purple-50 rounded-lg">
                                    <Trophy className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Podium - Top 3 */}
                {loading ? (
                    <CardSkeleton variant="content" size="lg" className="h-64" />
                ) : topThree.length >= 3 && (
                    <div className="relative pt-8 pb-4">
                        <div className="flex justify-center items-end space-x-2 md:space-x-8">
                            {/* Second Place */}
                            {topThree[1] && (
                                <div className="flex flex-col items-center z-10 hover:-translate-y-1 transition-transform duration-300">
                                    <div className="relative mb-3">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-b from-gray-100 to-gray-200 rounded-full flex items-center justify-center p-1 shadow-md border-2 border-gray-300">
                                            <span className="text-xl font-bold text-gray-600">
                                                {topThree[1].name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="absolute -bottom-2 -right-1 w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold shadow-sm">
                                            2
                                        </div>
                                    </div>
                                    <div className="text-center mb-2">
                                        <p className="font-bold text-gray-800 text-sm md:text-base">{topThree[1].name.split(' ')[0]}</p>
                                        <div className="px-2 py-0.5 bg-gray-100 rounded-full inline-block mt-1">
                                            <p className="text-xs text-gray-600 font-bold">{topThree[1].points} pts</p>
                                        </div>
                                    </div>
                                    <div className={`w-20 md:w-32 ${getPodiumHeight(2)} bg-gradient-to-t from-gray-300 to-gray-100 rounded-t-xl shadow-inner flex items-end justify-center pb-3 opacity-90`}>
                                        <Medal className="w-8 h-8 text-gray-400 opacity-50" />
                                    </div>
                                </div>
                            )}

                            {/* First Place */}
                            {topThree[0] && (
                                <div className="flex flex-col items-center z-20 -mx-2 hover:-translate-y-1 transition-transform duration-300">
                                    <div className="relative mb-3">
                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 animate-bounce duration-1000">
                                            <Crown className="w-8 h-8 text-yellow-400 fill-current drop-shadow-sm" />
                                        </div>
                                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center p-1 shadow-lg border-4 border-yellow-300">
                                            <span className="text-2xl font-bold text-yellow-700">
                                                {topThree[0].name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="absolute -bottom-3 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white text-white text-sm font-bold shadow-sm">
                                            1
                                        </div>
                                    </div>
                                    <div className="text-center mb-2">
                                        <p className="font-bold text-gray-900 text-base md:text-lg">{topThree[0].name.split(' ')[0]}</p>
                                        <div className="px-3 py-0.5 bg-yellow-100 rounded-full inline-block mt-1">
                                            <p className="text-xs text-yellow-700 font-bold">{topThree[0].points} pts</p>
                                        </div>
                                    </div>
                                    <div className={`w-24 md:w-40 ${getPodiumHeight(1)} bg-gradient-to-t from-yellow-300 to-yellow-100 rounded-t-xl shadow-[0_10px_20px_-5px_rgba(250,204,21,0.3)] flex items-end justify-center pb-4 relative overflow-hidden`}>
                                        <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"></div>
                                        <div className="relative z-10 flex flex-col items-center">
                                            <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-sm mb-1" />
                                            <span className="text-yellow-600/50 text-[10px] uppercase font-bold tracking-widest">Champion</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Third Place */}
                            {topThree[2] && (
                                <div className="flex flex-col items-center z-10 hover:-translate-y-1 transition-transform duration-300">
                                    <div className="relative mb-3">
                                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-b from-orange-50 to-orange-100 rounded-full flex items-center justify-center p-1 shadow-md border-2 border-orange-200">
                                            <span className="text-xl font-bold text-orange-800">
                                                {topThree[2].name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="absolute -bottom-2 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white text-white text-xs font-bold shadow-sm">
                                            3
                                        </div>
                                    </div>
                                    <div className="text-center mb-2">
                                        <p className="font-bold text-gray-800 text-sm md:text-base">{topThree[2].name.split(' ')[0]}</p>
                                        <div className="px-2 py-0.5 bg-orange-50 rounded-full inline-block mt-1">
                                            <p className="text-xs text-orange-700 font-bold">{topThree[2].points} pts</p>
                                        </div>
                                    </div>
                                    <div className={`w-20 md:w-32 ${getPodiumHeight(3)} bg-gradient-to-t from-orange-300 to-orange-100 rounded-t-xl shadow-inner flex items-end justify-center pb-3 opacity-90`}>
                                        <Award className="w-8 h-8 text-orange-500 opacity-50" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Full Leaderboard */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            All Members
                        </h2>
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                            {filteredData.length} members found
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <LeaderboardTableSkeleton rows={10} />
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-24">Rank</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Points</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Major</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Grad Year</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell text-center">Events</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedData.map((member) => (
                                        <tr
                                            key={member.id}
                                            className={`group transition-colors duration-150 ${member.id === user?.uid
                                                ? 'bg-blue-50/60 hover:bg-blue-50'
                                                : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`
                                                    w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm
                                                    ${member.rank <= 3
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }
                                                `}>
                                                    {member.rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ring-1 ring-white
                                                        ${member.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                            member.rank === 2 ? 'bg-gray-100 text-gray-700' :
                                                                member.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-blue-50 text-blue-600'
                                                        }
                                                    `}>
                                                        {member.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                                {member.name}
                                                            </div>
                                                            {member.id === user?.uid && (
                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 md:hidden">{truncateMajor(member.major || member.position)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-green-50 text-green-700 border border-green-100">
                                                    {member.points}
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-0.5 mr-1">points</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                                                <div className="text-sm text-gray-600 font-medium" title={member.major || 'N/A'}>
                                                    {truncateMajor(member.major || 'N/A')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                                    {member.graduationYear || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell text-center">
                                                <div className="text-sm font-bold text-gray-900">{member.eventsAttended || 0}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full border ${member.position && member.position.toLowerCase().includes('officer')
                                                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                                                    : 'bg-gray-50 text-gray-600 border-gray-100'
                                                    }`}>
                                                    {member.position || 'Member'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Search className="w-12 h-12 text-gray-200 mb-3" />
                                                    <p className="text-lg font-medium text-gray-900">No members found</p>
                                                    <p className="text-sm text-gray-500">Try adjusting your search terms</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="bg-white px-6 py-4 border-t border-gray-100">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <p className="text-sm text-gray-500 order-2 sm:order-1">
                                    Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to{' '}
                                    <span className="font-bold text-gray-900">{Math.min(endIndex, totalItems)}</span> of{' '}
                                    <span className="font-bold text-gray-900">{totalItems}</span> members
                                </p>
                                <div className="order-1 sm:order-2 w-full sm:w-auto flex justify-center">
                                    <Pagination
                                        total={totalPages}
                                        page={currentPage}
                                        onChange={setCurrentPage}
                                        showControls
                                        showShadow
                                        color="primary"
                                        className="gap-2"
                                        radius="full"
                                        classNames={{
                                            wrapper: "shadow-none",
                                            cursor: "shadow-md font-bold",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
