import React, { useMemo } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Progress,
  Card,
  CardBody,
  CardHeader,
} from "@heroui/react";
import { Trophy, Medal, Award, Crown, Users } from "lucide-react";
import type { OfficerTeam } from "../../../../shared/types/firestore";
import type { TeamMember } from "../../types/OfficerLeaderboardTypes";

interface OfficerDetailsTableProps {
  team: OfficerTeam;
  members: TeamMember[];
  teamAttendanceRate: number;
  maxAttendanceRate: number;
  rank: number;
}

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

const getTeamColor = (team: OfficerTeam): string => {
  switch (team) {
    case "Projects":
      return "primary";
    case "Internal":
      return "success";
    case "Events":
      return "secondary";
    default:
      return "default";
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

export default function OfficerDetailsTable({
  team,
  members,
  teamAttendanceRate,
  maxAttendanceRate,
  rank,
}: OfficerDetailsTableProps) {
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => b.eventsAttended - a.eventsAttended);
  }, [members]);

  const progressPercentage =
    maxAttendanceRate > 0 ? (teamAttendanceRate / maxAttendanceRate) * 100 : 0;

  const columns = [
    { key: "rank", label: "RANK", minWidth: 60 },
    { key: "name", label: "OFFICER", minWidth: 200 },
    { key: "position", label: "POSITION", minWidth: 150 },
    { key: "events", label: "EVENTS", minWidth: 100 },
    { key: "contribution", label: "CONTRIBUTION", minWidth: 140 },
  ];

  const renderCell = (member: TeamMember, columnKey: string) => {
    switch (columnKey) {
      case "rank":
        const memberRank =
          sortedMembers.findIndex((m) => m.userId === member.userId) + 1;
        return (
          <div className="flex items-center justify-center">
            {memberRank <= 3 ? (
              <div className="transform scale-110 drop-shadow-sm">
                {getRankIcon(memberRank)}
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-500 font-mono">
                {String(memberRank).padStart(2, '0')}
              </span>
            )}
          </div>
        );

      case "name":
        const initials = member.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const bgColors = [
          "bg-blue-100 text-blue-700",
          "bg-indigo-100 text-indigo-700",
          "bg-violet-100 text-violet-700",
          "bg-sky-100 text-sky-700",
          "bg-cyan-100 text-cyan-700",
        ];
        // Deterministic color based on name length
        const colorClass = bgColors[member.name.length % bgColors.length];

        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${colorClass}`}>
              <span className="text-xs font-bold">
                {initials}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                {member.name}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{member.role}</span>
            </div>
          </div>
        );

      case "position":
        return (
          <div>
            <span className="text-sm text-slate-600 font-medium">
              {member.position}
            </span>
          </div>
        );

      case "events":
        return (
          <div className="text-center">
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              {member.eventsAttended}
            </span>
          </div>
        );

      case "contribution":
        const contribution =
          members.length > 0
            ? (member.eventsAttended / members.length) * 100
            : 0;

        let progressColor: "success" | "warning" | "danger" | "primary" = "primary";
        if (contribution >= 80) progressColor = "success";
        else if (contribution >= 50) progressColor = "warning";
        else progressColor = "danger";

        return (
          <div className="flex items-center gap-3 w-full max-w-[140px]">
            <Progress
              value={contribution}
              color={progressColor}
              size="sm"
              radius="full"
              className="flex-1"
              classNames={{
                track: "drop-shadow-sm border border-slate-100",
                indicator: "bg-gradient-to-r"
              }}
            />
            <span className="text-xs font-mono font-medium text-slate-500 w-[30px] text-right">
              {contribution.toFixed(0)}%
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full border border-slate-200/60 shadow-md overflow-hidden bg-white/80 backdrop-blur-md">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 text-2xl">
              {getTeamIcon(team)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm text-[10px] border border-slate-100">
              {getRankIcon(rank)}
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {team} Team
              <span className="px-2 py-0.5 rounded-full bg-slate-200/50 text-slate-600 text-[10px] uppercase font-bold tracking-wider">
                Rank #{rank}
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>{members.length} Officers</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 min-w-[120px]">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{teamAttendanceRate.toFixed(1)}</span>
            <span className="text-sm font-semibold text-slate-500">%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${team === "Projects" ? "bg-blue-500" :
                team === "Internal" ? "bg-green-500" :
                  team === "Events" ? "bg-purple-500" : "bg-gray-500"
                }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mt-0.5">Performance Score</div>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {/* Officers Table */}
        {members.length > 0 ? (
          <Table
            aria-label={`${team} team officers`}
            removeWrapper
            classNames={{
              base: "min-w-full",
              th: "bg-white text-xs font-bold text-slate-400 uppercase tracking-wider py-4 border-b border-slate-100",
              td: "py-3 border-b border-slate-50 last:border-0",
              tr: "group hover:bg-slate-50/80 transition-colors",
            }}
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  align={column.key === "name" ? "start" : "center"}
                  width={column.minWidth}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={sortedMembers}>
              {(item) => (
                <TableRow key={item.userId}>
                  {(columnKey) => (
                    <TableCell>
                      {renderCell(item, columnKey as string)}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium mb-1">
              No officers assigned yet
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Assign officers to this team in the Manage Users tab to see detailed metrics.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
