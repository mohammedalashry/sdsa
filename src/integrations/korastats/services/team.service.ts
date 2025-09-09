import { KorastatsClient } from "../client";
import {
  KorastatsTeamInfoResponse,
  KorastatsTournamentTeamListResponse,
  KorastatsTournamentTeamStatsResponse,
  KorastatsEntityClubResponse,
} from "../types/team.types";

export class TeamKorastatsService {
  constructor(private readonly client: KorastatsClient) {}

  async getTeamsList(leagueId: number, season: string): Promise<any[]> {
    // TournamentTeamList returns team stats, not basic team info
    // We need to get team IDs from TournamentTeamList and then get basic info from EntityTeams

    try {
      // First, get team IDs from TournamentTeamList (which returns stats)
      const statsResponse = await this.client.makeRequest<{
        result: string;
        message: string;
        data: any;
      }>("TournamentTeamList", {
        tournament_id: leagueId,
        season,
      });

      if (statsResponse.result !== "Success") {
        throw new Error(`Failed to fetch team stats: ${statsResponse.message}`);
      }

      // Extract team IDs from the TournamentTeamList data
      const teamIds = statsResponse.data?.teams?.map((team) => team.id) || [];
      console.log(`🔍 Found ${teamIds.length} team IDs from TournamentTeamList`);
      console.log(`🔍 Team IDs: ${teamIds.join(", ")}`);

      if (teamIds.length === 0) {
        return [];
      }

      // Now get the actual team information from EntityTeams
      const entityTeams = await this.getEntityTeams(teamIds);

      // Convert EntityTeams format to team format
      const teams: any[] = entityTeams.map((entityTeam) => ({
        intTeamID: entityTeam.id,
        strTeamName: entityTeam.name,
        strTeamNameEn: entityTeam.name,
        strTeamShortCode: null,
        strCountryNameEn: "Saudi Arabia",
        strCountryName: "Saudi Arabia",
        intFoundedYear: null,
        blnNationalTeam: entityTeam.is_national_team ? 1 : 0,
        strTeamLogo: entityTeam.club?.logo || entityTeam.image || "",
        intStadiumID: entityTeam.stadium?.id || null,
        strStadiumName: entityTeam.stadium?.name || null,
        strStadiumAddress: null,
        strStadiumCity: null,
        strStadiumSurface: null,
        strStadiumImage: null,
        intStadiumCapacity: null,
      }));

      console.log(`🔍 Converted ${teams.length} teams with logos:`);
      teams.forEach((team) => {
        console.log(
          `  - ${team.strTeamNameEn} (ID: ${team.intTeamID}): ${team.strTeamLogo || "❌ NO LOGO"}`,
        );
      });

      return teams;
    } catch (error) {
      console.error("Failed to fetch teams list:", error);
      throw error;
    }
  }

  async getEntityTeams(teamIds: number[]): Promise<any[]> {
    if (teamIds.length === 0) return [];

    try {
      // EntityTeams returns ALL teams in the country, so we need to filter by the specific team IDs
      const response = await this.client.makeRequest<{
        root: {
          result: boolean;
          title: string;
          message: string;
          object: {
            total_records: number;
            current_records: number;
            pages: number;
            current_page: number;
            Data: any[];
          };
        };
      }>("EntityTeams", {
        // Don't pass team_ids parameter - get all teams and filter locally
      });

      console.log(`🔍 EntityTeams response structure:`, {
        hasRoot: !!response.root,
        result: response.root?.result,
        message: response.root?.message,
        dataLength: response.root?.object?.Data?.length,
      });

      if (!response.root?.result) {
        throw new Error(
          `Failed to fetch entity teams: ${response.root?.message || "Unknown error"}`,
        );
      }

      const allTeams = response.root?.object?.Data || [];

      console.log(`🔍 EntityTeams returned ${allTeams.length} total teams`);

      // Debug: Show first few teams to understand structure
      if (allTeams.length > 0) {
        console.log(`🔍 Sample EntityTeams structure:`, {
          id: allTeams[0].id,
          name: allTeams[0].name,
          club: allTeams[0].club,
          hasLogo: !!allTeams[0].club?.logo,
        });
      }

      // Debug: Show first few teams to understand structure
      if (allTeams.length > 0) {
        console.log(`🔍 Sample EntityTeams structure:`, {
          id: allTeams[0].id,
          name: allTeams[0].name,
          club: allTeams[0].club,
          hasLogo: !!allTeams[0].club?.logo,
        });
      }

      // Filter to only include teams that are in our tournament
      const filteredTeams = allTeams.filter((team) => teamIds.includes(team.id));

      console.log(
        `🔍 Filtered ${filteredTeams.length} teams from ${allTeams.length} total teams`,
      );
      console.log(`🔍 Looking for team IDs: ${teamIds.join(", ")}`);

      // Debug: Show filtered teams with logos
      filteredTeams.forEach((team) => {
        console.log(
          `  - ${team.name} (ID: ${team.id}): ${team.club?.logo || "❌ NO LOGO"}`,
        );
      });

      // Debug: Show teams that weren't found
      const notFoundIds = teamIds.filter(
        (id) => !allTeams.some((team) => team.id === id),
      );
      if (notFoundIds.length > 0) {
        console.log(`⚠️ Team IDs not found in EntityTeams: ${notFoundIds.join(", ")}`);
      }

      return filteredTeams;
    } catch (error) {
      console.error("Failed to fetch entity teams:", error);
      return [];
    }
  }

