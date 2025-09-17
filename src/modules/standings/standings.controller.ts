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
}
