import { ExportRequest, ExportResponse, ExportData, FileType } from "./export.types";
import { ApiError } from "@/core/middleware/error.middleware";
import { Models } from "@/db/mogodb/models";
import { FileGenerationService } from "./file-generation.service";

export class ExportService {
  private fileGenerationService: FileGenerationService;

  constructor() {
    this.fileGenerationService = new FileGenerationService();
  }
  /**
   * Export leagues and teams
   */
  async exportLeaguesTeams(params: ExportRequest): Promise<ExportResponse> {
    try {
      const fileType = params.fileType || "xlsx";

      // Get leagues from MongoDB
      const leagues = await Models.League.find({}).lean();
      const teams = await Models.Team.find({}).lean();

      const exportData: ExportData = {
        leagues: leagues.map((league) => ({
          id: league.korastats_id,
          name: league.name,
          type: league.type,
          logo: league.logo,
          country: league.country,
        })),
        teams: teams.map((team) => ({
          id: team.korastats_id,
          name: team.name,
          logo: team.logo,
          country: team.country,
        })),
      };

      const filename = `leagues_teams_${Date.now()}`;
      const downloadUrl = await this.fileGenerationService.generateDownloadUrl(
        exportData,
        filename,
        fileType,
      );

      return {
        success: true,
        message: "Leagues and teams exported successfully",
        filename,
        downloadUrl,
      };
    } catch (error) {
      console.error("Export leagues teams error:", error);
      throw new ApiError(500, "Failed to export leagues and teams");
    }
  }

