// src/modules/coach/coach.service.ts
import { CoachRepository } from "./coach.repository";
import {
  CoachDataResponse,
  CoachInfoResponse,
  CoachCareerResponse,
  CoachCareerStatsResponse,
} from "../../legacy-types/coach.types";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachService {
  constructor(private readonly coachRepository: CoachRepository) {}

  /**
   * GET /api/coach/ - Get coaches
   */
  async getCoaches(options: {
    league: number;
    season: number;
  }): Promise<CoachDataResponse> {
    return await this.coachRepository.getCoaches(options);
  }

  /**
   * GET /api/coach/career/ - Get coach career
   */
  async getCoachCareer(coachId: number): Promise<CoachCareerResponse> {
    return await this.coachRepository.getCoachCareer(coachId);
  }

  /**
   * GET /api/coach/fixtures/ - Get coach fixtures
   */
  async getCoachFixtures(options: {
    coachId: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    return await this.coachRepository.getCoachFixtures(options);
  }

  /**
   * GET /api/coach/info/ - Get coach info
   */
  async getCoachInfo(coachId: number): Promise<CoachInfoResponse> {
    return await this.coachRepository.getCoachInfo(coachId);
  }

  /**
   * GET /api/coach/career_stats/ - Get coach statistics
   */

  /**
   * GET /api/coach/trophies/ - Get coach trophies
   */
  async getCoachTrophies(coachId: number): Promise<any[]> {
    return await this.coachRepository.getCoachTrophies(coachId);
  }

  /**
   * GET /api/coach/available-leagues/ - Get available leagues for coach
   */
  async getAvailableLeagues(
    coachId: number,
  ): Promise<{ id: number; name: string; logo: string; season: number }[]> {
    return await this.coachRepository.getAvailableLeagues(coachId);
  }

  /**
   * GET /api/coach/career_stats/ - Get coach career statistics
   */
  async getCoachCareerStats(coachId: number): Promise<any> {
    return await this.coachRepository.getCoachCareerStats(coachId);
  }

  /**
   * GET /api/coach/last-match/ - Get coach last match
   */
  async getCoachLastMatch(coachId: number): Promise<FixtureData> {
    return await this.coachRepository.getCoachLastMatch(coachId);
  }

  /**
   * GET /api/coach/match-stats/ - Get coach match statistics
   */
  async getCoachMatchStats(options: { coach: number; league: number }): Promise<any> {
    return await this.coachRepository.getCoachMatchStats(options);
  }

  /**
   * GET /api/coach/performance/ - Get coach performance
   */
  async getCoachPerformance(coachId: number): Promise<any> {
    return await this.coachRepository.getCoachPerformance(coachId);
  }

  /**
   * GET /api/coach/team-form/ - Get coach team form
   */
  async getCoachTeamForm(fixtureId: number): Promise<any> {
    return await this.coachRepository.getCoachTeamForm(fixtureId);
  }
}

