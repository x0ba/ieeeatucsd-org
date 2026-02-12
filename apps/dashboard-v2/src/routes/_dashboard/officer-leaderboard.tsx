import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserAvatarFallback } from "@/components/dashboard/UserAvatarFallback";
import { useState } from "react";
import {
  Users,
  Trophy,
  Search,
  Settings,
} from "lucide-react";

export const Route = createFileRoute("/_dashboard/officer-leaderboard")({
  component: OfficerLeaderboardPage,
});

interface OfficerData {
  _id: string;
  name: string;
  avatar?: string;
  role: string;
  position?: string;
  team: string;
  points: number;
  eventsAttended: number;
  totalAttendances: number;
}

interface TeamMetrics {
  team: string;
  memberCount: number;
  totalAttendances: number;
  totalPoints: number;
  attendanceRate: number;
  members: OfficerData[];
}

interface OfficerLeaderboardData {
  teamMetrics: TeamMetrics[];
  officers: OfficerData[];
}

// Allowed roles for viewing officer leaderboard
const ALLOWED_OFFICER_ROLES = [
  "General Officer",
  "Executive Officer",
  "Administrator",
] as const;

const teamColors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  Internal: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
    text: "text-blue-700 dark:text-blue-300",
  },
  Events: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    icon: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
    text: "text-purple-700 dark:text-purple-300",
  },
  Projects: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    icon: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
    text: "text-green-700 dark:text-green-300",
  },
  Unassigned: {
    bg: "bg-gray-50 dark:bg-gray-950/20",
    border: "border-gray-200 dark:border-gray-800",
    icon: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    text: "text-gray-700 dark:text-gray-300",
  },
};

function OfficerLeaderboardPage() {
  const { userRole, logtoId } = usePermissions();
  const data = useQuery(
    api.users.getOfficerLeaderboard,
    logtoId ? { logtoId } : "skip",
  ) as OfficerLeaderboardData | undefined;
  const [activeTab, setActiveTab] = useState<"leaderboard" | "settings">("leaderboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  // Check if user has access to view officer leaderboard
  const hasAccess =
    userRole && ALLOWED_OFFICER_ROLES.includes(userRole as any);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto p-6 bg-red-50 rounded-lg">
          <h3 className="text-red-700 font-medium mb-1">Access Denied</h3>
          <p className="text-red-600 text-sm">
            This leaderboard is only visible to officers.
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === "settings") {
    return (
      <div className="p-6 space-y-6 w-full">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Leaderboard Settings
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Configure officer leaderboard settings
            </p>
          </div>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Leaderboard
          </button>
        </div>
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
          <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-700 font-medium">Settings panel coming soon</p>
          <p className="text-gray-500 text-sm mt-1">
            Leaderboard configuration options will be available here.
          </p>
        </div>
      </div>
    );
  }

  // Filter officers by search term
  const filteredOfficers = data?.officers.filter(
    (officer) =>
      officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.team.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get displayed officers based on team selection and search
  const displayedOfficers = selectedTeam
    ? filteredOfficers.filter((o) => o.team === selectedTeam)
    : filteredOfficers;

  // Sort by total attendances
  const sortedOfficers = [...displayedOfficers].sort(
    (a, b) => b.totalAttendances - a.totalAttendances
  );

  // Default to first team on load
  if (data?.teamMetrics.length && !selectedTeam) {
    setSelectedTeam(data.teamMetrics[0].team);
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50 min-h-screen">
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              Officer Leaderboard
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Track team performance and engagement
            </p>
          </div>

          {(userRole === "Executive Officer" || userRole === "Administrator") && (
            <button
              onClick={() =>
                setActiveTab(
                  activeTab === "leaderboard" ? "settings" : "leaderboard"
                )
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              {activeTab === "leaderboard" ? "Settings" : "View Leaderboard"}
            </button>
          )}
        </div>

        {!data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.teamMetrics.slice(0, 3).map((team) => {
                return (
                  <div
                    key={team.team}
                    className={`border shadow-sm transition-all cursor-pointer rounded-2xl p-5 ${
                      selectedTeam === team.team
                        ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={() =>
                      setSelectedTeam(
                        selectedTeam === team.team ? "" : team.team
                      )
                    }
                  >
                    <div className="flex flex-row items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              team.memberCount === data.teamMetrics[0].memberCount
                                ? "bg-yellow-100 text-yellow-700"
                                : team.memberCount === data.teamMetrics[1].memberCount
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            #{data.teamMetrics.findIndex((t) => t.team === team.team) + 1}
                          </span>
                          <h3 className="font-semibold text-gray-900">
                            {team.team}
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                          {team.memberCount} Officers · {team.totalAttendances}{" "}
                          Attendances
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-gray-900 block">
                          {team.attendanceRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                          Rate
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attendance Note */}
            <div className="text-xs text-gray-400 text-center">
              Attendance Rate = (Total Team Attendances ÷ Total Possible Attendances)
              × 100
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search officers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all duration-200 shadow-sm text-sm"
              />
            </div>

            {/* Team Tabs */}
            <div className="flex justify-center w-full">
              <div className="flex gap-2 border-b border-gray-200 pb-4 overflow-x-auto">
                <button
                  onClick={() => setSelectedTeam("")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    !selectedTeam
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Officers
                </button>
                {data.teamMetrics.map((team) => (
                  <button
                    key={team.team}
                    onClick={() => setSelectedTeam(team.team)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      selectedTeam === team.team
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {team.team} Team
                  </button>
                ))}
              </div>
            </div>

            {/* Officer Details Table */}
            <div className="min-h-[400px]">
              {sortedOfficers.length > 0 ? (
                <div className="bg-white rounded-3xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] ring-1 ring-gray-200/75 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {selectedTeam ? `${selectedTeam} Team` : "All Officers"}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {sortedOfficers.length}{" "}
                          {sortedOfficers.length === 1 ? "officer" : "officers"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100/50">
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
                            Officer
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left hidden sm:table-cell">
                            Role
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left hidden md:table-cell">
                            Position
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-left hidden lg:table-cell">
                            Team
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                            Attendances
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedOfficers.map((officer) => {
                          const colors =
                            teamColors[officer.team] || teamColors.Unassigned;
                          return (
                            <tr
                              key={officer._id}
                              className="group transition-all duration-200 hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {officer.avatar ? (
                                    <img
                                      src={officer.avatar}
                                      alt={officer.name}
                                      className="h-10 w-10 rounded-full object-cover shrink-0 ring-2 ring-white"
                                    />
                                  ) : (
                                    <UserAvatarFallback
                                      name={officer.name}
                                      className="h-10 w-10 text-sm"
                                    />
                                  )}
                                  <div className="ml-4">
                                    <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {officer.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                <Badge className={`text-xs ${colors.icon}`}>
                                  {officer.role}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium hidden md:table-cell">
                                {officer.position || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                                <Badge className={`text-xs ${colors.icon}`}>
                                  {officer.team}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-gray-900">
                                  {officer.totalAttendances}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-gray-900">
                                  {officer.points}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : data.teamMetrics.length > 0 ? (
                <div className="flex justify-center items-center h-48 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-gray-500 text-sm">No officers found</p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">No officer data yet</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Wait for officers to attend events to see rankings.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
