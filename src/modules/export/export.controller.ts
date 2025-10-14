import { Request, Response } from "express";
import { ExportService } from "./export.service";
import { catchAsync } from "../../core/utils/catch-async";
import { ExportRequest, ExportResponse } from "./export.types";
import { FileGenerationService } from "./file-generation.service";
import { ApiError } from "@/core/middleware/error.middleware";
import path from "path";
import fs from "fs";

export class ExportController {
  private fileGenerationService: FileGenerationService;

  constructor(private readonly exportService: ExportService) {
    this.fileGenerationService = new FileGenerationService();
  }

  /**
   * GET /api/export/leagues-teams
   * Export leagues and teams
   */
  exportLeaguesTeams = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    const result: ExportResponse = await this.exportService.exportLeaguesTeams(params);

    res.json(result);
  });

  /**
   * GET /api/export/homepage
   * Export homepage data
   */
  exportHomepage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    const result: ExportResponse = await this.exportService.exportHomepage(params);

    res.json(result);
  });

  /**
   * GET /api/export/matches-page
   * Export matches page data
   */
  exportMatchesPage = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    // For now, use the same logic as homepage
    const result: ExportResponse = await this.exportService.exportHomepage(params);

    res.json(result);
  });

  /**
   * GET /api/export/match-detail-page
   * Export match detail page
   */
  exportMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const result: ExportResponse =
        await this.exportService.exportMatchDetailPage(params);

      res.json(result);
    },
  );

  /**
   * GET /api/export/upcoming-match-detail-page
   * Export upcoming match detail page
   */
  exportUpcomingMatchDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, use the same logic as match detail page
      const result: ExportResponse =
        await this.exportService.exportMatchDetailPage(params);

      res.json(result);
    },
  );

  /**
   * GET /api/export/leagues-cups
   * Export leagues and cups
   */
  exportLeaguesCups = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const params: ExportRequest = req.query as any;

    // For now, use the same logic as leagues-teams
    const result: ExportResponse = await this.exportService.exportLeaguesTeams(params);

    res.json(result);
  });

  /**
   * GET /api/export/leagues-cups-detail
   * Export league/cup detail
   */
  exportLeaguesCupsDetail = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, use the same logic as homepage
      const result: ExportResponse = await this.exportService.exportHomepage(params);

      res.json(result);
    },
  );

  /**
   * GET /api/export/player-detail-page
   * Export player detail page
   */
  exportPlayerDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const result: ExportResponse =
        await this.exportService.exportPlayerDetailPage(params);

      res.json(result);
    },
  );

  /**
   * GET /api/export/team-detail-page
   * Export team detail page
   */
  exportTeamDetailPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      const result: ExportResponse =
        await this.exportService.exportTeamDetailPage(params);

      res.json(result);
    },
  );

  /**
   * GET /api/export/player-comparison-page
   * Export player comparison page
   */
  exportPlayerComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, return a placeholder response
      const result: ExportResponse = {
        success: true,
        message: "Player comparison export - feature coming soon",
        filename: `player_comparison_${params.player1}_${params.player2}_${Date.now()}`,
      };

      res.json(result);
    },
  );

  /**
   * GET /api/export/team-comparison-page
   * Export team comparison page
   */
  exportTeamComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, return a placeholder response
      const result: ExportResponse = {
        success: true,
        message: "Team comparison export - feature coming soon",
        filename: `team_comparison_${params.team1}_${params.team2}_${Date.now()}`,
      };

      res.json(result);
    },
  );

  /**
   * GET /api/export/coach-comparison-page
   * Export coach comparison page
   */
  exportCoachComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, return a placeholder response
      const result: ExportResponse = {
        success: true,
        message: "Coach comparison export - feature coming soon",
        filename: `coach_comparison_${params.coach1}_${params.coach2}_${Date.now()}`,
      };

      res.json(result);
    },
  );

  /**
   * GET /api/export/referee-comparison-page
   * Export referee comparison page
   */
  exportRefereeComparisonPage = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const params: ExportRequest = req.query as any;

      // For now, return a placeholder response
      const result: ExportResponse = {
        success: true,
        message: "Referee comparison export - feature coming soon",
        filename: `referee_comparison_${params.referee1}_${params.referee2}_${Date.now()}`,
      };

      res.json(result);
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

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after download (optional)
    fileStream.on("end", () => {
      // Optionally delete the file after download
      fs.unlinkSync(filePath);
    });
  });
}

