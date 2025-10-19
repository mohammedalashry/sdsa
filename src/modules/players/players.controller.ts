import { Request, Response } from "express";
import { PlayersService } from "./players.service";
import { catchAsync } from "../../core/utils/catch-async";
import { FixturePlayer, PlayerInfoResponse } from "../../legacy-types/players.types";

export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  /**
   * GET /api/player/career/
   * Get player career data
   */
  getPlayerCareer = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.query;

    const career = await this.playersService.getPlayerCareer(Number(id));

    res.json(career);
  });

  /**
   * GET /api/player/comparison/stats/
   * Compare player statistics
   */
  getPlayerComparisonStats = catchAsync(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.query;

      const comparison = await this.playersService.getPlayerComparisonStats(Number(id));

      res.json(comparison);
    },
  );

  /**
   * GET /api/player/fixtures/
   * Get player fixtures
   */
  getPlayerFixtures = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, league } = req.query;

    const fixtures: FixturePlayer[] = await this.playersService.getPlayerFixtures({
      id: Number(id),
      league: Number(league),
    });

    res.json(fixtures);
  });

  /**
   * GET /api/player/heatmap/
   * Get player heatmap
   */
  getPlayerHeatmap = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { player } = req.query;

    const heatmap = await this.playersService.getPlayerHeatmap({
      player: Number(player),
    });

    res.json(heatmap);
  });

  /**
   * GET /api/player/info/
   * Get player information
   */
  getPlayerInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.query;

    const playerInfo: PlayerInfoResponse = await this.playersService.getPlayerInfo(
      Number(id),
    );

    res.json(playerInfo);
  });

  /**
   * GET /api/player/shotmap/
   * Get player shotmap
   */
  getPlayerShotmap = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { player } = req.query;

    const shotmap = await this.playersService.getPlayerShotmap(Number(player));

    res.json(shotmap);
  });

  /**
   * GET /api/player/stats/
   * Get player statistics
   */
  getPlayerStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id, league, season } = req.query;

    const stats = await this.playersService.getPlayerStats({
      id: Number(id),
      league: Number(league),
      season: Number(season),
    });

    res.json(stats);
  });

  /**
   * GET /api/player/topassists/
   * Get top assists
   */
  getTopAssists = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const topAssists = await this.playersService.getTopAssists({
      league: Number(league),
      season: Number(season),
    });

    res.json(topAssists);
  });

  /**
   * GET /api/player/topscorers/
   * Get top scorers
   */
  getTopScorers = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { league, season } = req.query;

    const topScorers = await this.playersService.getTopScorers({
      league: Number(league),
      season: Number(season),
    });

    res.json(topScorers);
  });

  /**
   * GET /api/player/traits/
   * Get player traits
   */
  getPlayerTraits = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { player } = req.query;

    const traits = await this.playersService.getPlayerTraits(Number(player));

    res.json(traits);
  });

  /**
   * GET /api/player/transfer/
   * Get player transfer data
   */
  getPlayerTransfer = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { player } = req.query;

    const transfers = await this.playersService.getPlayerTransfer(Number(player));

    res.json(transfers);
  });

  /**
   * GET /api/player/trophies/
   * Get player trophies
   */
  getPlayerTrophies = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.query;

    const trophies = await this.playersService.getPlayerTrophies(Number(id));

    res.json(trophies);
  });
}

