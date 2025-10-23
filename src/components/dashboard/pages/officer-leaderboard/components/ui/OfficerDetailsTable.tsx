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
import type { OfficerTeam } from "../../../shared/types/firestore";
import type { TeamMember } from "../types/OfficerLeaderboardTypes";

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
    { key: "rank", label: "Rank", minWidth: 80 },
    { key: "name", label: "Officer", minWidth: 200 },
    { key: "position", label: "Position", minWidth: 150 },
    { key: "events", label: "Events Attended", minWidth: 120 },
    { key: "contribution", label: "Contribution", minWidth: 120 },
  ];

  const renderCell = (member: TeamMember, columnKey: string) => {
    switch (columnKey) {
      case "rank":
        const memberRank =
          sortedMembers.findIndex((m) => m.userId === member.userId) + 1;
        return (
          <div className="flex items-center justify-center">
            {memberRank <= 3 ? (
              getRankIcon(memberRank)
            ) : (
              <span className="text-sm font-semibold text-gray-600">
                #{memberRank}
              </span>
            )}
          </div>
        );

      case "name":
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0A2463' }}>
              <span className="text-xs font-bold text-white">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">
                {member.name}
              </span>
              <span className="text-xs text-gray-500">{member.role}</span>
            </div>
          </div>
        );

      case "position":
        return (
          <div>
            <span className="text-sm text-gray-700 font-medium">
              {member.position}
            </span>
          </div>
        );

      case "events":
        return (
          <div className="text-center">
            <span className="text-lg font-bold text-gray-900">
              {member.eventsAttended}
            </span>
          </div>
        );

      case "contribution":
        const contribution =
          members.length > 0
            ? (member.eventsAttended / members.length) * 100
            : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress
              value={contribution}
              color={
                contribution >= 80
                  ? "success"
                  : contribution >= 50
                    ? "warning"
                    : "danger"
              }
              size="sm"
              className="flex-1 max-w-[60px]"
            />
            <span
              className={`text-xs min-w-[35px] font-medium ${contribution >= 80
                ? "text-green-600"
                : contribution >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
                }`}
            >
              {contribution.toFixed(0)}%
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between pb-2 pt-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ backgroundColor: '#E8EDF5' }}>
            {getRankIcon(rank)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTeamIcon(team)}</span>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold" style={{ color: '#0A2463' }}>{team} Team</h3>
              <p className="text-xs text-gray-500">{members.length} officers</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Chip
            color={getTeamColor(team) as any}
            variant="solid"
            size="md"
            className="font-bold"
          >
            {teamAttendanceRate.toFixed(2)}%
          </Chip>
          <div className="text-right min-w-[70px]">
            <div className="text-xs text-gray-500">Relative</div>
            <div className="text-sm font-semibold text-gray-900">
              {progressPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-0 px-4 pb-3">
        {/* Team Progress Bar */}
        <div className="mb-3">
          <Progress
            value={progressPercentage}
            color={getTeamColor(team) as any}
            size="sm"
            className="w-full"
            showValueLabel={false}
          />
        </div>

        {/* Officers Table */}
        {members.length > 0 ? (
          <Table
            aria-label={`${team} team officers`}
            removeWrapper
            classNames={{
              th: "text-xs font-semibold uppercase tracking-wider py-2",
              td: "py-2 text-sm",
              wrapper: "p-0",
            }}
            style={{
              '--table-header-bg': '#0A2463',
              '--table-header-color': '#ffffff',
            } as React.CSSProperties}
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  style={{
                    minWidth: column.minWidth,
                    backgroundColor: '#0A2463',
                    color: '#ffffff'
                  }}
                  className={`text-center ${column.key === "name" ? "text-left" : ""
                    }`}
                >
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody items={sortedMembers}>
              {(item) => (
                <TableRow
                  key={item.userId}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {(columnKey) => (
                    <TableCell
                      className={`${columnKey === "name" ? "text-left" : "text-center"
                        }`}
                    >
                      {renderCell(item, columnKey as string)}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm mb-1">
              No officers assigned to this team yet
            </p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Assign officers to teams in the Manage Users tab to see detailed
              performance metrics here.
            </p>
          </div>
        )}

        {/* Team Summary */}
        {members.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg p-2" style={{ backgroundColor: '#E8EDF5' }}>
                <div className="text-xl font-bold" style={{ color: '#0A2463' }}>
                  {members.length}
                </div>
                <div className="text-xs text-gray-600">Total Officers</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="text-xl font-bold text-green-900">
                  {members.reduce((sum, m) => sum + m.eventsAttended, 0)}
                </div>
                <div className="text-xs text-green-600">Total Attendances</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-2">
                <div className="text-xl font-bold text-purple-900">
                  {(
                    members.reduce((sum, m) => sum + m.eventsAttended, 0) /
                    members.length
                  ).toFixed(1)}
                </div>
                <div className="text-xs text-purple-600">Avg Per Officer</div>
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
