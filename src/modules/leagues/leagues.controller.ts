import { Request, Response } from "express";
import { LeaguesService } from "./leagues.service";
import { catchAsync } from "../../core/utils/catch-async";
import { League } from "../../legacy-types/leagues.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  /**
   * GET /api/league/
   * Get leagues
   */
  retrieve = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const leagues = await this.leaguesService.getLeagues();

    res.json(leagues);
  });

  /**
   * GET /api/league/historical-winners/
   * Get historical winners
   */
  getHistoricalWinners = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { league } = req.query;

      const winners = await this.leaguesService.getHistoricalWinners(Number(league));

      res.json(winners);
    },
  );

  /**
   * GET /api/league/last-fixture/
   * Get last fixture
   */
  getLastFixture = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league } = req.query;

    const fixture: FixtureDataResponse = await this.leaguesService.getLastFixture(
      Number(league),
    );

    res.json(fixture);
  });

  /**
   * GET /api/league/rounds/
   * Get league rounds
   */
  getLeagueRounds = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const rounds = await this.leaguesService.getLeagueRounds({
      league: Number(league),
      season: Number(season),
    });

    res.json(rounds);
  });
}

