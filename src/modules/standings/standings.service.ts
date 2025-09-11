// src/modules/standings/standings.service.ts
import { StandingsRepository } from "./standings.repository";
import { StandingsResponse } from "../../legacy-types/standings.types";
import { LeagueKorastatsService } from "../../integrations/korastats/services/league.service";
import { TeamKorastatsService } from "../../integrations/korastats/services/team.service";
import { KorastatsClient } from "../../integrations/korastats/client";

export class StandingsService {
  private leagueKorastatsService: LeagueKorastatsService;
  private teamKorastatsService: TeamKorastatsService;

  constructor(private readonly standingsRepository: StandingsRepository) {
    const client = new KorastatsClient();
    this.leagueKorastatsService = new LeagueKorastatsService(client);
    this.teamKorastatsService = new TeamKorastatsService(client);
  }

  /**
   * GET /api/standings/ - Get standings with team rankings from Korastats
   */
  async getStandings(options: {
    league: number;
    season?: number;
  }): Promise<StandingsResponse> {
    try {
      // First, get group standings from Korastats
      const groupStandings =
        await this.leagueKorastatsService.getTournamentGroupStandings(options.league);

      if (!groupStandings) {
        console.log(
          `No group standings found for league ${options.league}, falling back to local data`,
        );
        return await this.standingsRepository.getStandings(
          options.league,
          options.season,
        );
      }

      // Extract teams from group standings and get their ranks
      const teamsWithRanks = await this.extractTeamsWithRanks(groupStandings);

      // Sync team data with rankings
      await this.syncTeamDataWithRanks(teamsWithRanks);

      // Return standings based on updated team data
      return await this.standingsRepository.getStandings(options.league, options.season);
    } catch (error) {
      console.error("Failed to get standings with Korastats data:", error);
      // Fallback to local data
      return await this.standingsRepository.getStandings(options.league, options.season);
    }
  }

  /**
   * Extract teams with their rankings from Korastats group standings
   */
  private async extractTeamsWithRanks(
    groupStandings: any,
  ): Promise<Array<{ teamId: number; rank: number; group: string }>> {
    const teamsWithRanks: Array<{ teamId: number; rank: number; group: string }> = [];

    try {
      // Handle different response structures from Korastats
      const stages = groupStandings?.stages || groupStandings?.data?.stages || [];

      for (const stage of stages) {
        const groups = stage?.groups || [];

        for (const group of groups) {
          const standings = group?.standings || group?.teams || [];
          const groupName = group?.name || group?.group_name || "Main";

          standings.forEach((standing: any, index: number) => {
            const teamId = standing?.team_id || standing?.id || standing?.team?.id;
            if (teamId) {
              teamsWithRanks.push({
                teamId: parseInt(teamId),
                rank: index + 1,
                group: groupName,
              });
            }
          });
        }
      }

      console.log(
        `📊 Extracted ${teamsWithRanks.length} teams with rankings from group standings`,
      );
      return teamsWithRanks;
    } catch (error) {
      console.error("Failed to extract teams with ranks:", error);
      return [];
    }
  }

  /**
   * Sync team data with rankings from group standings
   */
  private async syncTeamDataWithRanks(
    teamsWithRanks: Array<{ teamId: number; rank: number; group: string }>,
  ): Promise<void> {
    try {
      const { Models } = await import("../../db/mogodb/models");

      for (const teamData of teamsWithRanks) {
        // Update team document with ranking information
        await Models.Team.updateOne(
          { korastats_id: teamData.teamId },
          {
            $set: {
              "stats_summary.current_rank": teamData.rank,
              "stats_summary.current_group": teamData.group,
              "stats_summary.last_updated": new Date(),
            },
          },
        );
      }

      console.log(`✅ Updated ${teamsWithRanks.length} teams with ranking data`);
    } catch (error) {
      console.error("Failed to sync team data with ranks:", error);
      throw error; // Re-throw to handle in calling function
    }
  }

  /**
   * Public method to manually sync team rankings for a league
   */
  async syncTeamRankings(
    leagueId: number,
  ): Promise<{ teamsUpdated: number; groups: string[]; message: string }> {
    try {
      console.log(`🔄 Starting manual sync for league ${leagueId}`);

      // Get group standings from Korastats
      const groupStandings =
        await this.leagueKorastatsService.getTournamentGroupStandings(leagueId);

      console.log(`📊 Group standings response for league ${leagueId}:`, {
        hasData: !!groupStandings,
        type: typeof groupStandings,
        keys: groupStandings ? Object.keys(groupStandings) : [],
      });

      if (!groupStandings) {
        return {
          teamsUpdated: 0,
          groups: [],
          message: `No group standings found for league ${leagueId}. This league might not have group-based standings or the data might not be available in Korastats.`,
        };
      }

      // Extract teams with their rankings
      const teamsWithRanks = await this.extractTeamsWithRanks(groupStandings);

      if (teamsWithRanks.length === 0) {
        return {
          teamsUpdated: 0,
          groups: [],
          message: `No teams found in group standings for league ${leagueId}. The standings structure might be different than expected.`,
        };
      }

      // Sync team data with rankings
      await this.syncTeamDataWithRanks(teamsWithRanks);

      // Get unique groups
      const groups = [...new Set(teamsWithRanks.map((t) => t.group))];

      console.log(
        `✅ Manual sync completed for league ${leagueId}: ${teamsWithRanks.length} teams updated across ${groups.length} groups`,
      );

      return {
        teamsUpdated: teamsWithRanks.length,
        groups,
        message: `Successfully synced ${teamsWithRanks.length} teams across ${groups.length} groups`,
      };
    } catch (error) {
      console.error(`Failed to sync team rankings for league ${leagueId}:`, error);
      throw error;
    }
  }
}

