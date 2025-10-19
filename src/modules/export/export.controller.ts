import { Request, Response } from "express";
import { ExportService } from "./export.service";
import { catchAsync } from "../../core/utils/catch-async";
import { ExportRequest } from "./export.types";

export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * GET /api/export/leagues-teams
   * Export leagues and teams
   */
  exportLeaguesTeams = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;
    await this.exportService.exportLeaguesTeams(res, params);
  });

  /**
   * GET /api/export/homepage
   * Export homepage data
   */
  exportHomepage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;
    await this.exportService.exportHomepage(res, params);
  });

  /**
   * GET /api/export/matches-page
   * Export matches page data
   */
  exportMatchesPage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;
    await this.exportService.exportMatchesPage(res, params);
  });

  /**
   * GET /api/export/match-detail-page
   * Export match detail page data
   */
  exportMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportMatchDetailPage(res, params);
    },
  );

  /**
   * GET /api/export/upcoming-match-detail-page
   * Export upcoming match detail page data
   */
  exportUpcomingMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportUpcomingMatchDetailPage(res, params);
    },
  );

  /**
   * GET /api/export/leagues-cups
   * Export leagues and cups data
   */
  exportLeaguesCups = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;
    await this.exportService.exportLeaguesCups(res, params);
  });

  /**
   * GET /api/export/leagues-cups-detail
   * Export leagues and cups detail data
   */
  exportLeaguesCupsDetail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportLeaguesCupsDetail(res, params);
    },
  );

  /**
   * GET /api/export/player-detail-page
   * Export player detail page data
   */
  exportPlayerDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportPlayerDetailPage(res, params);
    },
  );

  /**
   * GET /api/export/team-detail-page
   * Export team detail page data
   */
  exportTeamDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportTeamDetailPage(res, params);
    },
  );

  /**
   * GET /api/export/player-comparison-page
   * Export player comparison page data
   */
  exportPlayerComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportPlayerComparisonPage(res, params);
    },
  );

  /**
   * GET /api/export/team-comparison-page
   * Export team comparison page data
   */
  exportTeamComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportTeamComparisonPage(res, params);
    },
  );

  /**
   * GET /api/export/coach-comparison-page
   * Export coach comparison page data
   */
  exportCoachComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportCoachComparisonPage(res, params);
    },
  );

  /**
   * GET /api/export/referee-comparison-page
   * Export referee comparison page data
   */
  exportRefereeComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;
      await this.exportService.exportRefereeComparisonPage(res, params);
    },
  );
}

