// src/modules/players/players.service.ts
import { PlayersRepository } from "./players.repository";
import {
  PlayerShotMapResponse,
  PlayerHeatMapResponse,
  PlayerStatsResponse,
  TopAssistsResponse,
  TopScorersResponse,
  PlayerTransfersResponse,
  TrophiesResponse,
  PlayerCareerResponse,
  PlayerTraitsResponse,
  PlayerInfoResponse,
  FixturePlayer,
} from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class PlayersService {
  constructor(private readonly playersRepository: PlayersRepository) {}

  /**
   * GET /api/player/career/ - Get player career data
   */
  async getPlayerCareer(playerId: number): Promise<PlayerCareerResponse> {
    return await this.playersRepository.getPlayerCareer(playerId);
  }

  /**
   * GET /api/player/comparison/stats/ - Compare player statistics
   */
  async getPlayerComparisonStats(playerId: number): Promise<PlayerStatsResponse> {
    return await this.playersRepository.getPlayerComparisonStats(playerId);
  }

  /**
   * GET /api/player/fixtures/ - Get player fixtures
   */
  async getPlayerFixtures(options: {
    id: number;
    league: number;
  }): Promise<FixturePlayer[]> {
    return await this.playersRepository.getPlayerFixtures(options.id);
  }

  /**
   * GET /api/player/heatmap/ - Get player heatmap
   */
  async getPlayerHeatmap(options: { player: number }): Promise<PlayerHeatMapResponse> {
    return await this.playersRepository.getPlayerHeatmap(options);
  }

  /**
   * GET /api/player/info/ - Get player information
   */
  async getPlayerInfo(playerId: number): Promise<PlayerInfoResponse> {
    return await this.playersRepository.getPlayerInfo(playerId);
  }

  /**
   * GET /api/player/shotmap/ - Get player shotmap
   */
  async getPlayerShotmap(playerId: number): Promise<PlayerShotMapResponse> {
    return await this.playersRepository.getPlayerShotmap(playerId);
  }

  /**
   * GET /api/player/stats/ - Get player statistics
   */
  async getPlayerStats(options: {
    id: number;
    league: number;
    season: number;
  }): Promise<PlayerStatsResponse> {
    return await this.playersRepository.getPlayerStats(options.id);
  }

  /**
   * GET /api/player/topassists/ - Get top assists
   */
  async getTopAssists(options: {
    league: number;
    season: number;
  }): Promise<TopAssistsResponse> {
    return await this.playersRepository.getTopAssists(options);
  }

  /**
   * GET /api/player/topscorers/ - Get top scorers
   */
  async getTopScorers(options: {
    league: number;
    season: number;
  }): Promise<TopScorersResponse> {
    return await this.playersRepository.getTopScorers(options);
  }

  /**
   * GET /api/player/traits/ - Get player traits
   */
  async getPlayerTraits(playerId: number): Promise<PlayerTraitsResponse> {
    return await this.playersRepository.getPlayerTraits(playerId);
  }

  /**
   * GET /api/player/transfer/ - Get player transfer data
   */
  async getPlayerTransfer(playerId: number): Promise<PlayerTransfersResponse> {
    return await this.playersRepository.getPlayerTransfer(playerId);
  }

  /**
   * GET /api/player/trophies/ - Get player trophies
   */
  async getPlayerTrophies(playerId: number): Promise<TrophiesResponse> {
    return await this.playersRepository.getPlayerTrophies(playerId);
  }
}

