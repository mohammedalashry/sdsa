// src/modules/referee/referee.service.ts
import { RefereeRepository } from "./referee.repository";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

// Simple referee interface
export interface RefereeData {
  id: number;
  name: string;
  nationality: string | null;
  photo: string | null;
}

export class RefereeService {
  constructor(private readonly refereeRepository: RefereeRepository) {}

  /**
   * GET /api/referee/ - Get referees
   */
  async getReferees(options: { league: number; season: number }): Promise<RefereeData[]> {
    return await this.refereeRepository.getReferees(options);
  }

  /**
   * GET /api/referee/available-seasons/ - Get available seasons
   */
  async getAvailableSeasons(refereeId: number): Promise<number[]> {
    return await this.refereeRepository.getAvailableSeasons(refereeId);
  }

  /**
   * GET /api/referee/career/ - Get referee career
   */
  async getRefereeCareer(refereeId: number): Promise<RefereeData[]> {
    return await this.refereeRepository.getRefereeCareer(refereeId);
  }

  /**
   * GET /api/referee/fixtures/ - Get referee fixtures
   */
  async getRefereeFixtures(options: {
    referee: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    return await this.refereeRepository.getRefereeFixtures(options);
  }

  /**
   * GET /api/referee/info/ - Get referee info
   */
  async getRefereeInfo(refereeId: number): Promise<RefereeData> {
    return await this.refereeRepository.getRefereeInfo(refereeId);
  }

  /**
   * GET /api/referee/statistics/ - Get referee statistics
   */
  async getRefereeStatistics(options: {
    referee: number;
    league: number;
    season: number;
  }): Promise<any> {
    return await this.refereeRepository.getRefereeStatistics(options);
  }

  /**
   * GET /api/referee/transfer/ - Get referee transfers
   */
  async getRefereeTransfers(refereeId: number): Promise<any[]> {
    return await this.refereeRepository.getRefereeTransfers(refereeId);
  }

  /**
   * GET /api/referee/career-stats/ - Get referee career statistics
   */
  async getCareerStats(options: { referee: number; season: number }): Promise<any> {
    return await this.refereeRepository.getRefereeStatistics({
      referee: options.referee,
      league: 0, // Default league
      season: options.season,
    });
  }

  /**
   * GET /api/referee/last-match/ - Get referee last match
   */
  async getRefereeLastMatch(refereeId: number): Promise<FixtureDataResponse> {
    return await this.refereeRepository.getRefereeFixtures({
      referee: refereeId,
      league: 0, // Default league
    });
  }
}

