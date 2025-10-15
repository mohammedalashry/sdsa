import { Request, Response } from "express";
import { ExportService } from "./export.service";
import { catchAsync } from "../../core/utils/catch-async";
import { ExportRequest, ExportResponse, ExportData } from "./export.types";
import { FileGenerationService } from "./file-generation.service";
import { ApiError } from "@/core/middleware/error.middleware";
import path from "path";
import fs from "fs";
import { Models } from "../../db/mogodb/models";

export class ExportController {
  private fileGenerationService: FileGenerationService;

  constructor(private readonly exportService: ExportService) {
    this.fileGenerationService = new FileGenerationService();
  }

  /**
   * Helper method to stream file directly to response
   */
  private async streamFile(
    res: Response,
    exportData: ExportData,
    filename: string,
    fileType: "xlsx" | "csv",
  ): Promise<void> {
    let filePath: string;

    if (fileType === "xlsx") {
      filePath = await this.fileGenerationService.generateExcelFile(exportData, filename);

      // Set headers for Excel download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    } else {
      filePath = await this.fileGenerationService.generateCsvFile(exportData, filename);

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    }

    res.setHeader("Content-Length", fs.statSync(filePath).size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up after response finishes
    res.on("finish", () => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    });
  }

  /**
   * GET /api/export/leagues-teams
   * Export leagues and teams
   */
  exportLeaguesTeams = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    const { fileType = "xlsx" } = params;

    // Get leagues and teams
    const leagues = await Models.League.find({}).lean();
    const teams = await Models.Team.find({}).limit(100).lean();

    const exportData: ExportData = {
      leagues: leagues.map((league) => ({
        id: league.korastats_id,
        name: league.name,
        country:
          typeof league.country === "string" ? league.country : league.country?.name,
        logo: league.logo,
        type: league.type,
        current_season: league.seasons?.find((s) => s.current)?.year || 2024,
      })),
      teams: teams.map((team) => ({
        id: team.korastats_id,
        name: team.name,
        country:
          typeof team.country === "string" ? team.country : (team.country as any)?.name,
        logo: team.logo,
        founded: team.founded,
        venue: typeof team.venue === "string" ? team.venue : team.venue?.name,
      })),
    };

    const filename = `leagues_teams_${Date.now()}`;

