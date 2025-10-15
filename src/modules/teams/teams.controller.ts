import { Request, Response } from "express";
import { TeamsService } from "./teams.service";
import { catchAsync } from "../../core/utils/catch-async";
import { TeamsResponse, TeamInfo } from "../../legacy-types/teams.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * GET /api/team/
   * Get teams with filters (league, season)
   */
  getTeams = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const teams: TeamsResponse = await this.teamsService.getTeams({
      league: Number(league),
      season: Number(season),
    });

    res.json(teams);
  });

  /**
   * GET /api/team/available-seasons/
   * Get available seasons for team
   */
  getAvailableSeasons = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const seasons: number[] = await this.teamsService.getAvailableSeasons(Number(team));

    res.json(seasons);
  });

  /**
   * GET /api/team/comparison/stats/
   * Compare team statistics
   */
  getTeamComparisonStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { season, team } = req.query;

      const comparison = await this.teamsService.getTeamComparisonStats({
        season: Number(season),
        team: Number(team),
      });

      res.json(comparison);
    },
  );

  /**
   * GET /api/team/fixtures/
   * Get team fixtures
   */
  getTeamFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season, team } = req.query;

    const fixtures: FixtureDataResponse = await this.teamsService.getTeamFixtures({
      league: Number(league),
      season: Number(season),
      team: Number(team),
    });

    res.json(fixtures);
  });

  /**
   * POST /api/team/follow-team/
   * Follow a team
   */
  followTeam = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team_id } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    await this.teamsService.followTeam(Number(team_id), userId);

    res.status(200).json({}); // Empty response like Python API
  });

  /**
   * GET /api/team/is-following/
   * Check if following team
   */
  isFollowingTeam = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team_id } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const isFollowing: boolean = await this.teamsService.isFollowingTeam(
      Number(team_id),
      userId,
    );

    res.json({ is_following: isFollowing }); // Match Python API field name
  });

  /**
   * POST /api/team/unfollow-team/
   * Unfollow a team
   */
  unfollowTeam = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team_id } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    await this.teamsService.unfollowTeam(Number(team_id), userId);

    res.status(200).json({ message: "Successfully unfollowed the team." }); // Match Python API response
  });

  /**
   * GET /api/team/form-over-time/
   * Get team form over time
   */
  getTeamFormOverTime = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, page, pageSize, season, team } = req.query;

    const formData = await this.teamsService.getTeamFormOverTime({
      league: Number(league),

      season: Number(season),
      team: Number(team),
    });

    res.json(formData);
  });

  /**
   * GET /api/team/upcoming-fixture/
   * Get upcoming fixture for team
   */
  getUpcomingFixture = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const fixture: FixtureDataResponse = await this.teamsService.getUpcomingFixture(
      Number(team),
    );

    res.json(fixture);
  });

  /**
   * GET /api/team/stats/
   * Get team statistics
   */
  getTeamStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season, team } = req.query;

    const stats = await this.teamsService.getTeamStats({
      league: Number(league),
      season: Number(season),
      team: Number(team),
    });

    res.json(stats);
  });

  /**
   * GET /api/team/squad/
   * Get team squad
   */
  getTeamSquad = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const squad = await this.teamsService.getTeamSquad(Number(team));

    res.json(squad);
  });

  /**
   * GET /api/team/position-overtime/
   * Get team position over time
   */
  getTeamPositionOverTime = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { league, season, team } = req.query;

      const positionData = await this.teamsService.getTeamPositionOverTime({
        league: Number(league),
        season: Number(season),
        team: Number(team),
      });

      res.json(positionData);
    },
  );

  /**
   * GET /api/team/last-fixture/
   * Get last fixture for team
   */
  getLastFixture = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const fixture: FixtureDataResponse = await this.teamsService.getLastFixture(
      Number(team),
    );

    res.json(fixture);
  });

  /**
   * GET /api/team/info/
   * Get team information
   */
  getTeamInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const teamInfo: TeamInfo = await this.teamsService.getTeamInfo(Number(team));

    res.json(teamInfo);
  });

  /**
   * GET /api/team/goals-over-time/
   * Get team goals over time
   */
  getTeamGoalsOverTime = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { league, season, team } = req.query;

      const goalsData = await this.teamsService.getTeamGoalsOverTime({
        league: Number(league),
        season: Number(season),
        team: Number(team),
      });

      res.json(goalsData);
    },
  );

  /**
   * GET /api/team/lineup/
   * Get team lineup
   */
  getTeamLineup = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season, team } = req.query;

    const lineup = await this.teamsService.getTeamLineup({
      league: Number(league),
      season: Number(season),
      team: Number(team),
    });

    res.json(lineup);
  });
  getTeamFormOverview = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { team } = req.query;

    const formOverview = await this.teamsService.getTeamFormOverview({
      team: Number(team),
    });

    res.json(formOverview);
  });
}

