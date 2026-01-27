export type OfficerTeam = "Projects" | "Internal" | "Events";

export interface TeamLeaderboardEntry {
  team: OfficerTeam;
  totalAttendees: number;
  teamSize: number;
  attendanceRate: number; // Percentage: (totalAttendees / totalPossibleAttendances) * 100
  members: TeamMember[];
}

export interface TeamMember {
  userId: string;
  name: string;
  position: string;
  role: string;
  joinDate: number;
  eventsAttended: number;
  team?: OfficerTeam;
}

export interface LeaderboardSettings {
  id: "settings";
  startDate: number;
  lastUpdated: number;
  updatedBy: string;
}

export interface OfficerTeamData {
  team: OfficerTeam;
  members: TeamMember[];
  totalAttendees: number;
  teamSize: number;
  attendanceRate: number; // Percentage: (totalAttendees / totalPossibleAttendances) * 100
}

export interface OfficerLeaderboardData {
  teams: OfficerTeamData[];
  lastCalculated: number;
  settings: LeaderboardSettings;
}
