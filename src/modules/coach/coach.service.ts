// src/modules/coach/coach.service.ts
import { CoachRepository } from "./coach.repository";
import { CoachData } from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachService {
  constructor(private readonly coachRepository: CoachRepository) {}

  /**
   * GET /api/coach/ - Get coaches
   */
  async getCoaches(options: { league: number; season: number }): Promise<CoachData[]> {
    return await this.coachRepository.getCoaches(options);
  }

  /**
   * GET /api/coach/career/ - Get coach career
   */
  async getCoachCareer(coachId: number): Promise<CoachData[]> {
    return await this.coachRepository.getCoachCareer(coachId);
  }

  /**
   * GET /api/coach/fixtures/ - Get coach fixtures
   */
  async getCoachFixtures(options: {
    coach: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    return await this.coachRepository.getCoachFixtures(options);
  }

  /**
   * GET /api/coach/info/ - Get coach info
   */
  async getCoachInfo(coachId: number): Promise<CoachData> {
    return await this.coachRepository.getCoachInfo(coachId);
  }

  /**
   * GET /api/coach/statistics/ - Get coach statistics
   */
  async getCoachStatistics(options: {
    coach: number;
    league: number;
    season: number;
  }): Promise<any> {
    return await this.coachRepository.getCoachStatistics(options);
  }

  /**
   * GET /api/coach/transfer/ - Get coach transfers
   */
  async getCoachTransfers(coachId: number): Promise<any[]> {
    return await this.coachRepository.getCoachTransfers(coachId);
  }

  /**
   * GET /api/coach/trophies/ - Get coach trophies
   */
  async getCoachTrophies(coachId: number): Promise<any[]> {
    return await this.coachRepository.getCoachTrophies(coachId);
  }
}