    // Stream file directly
    await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
  });

  /**
   * GET /api/export/homepage
   * Export homepage data
   */
  exportHomepage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

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

    // Stream file directly
    await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
  });

  /**
   * GET /api/export/matches-page
   * Export matches page data
   */
  exportMatchesPage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    const { league, season, fileType = "xlsx" } = params;

    if (!league || !season) {
      throw new ApiError(400, "League and season are required");
    }

    // Get fixtures for the league and season
    const fixtures = await Models.Match.find({
      "league.id": league,
      "league.season": season,
    }).lean();

    const exportData: ExportData = {
      matches: fixtures.map((fixture) => ({
        id: fixture.korastats_id,
        home_team: fixture.teams?.home?.name,
        away_team: fixture.teams?.away?.name,
        date: fixture.fixture?.date,
        status: fixture.fixture?.status?.short,
        score: fixture.goals,
        league: fixture.league?.name,
        season: fixture.league?.season,
      })),
    };

    const filename = `matches_${league}_${season}_${Date.now()}`;

    // Stream file directly
    await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
  });

  /**
   * GET /api/export/match-detail-page
   * Export match detail page
   */
  exportMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { fixture, fileType = "xlsx" } = params;

      if (!fixture) {
        throw new ApiError(400, "Fixture ID is required");
      }

      // Get match details
      const matchDetails = await Models.MatchDetails.findOne({
        korastats_id: fixture,
      }).lean();

      if (!matchDetails) {
        throw new ApiError(404, "Match details not found");
      }

      const exportData: ExportData = {
        match_details: [
          {
            fixture_id: matchDetails.korastats_id,
            tournament_id: matchDetails.tournament_id,
            note: "Match details available - detailed data structure coming soon",
          },
        ],
        timeline:
          matchDetails.timelineData?.map((event) => ({
            time: event.time?.elapsed,
            type: event.type,
            detail: event.detail,
            player: event.player?.name,
            team: event.team?.name,
          })) || [],
      };

      const filename = `match_detail_${fixture}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/upcoming-match-detail-page
   * Export upcoming match detail page
   */
  exportUpcomingMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { fixture, fileType = "xlsx" } = params;

      if (!fixture) {
        throw new ApiError(400, "Fixture ID is required");
      }

      // Get upcoming match details (same as match detail for now)
      const matchDetails = await Models.MatchDetails.findOne({
        korastats_id: fixture,
      }).lean();

      if (!matchDetails) {
        throw new ApiError(404, "Match details not found");
      }

      const exportData: ExportData = {
        upcoming_match: [
          {
            fixture_id: matchDetails.korastats_id,
            tournament_id: matchDetails.tournament_id,
            note: "Upcoming match details available - detailed data structure coming soon",
          },
        ],
      };

      const filename = `upcoming_match_${fixture}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/leagues-cups
   * Export leagues and cups
   */
  exportLeaguesCups = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    const { fileType = "xlsx" } = params;

    // Get leagues and cups
    const leagues = await Models.League.find({}).lean();
    const teams = await Models.Team.find({}).limit(100).lean();

    const exportData: ExportData = {
      leagues: leagues.map((league) => ({
        id: league.korastats_id,
        name: league.name,
        country:
          typeof league.country === "string" ? league.country : league.country?.name,
        logo: league.logo,
        type: league.type,
        current_season: league.seasons?.find((s) => s.current)?.year || 2024,
      })),
      teams: teams.map((team) => ({
        id: team.korastats_id,
        name: team.name,
        country:
          typeof team.country === "string" ? team.country : (team.country as any)?.name,
        logo: team.logo,
        founded: team.founded,
        venue: typeof team.venue === "string" ? team.venue : team.venue?.name,
      })),
    };

    const filename = `leagues_cups_${Date.now()}`;

    // Stream file directly
    await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
  });

  /**
   * GET /api/export/leagues-cups-detail
   * Export league/cup detail
   */
  exportLeaguesCupsDetail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { league, season, fileType = "xlsx" } = params;

      if (!league || !season) {
        throw new ApiError(400, "League and season are required");
      }

      // Get league details
      const leagueDetails = await Models.League.findOne({
        korastats_id: league,
      }).lean();

      if (!leagueDetails) {
        throw new ApiError(404, "League not found");
      }

      // Get standings for the league and season
      const standings = await Models.Standings.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      const exportData: ExportData = {
        league_details: [
          {
            id: leagueDetails.korastats_id,
            name: leagueDetails.name,
            country:
              typeof leagueDetails.country === "string"
                ? leagueDetails.country
                : leagueDetails.country?.name,
            logo: leagueDetails.logo,
            type: leagueDetails.type,
            season: season,
          },
        ],
        standings: standings.map((standing) => ({
          position: standing.seasons?.[0]?.standings?.[0]?.rank || 0,
          team: standing.seasons?.[0]?.standings?.[0]?.team?.name || "Unknown",
          points: standing.seasons?.[0]?.standings?.[0]?.points || 0,
          played: standing.seasons?.[0]?.standings?.[0]?.all?.played || 0,
          won: standing.seasons?.[0]?.standings?.[0]?.all?.win || 0,
          drawn: standing.seasons?.[0]?.standings?.[0]?.all?.draw || 0,
          lost: standing.seasons?.[0]?.standings?.[0]?.all?.lose || 0,
        })),
      };

      const filename = `league_detail_${league}_${season}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/player-detail-page
   * Export player detail page
   */
  exportPlayerDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { player, fileType = "xlsx" } = params;

      if (!player) {
        throw new ApiError(400, "Player ID is required");
      }

      // Get player details
      const playerDetails = await Models.Player.findOne({
        korastats_id: player,
      }).lean();

      if (!playerDetails) {
        throw new ApiError(404, "Player not found");
      }

      const exportData: ExportData = {
        player_details: [
          {
            id: playerDetails.korastats_id,
            name: playerDetails.name,
            age: playerDetails.age,
            position: playerDetails.positions?.primary?.name,
            team: playerDetails.current_team?.name,
            nationality: playerDetails.nationality,
            height: playerDetails.height,
            weight: playerDetails.weight,
            photo: playerDetails.photo,
          },
        ],
      };

      const filename = `player_detail_${player}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/team-detail-page
   * Export team detail page
   */
  exportTeamDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { team, fileType = "xlsx" } = params;

      if (!team) {
        throw new ApiError(400, "Team ID is required");
      }

      // Get team details
      const teamDetails = await Models.Team.findOne({
        korastats_id: team,
      }).lean();

      if (!teamDetails) {
        throw new ApiError(404, "Team not found");
      }

      const exportData: ExportData = {
        team_details: [
          {
            id: teamDetails.korastats_id,
            name: teamDetails.name,
            country:
              typeof teamDetails.country === "string"
                ? teamDetails.country
                : (teamDetails.country as any)?.name,
            logo: teamDetails.logo,
            founded: teamDetails.founded,
            venue:
              typeof teamDetails.venue === "string"
                ? teamDetails.venue
                : teamDetails.venue?.name,
            venue_capacity:
              typeof teamDetails.venue === "object" ? teamDetails.venue?.capacity : null,
          },
        ],
      };

      const filename = `team_detail_${team}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/player-comparison-page
   * Export player comparison page
   */
  exportPlayerComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { player1, player2, fileType = "xlsx" } = params;

      if (!player1 || !player2) {
        throw new ApiError(400, "Both player IDs are required");
      }

      const exportData: ExportData = {
        comparison: [
          {
            type: "Player Comparison",
            player1_id: player1,
            player2_id: player2,
            note: "Detailed comparison data will be available soon",
          },
        ],
      };

      const filename = `player_comparison_${player1}_${player2}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/team-comparison-page
   * Export team comparison page
   */
  exportTeamComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { team1, team2, season1, season2, fileType = "xlsx" } = params;

      if (!team1 || !team2) {
        throw new ApiError(400, "Both team IDs are required");
      }

      const exportData: ExportData = {
        comparison: [
          {
            type: "Team Comparison",
            team1_id: team1,
            team2_id: team2,
            season1: season1 || "Current",
            season2: season2 || "Current",
            note: "Detailed comparison data will be available soon",
          },
        ],
      };

      const filename = `team_comparison_${team1}_${team2}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/coach-comparison-page
   * Export coach comparison page
   */
  exportCoachComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { coach1, coach2, fileType = "xlsx" } = params;

      if (!coach1 || !coach2) {
        throw new ApiError(400, "Both coach IDs are required");
      }

      const exportData: ExportData = {
        comparison: [
          {
            type: "Coach Comparison",
            coach1_id: coach1,
            coach2_id: coach2,
            note: "Detailed comparison data will be available soon",
          },
        ],
      };

      const filename = `coach_comparison_${coach1}_${coach2}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/referee-comparison-page
   * Export referee comparison page
   */
  exportRefereeComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const { referee1, referee2, fileType = "xlsx" } = params;

      if (!referee1 || !referee2) {
        throw new ApiError(400, "Both referee IDs are required");
      }

      const exportData: ExportData = {
        comparison: [
          {
            type: "Referee Comparison",
            referee1_id: referee1,
            referee2_id: referee2,
            note: "Detailed comparison data will be available soon",
          },
        ],
      };

      const filename = `referee_comparison_${referee1}_${referee2}_${Date.now()}`;

      // Stream file directly
      await this.streamFile(res, exportData, filename, fileType as "xlsx" | "csv");
    },
  );

  /**
   * GET /api/export/download/:filename
   * Download exported file
   */
  downloadFile = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { filename } = req.params;

    if (!filename) {
      throw new ApiError(400, "Filename is required");
    }

    // Extract filename and extension
    const fileExtension = path.extname(filename).slice(1);
    const baseFilename = path.basename(filename, `.${fileExtension}`);

    if (!["xlsx", "csv"].includes(fileExtension)) {
      throw new ApiError(400, "Invalid file type. Only xlsx and csv files are supported");
    }

    const filePath = this.fileGenerationService.getFilePath(
      baseFilename,
      fileExtension as "xlsx" | "csv",
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, "File not found or has expired");
    }

    // Set appropriate headers
    const contentType =
      fileExtension === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", fs.statSync(filePath).size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);

    // Handle stream errors
    fileStream.on("error", (error) => {
      console.error("Error streaming file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to download file" });
      }
    });

    // Clean up after response finishes
    res.on("finish", () => {
      // Optional: Delete file after successful download
      // Uncomment if you want to auto-delete files after download
      // try {
      //   fs.unlinkSync(filePath);
      // } catch (err) {
      //   console.error("Failed to delete file:", err);
      // }
    });

    fileStream.pipe(res);
  });
}

