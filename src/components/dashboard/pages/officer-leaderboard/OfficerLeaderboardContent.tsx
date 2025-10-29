import React, { useState, useEffect } from "react";
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  Settings,
  Target,
} from "lucide-react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../../../firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Progress,
  Tabs,
  Tab,
  Button,
  Divider,
  Skeleton,
  Avatar,
} from "@heroui/react";
import { OfficerLeaderboardService } from "./services/officerLeaderboardService";
import LeaderboardSettings from "./components/LeaderboardSettings";
import OfficerDetailsTable from "./components/ui/OfficerDetailsTable";
import type {
  TeamLeaderboardEntry,
  OfficerTeam,
  TeamMember,
} from "./types/OfficerLeaderboardTypes";
import type { UserRole } from "../shared/types/firestore";

// Allowed roles for viewing officer leaderboard
const ALLOWED_OFFICER_ROLES: UserRole[] = [
  "General Officer",
  "Executive Officer",
  "Administrator",
];

interface TeamMetrics {
  team: OfficerTeam;
  totalAttendees: number;
  teamSize: number;
  attendanceRate: number;
  rank: number;
  members: TeamMember[];
}

export default function OfficerLeaderboardContent() {
  const [user] = useAuthState(auth);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(false); // Start false to show cached data immediately
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState("leaderboard");

  useEffect(() => {
    if (!user) return;

    // Use db from client import

    // Set up real-time listener for user role
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role);
        }
      },
      (error) => {
        console.error("Error loading user role:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !currentUserRole) return;

    // Only allow officers to view this leaderboard
    if (!ALLOWED_OFFICER_ROLES.includes(currentUserRole)) {
      setError("You do not have permission to view the officer leaderboard.");
      return;
    }

    let isMounted = true;
    let currentRequestId = 0;

    // Set up real-time listener for leaderboard settings changes only
    // This is more efficient than listening to all officer document changes
    const settingsUnsubscribe = onSnapshot(
      doc(db, "leaderboard", "settings"),
      async () => {
        if (!isMounted) return;

        const requestId = ++currentRequestId;

        try {
          setLoading(true);

          const data = await OfficerLeaderboardService.getLeaderboardData();

          // Only update state if this is still the latest request and component is mounted
          if (!isMounted || requestId !== currentRequestId) return;

          const teamMetrics: TeamMetrics[] = data.map((team, index) => ({
            team: team.team,
            totalAttendees: team.totalAttendees,
            teamSize: team.teamSize,
            attendanceRate: team.attendanceRate,
            rank: index + 1,
            members: team.members,
          }));

          setLeaderboardData(teamMetrics);
          setError("");
        } catch (error) {
          if (!isMounted) return;
          console.error("Error loading leaderboard data:", error);
          setError("Failed to load leaderboard data");
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error in settings listener:", error);
        setError("Failed to load leaderboard data");
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      settingsUnsubscribe();
    };
  }, [user, currentUserRole]);

  const getTeamColor = (team: OfficerTeam): string => {
    switch (team) {
      case "Projects":
        return "bg-blue-500";
      case "Internal":
        return "bg-green-500";
      case "Events":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTeamIcon = (team: OfficerTeam) => {
    switch (team) {
      case "Projects":
        return "🚀";
      case "Internal":
        return "🏢";
      case "Events":
        return "🎉";
      default:
        return "👥";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-gray-600">
            {rank}
          </span>
        );
    }
  };

  const maxAttendanceRate = Math.max(
    ...leaderboardData.map((team) => team.attendanceRate),
    1,
  );

  // Don't render if user is not authenticated or not an officer
  if (!user || !currentUserRole) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading user information...</p>
        </div>
      </div>
    );
  }

  const allowedRoles = [
    "General Officer",
    "Executive Officer",
    "Administrator",
  ];
  if (!allowedRoles.includes(currentUserRole)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">Access Denied</p>
          <p className="text-gray-600 mt-2">
            This leaderboard is only visible to officers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0A2463' }}>
            <Trophy className="w-6 h-6 text-yellow-500" />
            Officer Leaderboard
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Team-based competition tracking event participation and
            collaboration
          </p>
        </div>

        {(currentUserRole === "Executive Officer" ||
          currentUserRole === "Administrator") && (
            <Button
              variant="bordered"
              size="sm"
              startContent={<Settings className="w-4 h-4" />}
              onPress={() => setActiveTab("settings")}
            >
              Settings
            </Button>
          )}
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        variant="underlined"
      >
        <Tab key="leaderboard" title="Leaderboard" />
        {(currentUserRole === "Executive Officer" ||
          currentUserRole === "Administrator") && (
            <Tab key="settings" title="Executive Settings" />
          )}
      </Tabs>

      {/* Tab Content */}
      {activeTab === "leaderboard" ? (
        <>
          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardBody className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700">{error}</p>
              </CardBody>
            </Card>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="w-full">
                  <CardBody className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Formula Explanation */}
              <Card className="bg-blue-50 border-blue-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5" style={{ color: '#0A2463' }} />
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: '#0A2463' }}>
                        Attendance Rate Calculation
                      </h3>
                      <p className="text-blue-800 text-xs mt-1">
                        Attendance Rate = (Total Team Attendances ÷ Total
                        Possible Attendances) × 100
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        Only events with at least one attendee are counted. Team size includes officers who joined on or
                        before the start date. Events attended after an officer's join date are counted.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Enhanced Leaderboard with Officer Details */}
              <div className="space-y-4">
                {/* Top 3 Teams Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {leaderboardData.slice(0, 3).map((team, index) => (
                    <Card
                      key={team.team}
                      className="relative overflow-hidden hover:shadow-md transition-all duration-300"
                      style={{
                        backgroundColor:
                          index === 0
                            ? "#fef3c7"
                            : index === 1
                              ? "#f3f4f6"
                              : "#fed7aa",
                        borderLeft: `4px solid ${index === 0
                          ? "#fbbf24"
                          : index === 1
                            ? "#d1d5db"
                            : "#fb923c"
                          }`,
                      }}
                    >
                      <CardBody className="p-4 text-center">
                        <div className="flex justify-center mb-2">
                          {getRankIcon(team.rank)}
                        </div>
                        <div className="text-3xl mb-1">
                          {getTeamIcon(team.team)}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          {team.team} Team
                        </h3>
                        <div className="text-2xl font-bold text-gray-900 mb-0.5">
                          {team.attendanceRate.toFixed(2)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          attendance rate
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-300/50">
                          <div className="flex justify-around text-xs">
                            <div>
                              <div className="font-semibold">
                                {team.teamSize}
                              </div>
                              <div className="text-gray-600">Officers</div>
                            </div>
                            <div>
                              <div className="font-semibold">
                                {team.totalAttendees}
                              </div>
                              <div className="text-gray-600">Attendances</div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* Detailed Team Tables */}
                <div className="space-y-4">
                  {leaderboardData.map((team) => (
                    <OfficerDetailsTable
                      key={team.team}
                      team={team.team}
                      members={team.members}
                      teamAttendanceRate={team.attendanceRate}
                      maxAttendanceRate={maxAttendanceRate}
                      rank={team.rank}
                    />
                  ))}
                </div>
              </div>

              {leaderboardData.length === 0 && !loading && !error && (
                <Card className="text-center py-12">
                  <CardBody>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#E8EDF5' }}>
                      <Target className="w-8 h-8" style={{ color: '#0A2463' }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ready to Track Team Performance
                    </h3>
                    <p className="text-gray-600 text-sm max-w-md mx-auto mb-4">
                      Once officers start attending events and are assigned to
                      teams, the leaderboard will display comprehensive team
                      performance metrics and individual contributions.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-sm mx-auto">
                      <h4 className="text-xs font-semibold mb-1.5" style={{ color: '#0A2463' }}>
                        Getting Started:
                      </h4>
                      <ul className="text-xs text-blue-700 space-y-0.5 text-left">
                        <li>• Assign officers to teams in Manage Users</li>
                        <li>• Configure the leaderboard start date</li>
                        <li>• Officers attend events to earn points</li>
                      </ul>
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <LeaderboardSettings />
      )}
    </div>
  );
}
