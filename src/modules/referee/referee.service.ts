// src/modules/referee/referee.service.ts
import { RefereeRepository } from "./referee.repository";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";
import {
  RefereeCareerStatsResponse,
  RefereeInfoResponse,
  RefereeMatchStatsResponse,
  RefereeResponse,
} from "@/legacy-types/referee.types";

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
  async getReferees(options: {
    league: number;
    season: number;
  }): Promise<RefereeResponse> {
    return await this.refereeRepository.getReferees(options);
  }

  /**
   * GET /api/referee/available-seasons/ - Get available seasons
   */
  async getAvailableSeasons(refereeId: number): Promise<number[]> {
    return await this.refereeRepository.getAvailableSeasons(refereeId);
  }

  /**
   * GET /api/referee/career-stats/ - Get referee career
   */
  async getRefereeCareer(
    refereeId: number,
    season: number,
  ): Promise<RefereeCareerStatsResponse> {
    return await this.refereeRepository.getRefereeCareer(refereeId, season);
  }

  /**
   * GET /api/referee/fixtures/ - Get referee fixtures
   */
  async getRefereeFixtures(options: {
    referee: number;
    league: number;
  }): Promise<RefereeMatchStatsResponse> {
    return await this.refereeRepository.getRefereeFixtures(options);
  }

  /**
   * GET /api/referee/info/ - Get referee info
   */
  async getRefereeInfo(refereeId: number): Promise<RefereeInfoResponse> {
    return await this.refereeRepository.getRefereeInfo(refereeId);
  }

  /**
   * GET /api/referee/last-match/ - Get referee statistics
   */
  async getRefereeLastMatch(refereeId: number): Promise<FixtureData> {
    return await this.refereeRepository.getRefereeLastMatch(refereeId);
  }
}

