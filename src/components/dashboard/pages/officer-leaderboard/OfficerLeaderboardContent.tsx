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
import type { UserRole } from "../../shared/types/firestore";

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
      doc(db, "leaderboard_settings", "settings"),
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
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/60 shadow-sm">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm text-blue-900 mb-1">
                        How is attendance calculated?
                      </h3>
                      <p className="text-blue-800/80 text-xs leading-relaxed">
                        Points are awarded based on team participation.
                        <span className="font-semibold mx-1">Attendance Rate = (Total Team Attendances ÷ Total Possible Attendances) × 100</span>
                      </p>
                      <p className="text-blue-700/70 text-[10px] mt-1.5">
                        *Only events with at least one attendee are counted. Team size includes based on officer join dates.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Enhanced Leaderboard with Officer Details */}
              <div className="space-y-6">
                {/* Top 3 Teams Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {leaderboardData.slice(0, 3).map((team, index) => (
                    <Card
                      key={team.team}
                      className="relative overflow-hidden border-0 shadow-lg group hover:-translate-y-1 transition-all duration-300"
                      style={{
                        background:
                          index === 0
                            ? "linear-gradient(135deg, #FFF9C4 0%, #FFF176 100%)" // Gold
                            : index === 1
                              ? "linear-gradient(135deg, #F5F7FA 0%, #B8C6DB 100%)" // Silver
                              : "linear-gradient(135deg, #FFE0B2 0%, #FFB74D 100%)", // Bronze
                      }}
                    >
                      {/* Decorative background elements */}
                      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/30 blur-xl"></div>
                      <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/30 blur-xl"></div>

                      <CardBody className="p-6 text-center relative z-10">
                        <div className="flex justify-center mb-3">
                          <div className={`p-3 rounded-full bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-black/5`}>
                            {getRankIcon(team.rank)}
                          </div>
                        </div>

                        <div className="mb-2">
                          <span className="text-4xl filter drop-shadow-sm">{getTeamIcon(team.team)}</span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">
                          {team.team} Team
                        </h3>

                        <div className="flex items-baseline justify-center gap-1 mb-1">
                          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {team.attendanceRate.toFixed(1)}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">%</span>
                        </div>

                        <div className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-4">
                          Attendance Rate
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-black/5">
                          <div className="text-center p-1.5 rounded-lg bg-white/40">
                            <div className="font-bold text-slate-800 text-sm">
                              {team.teamSize}
                            </div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500">Officers</div>
                          </div>
                          <div className="text-center p-1.5 rounded-lg bg-white/40">
                            <div className="font-bold text-slate-800 text-sm">
                              {team.totalAttendees}
                            </div>
                            <div className="text-[10px] uppercase font-semibold text-slate-500">Attendances</div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* Detailed Team Tables */}
                <div className="space-y-6">
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
                <Card className="text-center py-16 border-dashed border-2 border-gray-200 bg-gray-50/50">
                  <CardBody>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-white shadow-sm ring-4 ring-blue-50">
                      <Target className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Ready to Track Team Performance
                    </h3>
                    <p className="text-gray-500 text-base max-w-lg mx-auto mb-8 leading-relaxed">
                      Once officers start attending events and are assigned to
                      teams, the leaderboard will display comprehensive team
                      performance metrics and individual contributions.
                    </p>
                    <div className="inline-block bg-white border border-gray-100 rounded-xl p-5 shadow-sm text-left">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Getting Started
                      </h4>
                      <ul className="space-y-2">
                        {[
                          "Assign officers to teams in Manage Users",
                          "Configure the leaderboard start date",
                          "Officers attend events to earn points"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {i + 1}
                            </div>
                            {item}
                          </li>
                        ))}
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