  /**
   * Get team logos for a list of team IDs
   * This method can be used across different requests to get team logos
   */
  async getTeamLogos(teamIds: number[]): Promise<Map<number, string>> {
    if (teamIds.length === 0) return new Map();

    try {
      console.log(
        `🔍 Getting logos for ${teamIds.length} team IDs: ${teamIds.join(", ")}`,
      );

      const entityTeams = await this.getEntityTeams(teamIds);

      // Create a map of team ID to logo URL
      const logoMap = new Map<number, string>();
      entityTeams.forEach((team) => {
        const logo = team.club?.logo || team.image || "";
        if (logo) {
          logoMap.set(team.id, logo);
          console.log(`✅ Logo for team ${team.name} (ID: ${team.id}): ${logo}`);
        } else {
          console.log(`❌ No logo for team ${team.name} (ID: ${team.id})`);
        }
      });

      console.log(`🔍 Created logo map with ${logoMap.size} entries`);
      return logoMap;
    } catch (error) {
      console.error("Failed to get team logos:", error);
      return new Map();
    }
  }

  async getTeamInfo(teamId: number): Promise<KorastatsTeamInfoResponse> {
    const [teamInfo, entityTeam] = await Promise.all([
      this.client.makeRequest<{
        result: string;
        data: KorastatsTeamInfoResponse;
      }>("TeamInfo", {
        team_id: teamId,
      }),
      this.client.makeRequest<{
        result: string;
        data: any;
      }>("EntityTeam", {
        team_id: teamId,
      }),
    ]);

    if (teamInfo.result !== "Success") {
      throw new Error(`Failed to fetch team info: ${teamInfo.result}`);
    }

    // Merge team info with entity data
    return {
      ...teamInfo.data,
      ...entityTeam.data,
    };
  }

  async getTeamStats(leagueId: number, teamId: number, season: string): Promise<any> {
    const response = await this.client.makeRequest<any>("TournamentTeamStats", {
      tournament_id: leagueId,
      team_id: teamId,
      season,
    });

    if (response.result !== "Success") {
      throw new Error(`Failed to fetch team stats: ${response.message}`);
    }

    return response;
  }

  async getTeamFixtures(teamId: number, leagueId: number): Promise<any[]> {
    // Get tournament structure to validate team participation
    const [leagueResponse, matchesResponse] = await Promise.all([
      this.client.makeRequest<{
        result: string;
        data: any;
      }>("TournamentStructure", {
        tournament_id: leagueId,
      }),
      this.client.makeRequest<{
        result: string;
        data: any[];
        message?: string;
      }>("TournamentMatchList", {
        tournament_id: leagueId,
      }),
    ]);

    if (matchesResponse.result !== "Success") {
      throw new Error(`Failed to fetch fixtures: ${matchesResponse.message}`);
    }

    // Filter matches for the specific team
    const teamMatches = (matchesResponse.data || []).filter(
      (match) => match.intHomeTeamID === teamId || match.intAwayTeamID === teamId,
    );

    return teamMatches;
  }

  async getTeamSquad(leagueId: number, teamId: number): Promise<any> {
    const response = await this.client.makeRequest<{
      result: string;
      data: any;
      message?: string;
    }>("TournamentTeamSquad", {
      tournament_id: leagueId,
      team_id: teamId,
    });

    if (response.result !== "Success") {
      throw new Error(`Failed to fetch team squad: ${response.message}`);
    }

    return response.data;
  }

  async getTeamTransfers(teamId: number): Promise<any[]> {
    // Note: Korastats might not have a direct transfers endpoint
    // This would need to be implemented based on available endpoints
    // For now, return empty array
    console.warn("Team transfers not implemented yet - Korastats API endpoint needed");
    return [];
  }

