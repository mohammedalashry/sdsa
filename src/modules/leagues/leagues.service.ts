// src/modules/leagues/leagues.service.ts
import { LeaguesRepository } from "./leagues.repository";
import {
  LeagueData,
  LeagueHistoricalWinner,
  LeagueLastFixture,
} from "../../legacy-types/leagues.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class LeaguesService {
  constructor(private readonly leaguesRepository: LeaguesRepository) {}

  /**
   * GET /api/league/ - Get leagues
   */
  async getLeagues(): Promise<LeagueData[]> {
    return await this.leaguesRepository.getLeaguesByCountry("Saudi Arabia");
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
    const lastFixture = await this.leaguesRepository.getLastFixture(league);

    if (!lastFixture) {
      return [];
    }

    // Convert LeagueLastFixture to FixtureData format
    return [
      {
        fixture: {
          id: lastFixture.fixture.id,
          referee: lastFixture.fixture.referee,
          timezone: lastFixture.fixture.timezone,
          date: lastFixture.fixture.date,
          timestamp: lastFixture.fixture.timestamp,
          periods: lastFixture.fixture.periods,
          venue: lastFixture.fixture.venue,
          status: lastFixture.fixture.status,
        },
        league: {
          id: lastFixture.league.id,
          name: lastFixture.league.name,
          country: lastFixture.league.country,
          logo: lastFixture.league.logo,
          flag: lastFixture.league.flag,
          season: lastFixture.league.season,
          round: lastFixture.league.round,
        },
        teams: {
          home: {
            id: lastFixture.teams.home.id,
            name: lastFixture.teams.home.name,
            logo: lastFixture.teams.home.logo,
            winner: lastFixture.teams.home.winner,
          },
          away: {
            id: lastFixture.teams.away.id,
            name: lastFixture.teams.away.name,
            logo: lastFixture.teams.away.logo,
            winner: lastFixture.teams.away.winner,
          },
        },
        goals: {
          home: lastFixture.goals.home,
          away: lastFixture.goals.away,
        },
        score: {
          halftime: lastFixture.score.halftime,
          fulltime: lastFixture.score.fulltime,
          extratime: lastFixture.score.extratime,
          penalty: lastFixture.score.penalty,
        },
        tablePosition: lastFixture.tablePosition,
        averageTeamRating: lastFixture.averageTeamRating,
      },
    ];
  }

  /**
   * GET /api/league/rounds/ - Get league rounds
   */
  async getLeagueRounds(options: { league: number; season: number }): Promise<string[]> {
    return await this.leaguesRepository.getLeagueRounds(options.league, options.season);
  }
}

