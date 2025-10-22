import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../../../firebase/client";
import type {
  OfficerTeam,
  TeamLeaderboardEntry,
  TeamMember,
  LeaderboardSettings,
  OfficerLeaderboardData,
  OfficerTeamData,
} from "../types/OfficerLeaderboardTypes";

export class OfficerLeaderboardService {
  private static readonly SETTINGS_DOC_ID = "settings";

  /**
   * Get leaderboard settings (executive only)
   */
  static async getLeaderboardSettings(): Promise<LeaderboardSettings | null> {
    try {
      const settingsRef = doc(db, "leaderboard_settings", this.SETTINGS_DOC_ID);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        return settingsSnap.data() as LeaderboardSettings;
      }

      // Create default settings if none exist
      const defaultSettings: LeaderboardSettings = {
        id: this.SETTINGS_DOC_ID,
        startDate: Timestamp.fromDate(
          new Date(new Date().setMonth(new Date().getMonth() - 1)),
        ), // 1 month ago
        lastUpdated: Timestamp.now(),
        updatedBy: "",
      };

      await setDoc(settingsRef, defaultSettings);
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
    updates: { startDate: Timestamp },
  ): Promise<void> {
    try {
      const settingsRef = doc(db, "leaderboard_settings", this.SETTINGS_DOC_ID);
      await updateDoc(settingsRef, {
        ...updates,
        lastUpdated: Timestamp.now(),
        updatedBy: userId,
      });
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
      const usersQuery = query(
        collection(db, "users"),
        where("role", "in", [
          "General Officer",
          "Executive Officer",
          "Administrator",
        ]),
      );

      const querySnapshot = await getDocs(usersQuery);
      const officers: TeamMember[] = [];

      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        officers.push({
          userId: doc.id,
          name: data.name || "Unknown",
          position: data.position || data.role || "Officer",
          role: data.role,
          joinDate: data.joinDate || Timestamp.now(),
          eventsAttended: data.eventsAttended || 0,
          team: data.team,
        });
      }

      return officers;
    } catch (error) {
      console.error("Error getting officers:", error);
      throw error;
    }
  }

  /**
   * Get event attendances for officers after a specific date
   * Queries the attendees subcollection for each event to get accurate attendance data
   */
  static async getOfficerAttendances(
    startDate: Timestamp,
  ): Promise<Map<string, number>> {
    try {
      const eventsQuery = query(
        collection(db, "events"),
        where("endDate", ">=", startDate),
        orderBy("endDate", "desc"),
      );

      const eventsSnapshot = await getDocs(eventsQuery);
      const attendanceMap = new Map<string, number>();

      // For each event, query the attendees subcollection
      for (const eventDoc of eventsSnapshot.docs) {
        try {
          const attendeesQuery = query(
            collection(db, "events", eventDoc.id, "attendees"),
          );
          const attendeesSnapshot = await getDocs(attendeesQuery);

          // Count each attendee
          for (const attendeeDoc of attendeesSnapshot.docs) {
            const attendeeData = attendeeDoc.data();
            const userId = attendeeData.userId || attendeeDoc.id;

            const currentCount = attendanceMap.get(userId) || 0;
            attendanceMap.set(userId, currentCount + 1);
          }
        } catch (error) {
          console.error(
            `Error fetching attendees for event ${eventDoc.id}:`,
            error,
          );
          // Continue processing other events even if one fails
        }
      }

      return attendanceMap;
    } catch (error) {
      console.error("Error getting officer attendances:", error);
      throw error;
    }
  }

  /**
   * Determine officer team based on database team field ONLY
   * No automatic assignment - respects explicit "No Team" assignments
   */
  static determineOfficerTeam(
    team: OfficerTeam | undefined,
  ): OfficerTeam | undefined {
    // Only use the team field from the database
    // If undefined, the officer has no team assignment
    return team;
  }

  /**
   * Calculate team leaderboard data
   */
  static async calculateTeamLeaderboard(): Promise<OfficerLeaderboardData> {
    try {
      const settings = await this.getLeaderboardSettings();
      if (!settings) {
        throw new Error("Could not retrieve leaderboard settings");
      }

      const officers = await this.getOfficers();
      const attendanceMap = await this.getOfficerAttendances(
        settings.startDate,
      );

      // Group officers by team (only include officers with explicit team assignments)
      const teams = new Map<OfficerTeam, TeamMember[]>();

      officers.forEach((officer) => {
        const team = this.determineOfficerTeam(officer.team);

        // Only include officers with explicit team assignments
        // Officers with undefined team are excluded from team leaderboards
        if (team) {
          if (!teams.has(team)) {
            teams.set(team, []);
          }
          teams.get(team)!.push({
            ...officer,
            eventsAttended: attendanceMap.get(officer.userId) || 0,
          });
        }
      });

      // Calculate team stats
      const teamData: OfficerTeamData[] = [];

      for (const [team, members] of teams.entries()) {
        // Only count officers who joined before or on the start date
        const eligibleMembers = members.filter(
          (member) =>
            member.joinDate.toMillis() <= settings.startDate.toMillis(),
        );

        const teamSize = eligibleMembers.length;
        const totalAttendees = eligibleMembers.reduce(
          (sum, member) => sum + member.eventsAttended,
          0,
        );

        const points = teamSize > 0 ? totalAttendees / teamSize : 0;

        teamData.push({
          team,
          members: eligibleMembers,
          totalAttendees,
          teamSize,
          points: Math.round(points * 100) / 100, // Round to 2 decimal places
        });
      }

      // Sort by points (descending)
      teamData.sort((a, b) => b.points - a.points);

      return {
        teams: teamData,
        lastCalculated: Timestamp.now(),
        settings,
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
        points: team.points,
        members: team.members,
      }));
    } catch (error) {
      console.error("Error getting leaderboard data:", error);
      throw error;
    }
  }
}