  async getTeamTrophies(teamId: number): Promise<any[]> {
    // Note: Korastats might not have a direct trophies endpoint
    // This would need to be implemented based on available endpoints
    // For now, return empty array
    console.warn("Team trophies not implemented yet - Korastats API endpoint needed");
    return [];
  }

  // ========== OLD TEAM MODULE METHODS ==========

  /**
   * Get team squad (from old module)
   */
  async getTeamSquadOld(league: number, teamId: number): Promise<any> {
    try {
      // 1) Base squad list (teams + players) for the tournament
      const { data: teamListResp } = await this.client.makeRequest<{
        result: string;
        data: any;
      }>("TournamentTeamPlayerList", {
        tournament_id: league,
      });

      // 2) Tournament meta (for league block)
      const { data: tournamentInfo } = await this.client.makeRequest<{
        result: string;
        data: any;
      }>("TournamentStructure", {
        tournament_id: league,
      });

      // Pick the desired team early to avoid unnecessary calls
      const tournament = teamListResp?.data;
      const team =
        tournament?.teams?.find((t: any) => String(t.id) === String(teamId)) || null;

      if (!team || !Array.isArray(team.players)) {
        return this.mapTeamSquads(teamListResp, tournamentInfo, teamId, []);
      }

      const basePlayers: any[] = team.players;

      // 3) Per-player enrichment
      const perPlayerPayloads = await Promise.all(
        basePlayers.map(async (p: any) => {
          const playerId = p?.id;
          if (!playerId) return { playerId: null, info: null, entity: null, stats: null };

          try {
            const [statsResp, infoResp, entityResp] = await Promise.all([
              this.client
                .makeRequest("TournamentPlayerStats", {
                  tournament_id: league,
                  player_id: playerId,
                })
                .then((r: any) => r.data)
                .catch(() => null),
              this.client
                .makeRequest("PlayerInfo", { player_id: playerId })
                .then((r: any) => r.data)
                .catch(() => null),
              this.client
                .makeRequest("EntityPlayer", { player_id: playerId })
                .then((r: any) => r.data)
                .catch(() => null),
            ]);

            return {
              playerId,
              info: infoResp,
              entity: entityResp,
              stats: statsResp,
            };
          } catch (error) {
            console.warn(`Failed to fetch data for player ${playerId}:`, error);
            return { playerId, info: null, entity: null, stats: null };
          }
        }),
      );

      // 4) Map + merge
      return this.mapTeamSquads(teamListResp, tournamentInfo, teamId, perPlayerPayloads);
    } catch (error) {
      console.error("Failed to fetch team squad:", error);
      throw new Error(`Failed to fetch team squad: ${error}`);
    }
  }

  /**
   * Get team form overview (from old module)
   */
  async getTeamFormOverviewOld(league: number): Promise<any> {
    try {
      const { data } = await this.client.makeRequest<{
        result: string;
        data: any;
      }>("TournamentMatchList", {
        tournament_id: league,
      });

      return this.mapTeamFormOverview(data);
    } catch (error) {
      console.error("Failed to fetch team form overview:", error);
      throw new Error(`Failed to fetch team form overview: ${error}`);
    }
  }

  /**
   * Get team lineup (from old module)
   */
  async getTeamLineupOld(league: number): Promise<any> {
    try {
      // Note: This is a placeholder implementation
      // The old module used a hardcoded match_id: 8200
      // You might need to adjust this based on your requirements
      const { data } = await this.client.makeRequest<{
        result: string;
        data: any;
      }>("MatchSummary", {
        match_id: 8200, // This was hardcoded in the old module
      });

      return this.mapTeamLineup(data);
    } catch (error) {
      console.error("Failed to fetch team lineup:", error);
      throw new Error(`Failed to fetch team lineup: ${error}`);
    }
  }

  // ========== MAPPING METHODS (from old module) ==========

  private mapTeamSquads(
    apiResponse: any,
    tournamentInfo: any,
    teamId?: number,
    perPlayerPayloads?: Array<{
      playerId: number;
      info: any;
      entity: any;
      stats: any;
    } | null>,
  ) {
    // Import the mapping function from the helpers
    const { mapTeamSquads } = require("../../../modules/teams/helpers/team-mappers");
    return mapTeamSquads(apiResponse, tournamentInfo, teamId, perPlayerPayloads);
  }

  private mapTeamFormOverview(apiResponse: any) {
    // Import the mapping function from the helpers
    const {
      mapTeamFormOverview,
    } = require("../../../modules/teams/helpers/team-mappers");
    return mapTeamFormOverview(apiResponse);
  }

  private mapTeamLineup(apiResponse: any) {
    // Import the mapping function from the helpers
    const { mapTeamLineup } = require("../../../modules/teams/helpers/team-mappers");
    return mapTeamLineup(apiResponse);
  }
}

