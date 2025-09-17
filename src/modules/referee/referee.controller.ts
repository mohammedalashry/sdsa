import { Request, Response } from "express";
import { RefereeService } from "./referee.service";
import { catchAsync } from "../../core/utils/catch-async";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";
import { RefereeMatchStatsResponse } from "@/legacy-types/referee.types";

export class RefereeController {
  constructor(private readonly refereeService: RefereeService) {}

  /**
   * GET /api/referee/
   * Get referees (league, season)
   */
  getAllReferees = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const referees = await this.refereeService.getReferees({
      league: Number(league),
      season: Number(season),
    });

    res.json(referees);
  });

  /**
   * GET /api/referee/available-seasons/
   * Get available seasons for referee
   */
  getAvailableSeasons = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { referee } = req.query;

    const seasons: number[] = await this.refereeService.getAvailableSeasons(
      Number(referee),
    );

    res.json(seasons);
  });

  /**
   * GET /api/referee/career-stats/
   * Get referee career statistics
   */
  getCareerStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { referee } = req.query;

    const stats = await this.refereeService.getRefereeCareer(Number(referee));

    res.json(stats);
  });

  /**
   * GET /api/referee/fixtures/
   * Get referee fixtures
   */
  getRefereeFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, referee } = req.query;

    const fixtures: RefereeMatchStatsResponse =
      await this.refereeService.getRefereeFixtures({
        referee: Number(referee),
        league: Number(league),
      });

    res.json(fixtures);
  });

  /**
   * GET /api/referee/info/
   * Get referee information
   */
  getRefereeInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { referee } = req.query;

    const refereeInfo = await this.refereeService.getRefereeInfo(Number(referee));

    res.json(refereeInfo);
  });

  /**
   * GET /api/referee/last-match/
   * Get referee last match
   */
  getRefereeLastMatch = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { referee } = req.query;

    const match: FixtureData = await this.refereeService.getRefereeLastMatch(
      Number(referee),
    );

    res.json(match);
  });
}