  /**
   * Export homepage data
   */
  async exportHomepage(params: ExportRequest): Promise<ExportResponse> {
    try {
      const { league, season, fileType = "xlsx" } = params;

      if (!league || !season) {
        throw new ApiError(400, "League and season are required");
      }

      // Get fixtures for the league and season
      const fixtures = await Models.Match.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      // Get standings (simplified)
      const standings = await Models.Standings.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      // Get top players (simplified)
      const players = await Models.Player.find({}).limit(20).lean();

      const exportData: ExportData = {
        fixtures: fixtures.map((fixture) => ({
          id: fixture.korastats_id,
          home_team: fixture.teams?.home?.name,
          away_team: fixture.teams?.away?.name,
          date: fixture.fixture?.date,
          status: fixture.fixture?.status?.short,
          score: fixture.goals,
        })),
        standings: standings.map((standing) => ({
          position: standing.seasons?.[0]?.standings?.[0]?.rank || 0,
          team: standing.seasons?.[0]?.standings?.[0]?.team?.name || "Unknown",
          points: standing.seasons?.[0]?.standings?.[0]?.points || 0,
          played: standing.seasons?.[0]?.standings?.[0]?.all?.played || 0,
          won: standing.seasons?.[0]?.standings?.[0]?.all?.win || 0,
          drawn: standing.seasons?.[0]?.standings?.[0]?.all?.draw || 0,
          lost: standing.seasons?.[0]?.standings?.[0]?.all?.lose || 0,
        })),
        top_players: players.map((player) => ({
          id: player.korastats_id,
          name: player.name,
          position: player.positions?.primary?.name,
          team: player.current_team?.name,
          goals: 0, // Player statistics not available in current schema
          assists: 0, // Player statistics not available in current schema
        })),
      };

      const filename = `homepage_${league}_${season}_${Date.now()}`;
      const downloadUrl = await this.fileGenerationService.generateDownloadUrl(
        exportData,
        filename,
        fileType,
      );

      return {
        success: true,
        message: "Homepage data exported successfully",
        filename,
        downloadUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export homepage error:", error);
      throw new ApiError(500, "Failed to export homepage data");
    }
  }

  /**
   * Export match detail page
   */
  async exportMatchDetailPage(params: ExportRequest): Promise<ExportResponse> {
    try {
      const { fixture, fileType = "xlsx" } = params;

      if (!fixture) {
        throw new ApiError(400, "Fixture ID is required");
      }

      // Get fixture details
      const fixtureData = await Models.Match.findOne({
        korastats_id: fixture,
      }).lean();

      if (!fixtureData) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get match details
      const matchDetails = await Models.MatchDetails.findOne({
        korastats_id: fixture,
      }).lean();

      const exportData: ExportData = {
        fixture: [
          {
            id: fixtureData.korastats_id,
            home_team: fixtureData.teams?.home?.name,
            away_team: fixtureData.teams?.away?.name,
            date: fixtureData.fixture?.date,
            status: fixtureData.fixture?.status?.short,
            score: fixtureData.goals,
            league: fixtureData.league?.name,
          },
        ],
        events:
          matchDetails?.timelineData?.map((event) => ({
            time: event.time?.elapsed,
            team: event.team?.name,
            player: event.player?.name,
            type: event.type,
            detail: event.detail,
          })) || [],
        statistics:
          matchDetails?.statisticsData?.map((stat) => ({
            team: stat.team?.name,
            type: stat.statistics?.[0]?.type || "Unknown",
            value: stat.statistics?.[0]?.value || 0,
          })) || [],
      };

      const filename = `match_detail_${fixture}_${Date.now()}`;
      const downloadUrl = await this.fileGenerationService.generateDownloadUrl(
        exportData,
        filename,
        fileType,
      );

      return {
        success: true,
        message: "Match detail data exported successfully",
        filename,
        downloadUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export match detail error:", error);
      throw new ApiError(500, "Failed to export match detail data");
    }
  }

  /**
   * Export player detail page
   */
  async exportPlayerDetailPage(params: ExportRequest): Promise<ExportResponse> {
    try {
      const { player, league, season, fileType = "xlsx" } = params;

      if (!player || !league || !season) {
        throw new ApiError(400, "Player ID, league ID, and season are required");
      }

      // Get player data
      const playerData = await Models.Player.findOne({
        korastats_id: player,
      }).lean();

      if (!playerData) {
        throw new ApiError(404, "Player not found");
      }

      const exportData: ExportData = {
        player_info: [
          {
            id: playerData.korastats_id,
            name: playerData.name,
            age: playerData.age,
            position: playerData.positions?.primary?.name,
            nationality: playerData.nationality,
            team: playerData.current_team?.name,
            height: playerData.height,
            weight: playerData.weight,
          },
        ],
        statistics: [
          {
            goals: 0, // Player statistics not available in current schema
            assists: 0, // Player statistics not available in current schema
            shots: 0, // Player statistics not available in current schema
            passes: 0, // Player statistics not available in current schema
            tackles: 0, // Player statistics not available in current schema
            cards: 0, // Player statistics not available in current schema
          },
        ],
      };

      const filename = `player_detail_${player}_${Date.now()}`;
      const downloadUrl = await this.fileGenerationService.generateDownloadUrl(
        exportData,
        filename,
        fileType,
      );

      return {
        success: true,
        message: "Player detail data exported successfully",
        filename,
        downloadUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export player detail error:", error);
      throw new ApiError(500, "Failed to export player detail data");
    }
  }

  /**
   * Export team detail page
   */
  async exportTeamDetailPage(params: ExportRequest): Promise<ExportResponse> {
    try {
      const { team, league, season, fileType = "xlsx" } = params;

      if (!team || !league || !season) {
        throw new ApiError(400, "Team ID, league ID, and season are required");
      }

      // Get team data
      const teamData = await Models.Team.findOne({
        korastats_id: team,
      }).lean();

      if (!teamData) {
        throw new ApiError(404, "Team not found");
      }

      // Get team players
      const players = await Models.Player.find({
        "current_team.id": team,
      }).lean();

      const exportData: ExportData = {
        team_info: [
          {
            id: teamData.korastats_id,
            name: teamData.name,
            logo: teamData.logo,
            country: teamData.country,
            founded: teamData.founded,
          },
        ],
        squad: players.map((player) => ({
          id: player.korastats_id,
          name: player.name,
          position: player.positions?.primary?.name,
          age: player.age,
          nationality: player.nationality,
          goals: 0, // Player statistics not available in current schema
          assists: 0, // Player statistics not available in current schema
        })),
      };

      const filename = `team_detail_${team}_${Date.now()}`;
      const downloadUrl = await this.fileGenerationService.generateDownloadUrl(
        exportData,
        filename,
        fileType,
      );

      return {
        success: true,
        message: "Team detail data exported successfully",
        filename,
        downloadUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export team detail error:", error);
      throw new ApiError(500, "Failed to export team detail data");
    }
  }
}

