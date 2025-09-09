import { Request, Response } from "express";
import { CoachService } from "./coach.service";
import { catchAsync } from "../../core/utils/catch-async";
import { CoachData } from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  /**
   * GET /api/coach/
   * Get coaches (league, season)
   */
  getAllCoaches = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const coaches: CoachData[] = await this.coachService.getCoaches({
      league: Number(league),
      season: Number(season),
    });

    res.json(coaches);
  });

  /**
   * GET /api/coach/available-leagues/
   * Get available leagues for coach
   */
  getAvailableLeagues = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const leagues = await this.coachService.getAvailableLeagues(coach as number);

    res.json(leagues);
  });

  /**
   * GET /api/coach/career/
   * Get coach career
   */
  getCoachCareer = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const career = await this.coachService.getCoachCareer(coach as number);

    res.json(career);
  });

  /**
   * GET /api/coach/career_stats/
   * Get coach career statistics
   */
  getCoachCareerStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const stats = await this.coachService.getCoachCareerStats(coach as number);

    res.json(stats);
  });

  /**
   * GET /api/coach/fixtures/
   * Get coach fixtures
   */
  getCoachFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const fixtures: FixtureDataResponse = await this.coachService.getCoachFixtures(
      coach as number,
    );

    res.json(fixtures);
  });

  /**
   * GET /api/coach/info/
   * Get coach information
   */
  getCoachInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const coachInfo: CoachData = await this.coachService.getCoachInfo(coach as number);

    res.json(coachInfo);
  });

  /**
   * GET /api/coach/last-match/
   * Get coach last match
   */
  getCoachLastMatch = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const match: FixtureDataResponse = await this.coachService.getCoachLastMatch(
      coach as number,
    );

    res.json(match);
  });

  /**
   * GET /api/coach/match-stats/
   * Get coach match statistics
   */
  getCoachMatchStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach, league } = req.query;

    const stats = await this.coachService.getCoachMatchStats({
      coach: coach as number,
      league: league as number,
    });

    res.json(stats);
  });

  /**
   * GET /api/coach/performance/
   * Get coach performance
   */
  getCoachPerformance = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const performance = await this.coachService.getCoachPerformance(coach as number);

    res.json(performance);
  });

  /**
   * GET /api/coach/team-form/
   * Get coach team form
   */
  getCoachTeamForm = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { fixture } = req.query;

    const teamForm = await this.coachService.getCoachTeamForm(fixture as number);

    res.json(teamForm);
  });

  /**
   * GET /api/coach/trophies/
   * Get coach trophies
   */
  getCoachTrophies = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { coach } = req.query;

    const trophies = await this.coachService.getCoachTrophies(coach as number);

    res.json(trophies);
  });
}

