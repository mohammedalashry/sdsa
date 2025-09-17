// src/modules/leagues/leagues.service.ts
import { LeaguesRepository } from "./leagues.repository";
import { LeagueData, LeagueHistoricalWinner } from "../../legacy-types/leagues.types";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class LeaguesService {
  constructor(private readonly leaguesRepository: LeaguesRepository) {}

  /**
   * GET /api/league/ - Get leagues
   */
  async getLeagues(): Promise<LeagueData[]> {
    return await this.leaguesRepository.getLeagues();
  }

  /**
   * GET /api/league/historical-winners/ - Get historical winners
   */
  async getHistoricalWinners(league: number): Promise<LeagueHistoricalWinner[]> {
    return await this.leaguesRepository.getHistoricalWinners(league);
  }

  /**
   * GET /api/league/last-fixture/ - Get last fixture
   */
  async getLastFixture(league: number): Promise<FixtureDataResponse> {
    return await this.leaguesRepository.getLastFixture(league);
  }

  /**
   * GET /api/league/rounds/ - Get league rounds
   */
  async getLeagueRounds(options: { league: number; season: number }): Promise<string[]> {
    return await this.leaguesRepository.getLeagueRounds(options.league, options.season);
  }
}

