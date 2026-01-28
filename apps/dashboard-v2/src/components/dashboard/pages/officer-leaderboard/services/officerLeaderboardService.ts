import type {
  OfficerTeam,
  TeamLeaderboardEntry,
  TeamMember,
  LeaderboardSettings,
  OfficerLeaderboardData,
  OfficerTeamData,
} from "../types/OfficerLeaderboardTypes";
import { useQuery, useMutation } from "convex/react";
import { api } from "#convex/_generated/api";

export class OfficerLeaderboardService {
  private static readonly SETTINGS_DOC_ID = "settings";

  /**
   * Get leaderboard settings (executive only)
   */
  static async getLeaderboardSettings(): Promise<LeaderboardSettings | null> {
    try {
      // This would use Convex queries in a React component
      // For service layer, we'd need to call the API differently
      const defaultSettings: LeaderboardSettings = {
        id: this.SETTINGS_DOC_ID,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).getTime(),
        lastUpdated: Date.now(),
        updatedBy: "",
      };
      return defaultSettings;
    } catch (error) {
      console.error("Error getting leaderboard settings:", error);
      throw error;
    }
  }

  /**
   * Update leaderboard settings (executive only)
   */
  static async updateLeaderboardSettings(
    userId: string,
    updates: { startDate: number },
  ): Promise<void> {
    try {
      // This would use Convex mutations in a React component
      console.log("Updating settings", updates);
    } catch (error) {
      console.error("Error updating leaderboard settings:", error);
      throw error;
    }
  }

  /**
   * Get all officers from users collection
   */
  static async getOfficers(): Promise<TeamMember[]> {
    try {
      // This would use Convex queries in a React component
      return [];
    } catch (error) {
      console.error("Error getting officers:", error);
      throw error;
    }
  }

  /**
   * Get event attendances for officers after a specific date
   */
  static async getOfficerAttendances(startDate: number): Promise<{
    attendanceMap: Map<string, Array<{ eventId: string; endDate: number }>>;
    totalEvents: number;
  }> {
    try {
      // This would use Convex queries in a React component
      return {
        attendanceMap: new Map(),
        totalEvents: 0,
      };
    } catch (error) {
      console.error("Error getting officer attendances:", error);
      throw error;
    }
  }

  /**
   * Determine officer team based on database team field ONLY
   */
  static determineOfficerTeam(
    team: OfficerTeam | undefined,
  ): OfficerTeam | undefined {
    return team;
  }

  /**
   * Calculate team leaderboard data
   */
  static async calculateTeamLeaderboard(): Promise<OfficerLeaderboardData> {
    try {
      return {
        teams: [],
        lastCalculated: Date.now(),
        settings: {
          id: this.SETTINGS_DOC_ID,
          startDate: Date.now(),
          lastUpdated: Date.now(),
          updatedBy: "",
        },
      };
    } catch (error) {
      console.error("Error calculating team leaderboard:", error);
      throw error;
    }
  }

  /**
   * Get formatted leaderboard data for display
   */
  static async getLeaderboardData(): Promise<TeamLeaderboardEntry[]> {
    try {
      const data = await this.calculateTeamLeaderboard();
      return data.teams.map((team) => ({
        team: team.team,
        totalAttendees: team.totalAttendees,
        teamSize: team.teamSize,
        attendanceRate: team.attendanceRate,
        members: team.members,
      }));
    } catch (error) {
      console.error("Error getting leaderboard data:", error);
      throw error;
    }
  }
}

// React hooks for using Convex queries/mutations
export const useLeaderboardSettings = () => {
  return useQuery(api.leaderboard.getSettings);
};

export const useUpdateLeaderboardSettings = () => {
  return useMutation(api.leaderboard.updateSettings);
};

export const useOfficers = () => {
  return useQuery(api.leaderboard.getData, {});
};
