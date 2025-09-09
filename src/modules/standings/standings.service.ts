// src/modules/standings/standings.service.ts
import { StandingsRepository } from "./standings.repository";
import { StandingsResponse } from "../../legacy-types/standings.types";

export class StandingsService {
  constructor(private readonly standingsRepository: StandingsRepository) {}

  /**
   * GET /api/standings/ - Get standings
   */
  async getStandings(options: {
    league: number;
    season: number;
  }): Promise<StandingsResponse> {
    return await this.standingsRepository.getStandings(options.league, options.season);
  }
}

