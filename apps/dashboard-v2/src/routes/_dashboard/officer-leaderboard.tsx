import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserAvatarFallback } from "@/components/dashboard/UserAvatarFallback";
import { useState } from "react";
import { Users, Trophy, Search, Settings } from "lucide-react";

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

const teamColors: Record<string, { bg: string; text: string }> = {
  Internal: { bg: "bg-blue-50", text: "text-blue-700" },
  Events: { bg: "bg-purple-50", text: "text-purple-700" },
  Projects: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Unassigned: { bg: "bg-gray-50", text: "text-gray-700" },
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
        <div className="text-center max-w-md mx-auto p-6 bg-white border border-gray-200 rounded-xl">
          <h3 className="text-gray-900 font-semibold mb-1">Access Denied</h3>
          <p className="text-gray-500 text-sm">
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
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Leaderboard Settings
            </h1>
            <p className="text-gray-500 text-[14px] mt-0.5">
              Configure officer leaderboard settings
            </p>
          </div>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-[14px] font-medium transition-colors"
          >
            Back to Leaderboard
          </button>
        </div>
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <Settings className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-gray-700 font-medium text-[15px]">Settings panel coming soon</p>
          <p className="text-gray-500 text-[13px] mt-1">
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
    <div className="flex-1 overflow-auto bg-[#F8F9FB] min-h-screen">
      <main className="p-5 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
              Officer Leaderboard
            </h1>
            <p className="text-gray-500 text-[14px] mt-0.5">
              Team performance and engagement metrics
            </p>
          </div>

          {(userRole === "Executive Officer" || userRole === "Administrator") && (
            <button
              onClick={() =>
                setActiveTab(
                  activeTab === "leaderboard" ? "settings" : "leaderboard"
                )
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-[14px] font-medium transition-colors"
            >
              {activeTab === "leaderboard" ? "Settings" : "View Leaderboard"}
            </button>
          )}
        </div>

        {!data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.teamMetrics.slice(0, 3).map((team) => {
                const colors = teamColors[team.team] || teamColors.Unassigned;
                return (
                  <div
                    key={team.team}
                    className={`border transition-all cursor-pointer rounded-xl p-5 ${
                      selectedTeam === team.team
                        ? "border-gray-900 bg-gray-900 text-white"
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
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-sm ${
                              selectedTeam === team.team
                                ? "bg-white/20 text-white"
                                : team.memberCount === data.teamMetrics[0].memberCount
                                  ? "bg-yellow-100 text-yellow-700"
                                  : team.memberCount === data.teamMetrics[1].memberCount
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            #{data.teamMetrics.findIndex((t) => t.team === team.team) + 1}
                          </span>
                          <h3 className="font-semibold text-[15px]">
                            {team.team}
                          </h3>
                        </div>
                        <div className="text-[13px] opacity-80 font-medium">
                          {team.memberCount} officers · {team.totalAttendances} attendances
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[26px] font-bold leading-none tracking-tight block">
                          {team.attendanceRate.toFixed(1)}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider opacity-60 font-medium">
                          Rate
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attendance Note */}
            <div className="text-[12px] text-gray-400 text-center">
              Attendance Rate = (Total Team Attendances ÷ Total Possible Attendances) × 100
            </div>

            {/* Search */}
            <div className="relative w-full md:w-[280px]">
              <div className="absolute inset-y-0 left-0 pl-[14px] flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search officers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-[42px] pr-4 py-[11px] border border-gray-200 rounded-[9px] bg-white text-[14px] placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/5 transition-all duration-150"
              />
            </div>

            {/* Team Tabs */}
            <div className="flex justify-center w-full">
              <div className="flex gap-1.5 border-b border-gray-200 pb-4 overflow-x-auto">
                <button
                  onClick={() => setSelectedTeam("")}
                  className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${
                    !selectedTeam
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All Officers
                </button>
                {data.teamMetrics.map((team) => (
                  <button
                    key={team.team}
                    onClick={() => setSelectedTeam(team.team)}
                    className={`px-4 py-2 text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap ${
                      selectedTeam === team.team
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {team.team}
                  </button>
                ))}
              </div>
            </div>

            {/* Officer Details Table */}
            <div className="min-h-[400px]">
              {sortedOfficers.length > 0 ? (
                <div className="bg-white rounded-[12px] border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-gray-400" />
                      <h2 className="text-[15px] font-semibold text-gray-900">
                        {selectedTeam ? `${selectedTeam} Team` : "All Officers"}
                      </h2>
                      <span className="text-[13px] text-gray-400">
                        {sortedOfficers.length} {sortedOfficers.length === 1 ? "officer" : "officers"}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left">
                            Officer
                          </th>
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left hidden sm:table-cell">
                            Role
                          </th>
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left hidden md:table-cell">
                            Position
                          </th>
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-left hidden lg:table-cell">
                            Team
                          </th>
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Attendances
                          </th>
                          <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sortedOfficers.map((officer) => {
                          const colors = teamColors[officer.team] || teamColors.Unassigned;
                          return (
                            <tr
                              key={officer._id}
                              className="group transition-colors duration-150 hover:bg-gray-50/80"
                            >
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex items-center">
                                  {officer.avatar ? (
                                    <img
                                      src={officer.avatar}
                                      alt={officer.name}
                                      className="h-9 w-9 rounded-full object-cover shrink-0 border-2 border-white"
                                    />
                                  ) : (
                                    <UserAvatarFallback
                                      name={officer.name}
                                      className="h-9 w-9 text-[13px]"
                                    />
                                  )}
                                  <div className="ml-3">
                                    <div className="text-[14px] font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                                      {officer.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap hidden sm:table-cell">
                                <Badge className={`text-[11px] font-medium px-2.5 py-1 rounded-sm border-0 ${colors.bg} ${colors.text}`}>
                                  {officer.role}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-[14px] text-gray-600 font-medium hidden md:table-cell">
                                {officer.position || "—"}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap hidden lg:table-cell">
                                <Badge className={`text-[11px] font-medium px-2.5 py-1 rounded-sm border-0 ${colors.bg} ${colors.text}`}>
                                  {officer.team}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <span className="text-[14px] font-semibold text-gray-900">
                                  {officer.totalAttendances}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <span className="text-[14px] font-semibold text-gray-900">
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
                  <p className="text-gray-500 text-[14px]">No officers found</p>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Trophy className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                  <p className="text-gray-500 font-medium text-[15px]">No officer data yet</p>
                  <p className="text-gray-400 text-[13px] mt-1">
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
