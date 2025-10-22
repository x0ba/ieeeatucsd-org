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
import { auth } from "../../../../firebase/client";
import { doc, getDoc, getFirestore } from "firebase/firestore";
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

interface TeamMetrics {
  team: OfficerTeam;
  totalAttendees: number;
  teamSize: number;
  points: number;
  rank: number;
  members: TeamMember[];
}

export default function OfficerLeaderboardContent() {
  const [user] = useAuthState(auth);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState("leaderboard");

  useEffect(() => {
    const loadUserRole = async () => {
      if (!user) return;

      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserRole(userData.role);
        }
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };

    loadUserRole();
  }, [user]);

  useEffect(() => {
    const loadLeaderboardData = async () => {
      if (!user || !currentUserRole) return;

      // Only allow officers to view this leaderboard
      const allowedRoles = [
        "General Officer",
        "Executive Officer",
        "Administrator",
      ];
      if (!allowedRoles.includes(currentUserRole)) {
        setError("You do not have permission to view the officer leaderboard.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await OfficerLeaderboardService.getLeaderboardData();

        const teamMetrics: TeamMetrics[] = data.map((team, index) => ({
          team: team.team,
          totalAttendees: team.totalAttendees,
          teamSize: team.teamSize,
          points: team.points,
          rank: index + 1,
          members: team.members,
        }));

        setLeaderboardData(teamMetrics);
      } catch (error) {
        console.error("Error loading leaderboard data:", error);
        setError("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboardData();
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

  const maxPoints = Math.max(...leaderboardData.map((team) => team.points), 1);

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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Officer Leaderboard
          </h1>
          <p className="text-gray-600 mt-2">
            Team-based competition tracking event participation and
            collaboration
          </p>
        </div>

        {(currentUserRole === "Executive Officer" ||
          currentUserRole === "Administrator") && (
          <Button
            variant="bordered"
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
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="w-full">
                  <CardBody className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
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
                <CardBody>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900">
                        Points Calculation
                      </h3>
                      <p className="text-blue-800 mt-1">
                        Points = Total Team Attendances ÷ Team Size
                      </p>
                      <p className="text-blue-700 text-sm mt-2">
                        Team size only includes officers who joined on or before
                        the configured start date. Only attendances from events
                        after the start date are counted.
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
                      className="relative overflow-hidden hover:shadow-lg transition-all duration-300"
                      style={{
                        background:
                          index === 0
                            ? "linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)"
                            : index === 1
                              ? "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"
                              : "linear-gradient(135deg, #fed7aa 0%, #fb923c 100%)",
                      }}
                    >
                      <CardBody className="p-6 text-center">
                        <div className="flex justify-center mb-3">
                          {getRankIcon(team.rank)}
                        </div>
                        <div className="text-4xl mb-2">
                          {getTeamIcon(team.team)}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {team.team} Team
                        </h3>
                        <div className="text-3xl font-bold text-gray-900 mb-1">
                          {team.points.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">points</div>
                        <div className="mt-3 pt-3 border-t border-gray-300/50">
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
                              <div className="text-gray-600">Events</div>
                            </div>
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
                      teamPoints={team.points}
                      maxPoints={maxPoints}
                      rank={team.rank}
                    />
                  ))}
                </div>
              </div>

              {leaderboardData.length === 0 && !loading && !error && (
                <Card className="text-center py-16">
                  <CardBody>
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Target className="w-12 h-12 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      Ready to Track Team Performance
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      Once officers start attending events and are assigned to
                      teams, the leaderboard will display comprehensive team
                      performance metrics and individual contributions.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm mx-auto">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2">
                        Getting Started:
                      </h4>
                      <ul className="text-sm text-blue-700 space-y-1 text-left">
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
