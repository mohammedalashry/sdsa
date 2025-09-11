import { Request, Response } from "express";
import { StandingsService } from "./standings.service";
import { catchAsync } from "../../core/utils/catch-async";
import { StandingsResponse } from "../../legacy-types/standings.types";

export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  /**
   * GET /api/standings/
   * Get standings (league, season)
   */
  retrieve = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const standings: StandingsResponse = await this.standingsService.getStandings({
      league: Number(league),
      season: Number(season),
    });

    res.json(standings);
  });

  /**
   * POST /api/standings/sync
   * Manually sync team data with group standings from Korastats
   */
  syncTeamRankings = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league } = req.body;

    if (!league) {
      res.status(400).json({ error: "League ID is required" });
      return;
    }

    try {
      const result = await this.standingsService.syncTeamRankings(Number(league));

      res.json({
        message: result.message,
        league,
        teamsUpdated: result.teamsUpdated,
        groups: result.groups,
      });
    } catch (error) {
      console.error("Error in syncTeamRankings:", error);
      res.status(500).json({
        error: "Failed to sync team rankings",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

