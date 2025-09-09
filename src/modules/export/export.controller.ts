import { Request, Response } from "express";
import { ExportService } from "./export.service";
import { catchAsync } from "../../core/utils/catch-async";

export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /api/export/coach-comparison-page/
   * Export coach comparison page
   */
  getCoachComparisonExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { coach1, coach2, fileType } = req.query;

      const exportData = await this.exportService.getCoachComparisonExport({
        coach1: coach1 as number,
        coach2: coach2 as number,
        fileType: fileType as string,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/homepage/
   * Export homepage data
   */
  getHomepageExport = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fileType, league, season } = req.query;

    const exportData = await this.exportService.getHomepageExport({
      fileType: fileType as string,
      league: league as number,
      season: season as number,
    });

    res.json(exportData);
  });

  /**
   * GET /api/export/leagues-cups/
   * Export leagues and cups
   */
  getLeaguesCupsExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType } = req.query;

      const exportData = await this.exportService.getLeaguesCupsExport({
        fileType: fileType as string,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/leagues-cups-detail/
   * Export leagues and cups detail
   */
  getLeaguesCupsDetailExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, league, round, season } = req.query;

      const exportData = await this.exportService.getLeaguesCupsDetailExport({
        fileType: fileType as string,
        league: league as number,
        round: round as string,
        season: season as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/leagues-teams/
   * Export leagues and teams
   */
  getLeaguesTeamsExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType } = req.query;

      const exportData = await this.exportService.getLeaguesTeamsExport({
        fileType: fileType as string,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/match-detail-page/
   * Export match detail page
   */
  getMatchDetailExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, fixture } = req.query;

      const exportData = await this.exportService.getMatchDetailExport({
        fileType: fileType as string,
        fixture: fixture as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/matches-page/
   * Export matches page
   */
  getMatchesPageExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, league, round, season } = req.query;

      const exportData = await this.exportService.getMatchesPageExport({
        fileType: fileType as string,
        league: league as number,
        round: round as string,
        season: season as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/player-comparison-page/
   * Export player comparison page
   */
  getPlayerComparisonExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, player1, player2 } = req.query;

      const exportData = await this.exportService.getPlayerComparisonExport({
        fileType: fileType as string,
        player1: player1 as number,
        player2: player2 as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/player-detail-page/
   * Export player detail page
   */
  getPlayerDetailExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, league, player, season } = req.query;

      const exportData = await this.exportService.getPlayerDetailExport({
        fileType: fileType as string,
        league: league as number,
        player: player as number,
        season: season as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/referee-comparison-page/
   * Export referee comparison page
   */
  getRefereeComparisonExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, referee1, referee2 } = req.query;

      const exportData = await this.exportService.getRefereeComparisonExport({
        fileType: fileType as string,
        referee1: referee1 as number,
        referee2: referee2 as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/team-comparison-page/
   * Export team comparison page
   */
  getTeamComparisonExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, season1, season2, team1, team2 } = req.query;

      const exportData = await this.exportService.getTeamComparisonExport({
        fileType: fileType as string,
        season1: season1 as number,
        season2: season2 as number,
        team1: team1 as number,
        team2: team2 as number,
      });

      res.json(exportData);
    },
  );

  /**
   * GET /api/export/team-detail-page/
   * Export team detail page
   */
  getTeamDetailExport = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fileType, league, season, team } = req.query;

    const exportData = await this.exportService.getTeamDetailExport({
      fileType: fileType as string,
      league: league as number,
      season: season as number,
      team: team as number,
    });

    res.json(exportData);
  });

  /**
   * GET /api/export/upcoming-match-detail-page/
   * Export upcoming match detail page
   */
  getUpcomingMatchDetailExport = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { fileType, fixture } = req.query;

      const exportData = await this.exportService.getUpcomingMatchDetailExport({
        fileType: fileType as string,
        fixture: fixture as number,
      });

      res.json(exportData);
    },
  );
}

