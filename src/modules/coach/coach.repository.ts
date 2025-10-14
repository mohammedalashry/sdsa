// src/modules/coach/coach.repository.ts
import { MatchInterface, Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  CoachData,
  CoachDataResponse,
  CoachCareerStatsResponse,
  CoachInfoResponse,
  CoachCareerResponse,
  CoachTrophiesResponse,
  CoachMatchStatsResponse,
  CoachPerformanceResponse,
} from "../../legacy-types/coach.types";
import { FixtureData, FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/coach/ - Get coaches
   */
  async getCoaches(options: {
    league: number;
    season: number;
  }): Promise<CoachDataResponse> {
    try {
      const cacheKey = `coaches_${options.league}_${options.season}`;

      const cached = this.cacheService.get<CoachDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coaches from MongoDB
      const coaches = await Models.Coach.find({
        "stats.league.id": options.league,
        "stats.league.season": options.season,
      });

      const coachData = await Promise.all(
        coaches.map((coach) => this.mapCoachToCoachData(coach)),
      );

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coaches:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/career/ - Get coach career
   */
  async getCoachCareer(coachId: number): Promise<CoachCareerResponse> {
    try {
      const cacheKey = `coach_career_${coachId}`;

      const cached = this.cacheService.get<CoachCareerResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }
      const currentTeam = await Models.Team.findOne({
        "coaches.id": coachId,
      });
      const coachData = {
        team: {
          id: currentTeam.korastats_id,
          name: currentTeam.name,
          logo: currentTeam.logo,
        },
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      };

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return [coachData];
    } catch (error) {
      console.error("Failed to fetch coach career:", error);
      return null;
    }
  }

  /**
   * GET /api/coach/fixtures/ - Get coach fixtures
   */
  async getCoachFixtures(options: {
    coachId: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `coach_fixtures_${options.coachId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }
      const coach = await Models.Coach.findOne({ korastats_id: options.coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }
      const currentTeam = await Models.Team.findOne({
        "coaches.id": options.coachId,
      });
      // Get matches where coach's team participated
      const matches = await Models.Match.find({
        $or: [
          {
            "teams.home.id": currentTeam.korastats_id,
          },
          {
            "teams.away.id": currentTeam.korastats_id,
          },
        ],
      })
        .limit(20)
        .sort({ date: -1 });
      const fixtures = this.mapMatchesToFixtureData(matches);

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch coach fixtures:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/info/ - Get coach info
   */
  async getCoachInfo(coachId: number): Promise<CoachInfoResponse> {
    try {
      const cacheKey = `coach_info_${coachId}`;

      const cached = this.cacheService.get<CoachInfoResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }
      const currentTeam = await Models.Team.findOne({
        "coaches.id": coachId,
      });

      const coachData = {
        id: coach.korastats_id,
        name: coach.name,
        photo: coach.photo,
        firstname: coach.firstname,
        lastname: coach.lastname,
        age: coach.age,
        birth: {
          date: coach.birth.date.toISOString(),
          place: coach.birth.place,
          country: coach.birth.country,
        },
        nationality: {
          code: coach.nationality.code,
          flag: coach.nationality.flag,
          name: coach.nationality.name,
        },
        height: coach.height?.toString() || null,
        weight: coach.weight?.toString() || null,

        team: {
          id: currentTeam.korastats_id || 0,
          name: currentTeam.name || "Unknown Team",
          logo: currentTeam.logo || "",
        },
        matches: coach.stats.reduce((sum, stat) => sum + stat.matches, 0),
        prefferedFormation: coach.prefferedFormation,
        currentTeam: {
          id: currentTeam.korastats_id || 0,
          name: currentTeam.name || "Unknown Team",
          logo: currentTeam.logo || "",
        },
        trophies: [],
      };

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coach info:", error);
      throw new ApiError(500, "Failed to fetch coach info");
    }
  }

  /**
   * GET /api/coach/career_stats/ - Get coach statistics
   */
  async getCoachStatistics(options: {
    coach: number;
  }): Promise<CoachCareerStatsResponse> {
    try {
      const cacheKey = `coach_statistics_${options.coach}`;

      const cached = this.cacheService.get<CoachCareerStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const coach = await Models.Coach.findOne({ korastats_id: options.coach });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }
      const statistics = coach.stats;

      this.cacheService.set(cacheKey, statistics, 60 * 60 * 1000); // Cache for 1 hour
      return statistics;
    } catch (error) {
      console.error("Failed to fetch coach statistics:", error);
      return null;
    }
  }

  /**
   * GET /api/coach/trophies/ - Get coach trophies
   */
  async getCoachTrophies(coachId: number): Promise<any[]> {
    try {
      const cacheKey = `coach_trophies_${coachId}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve trophy history
      // For now, return empty array
      const trophies: any[] = [];

      this.cacheService.set(cacheKey, trophies, 60 * 60 * 1000); // Cache for 1 hour
      return trophies;
    } catch (error) {
      console.error("Failed to fetch coach trophies:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/available-leagues/ - Get available leagues for coach
   */
  async getAvailableLeagues(
    coachId: number,
  ): Promise<{ id: number; name: string; logo: string; season: number }[]> {
    try {
      const cacheKey = `coach_available_leagues_${coachId}`;

      const cached =
        this.cacheService.get<
          { id: number; name: string; logo: string; season: number }[]
        >(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find leagues where that team plays
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      const currentTeam = await Models.Team.findOne({
        "coaches.id": coachId,
      });
      if (!coach || !currentTeam?.korastats_id) {
        return [];
      }

      // Get leagues where coach's current team has matches
      const matches: any[] = await Models.Match.find({
        $or: [
          { "teams.home.id": currentTeam.korastats_id },
          { "teams.away.id": currentTeam.korastats_id },
        ],
      });
      console.log(matches.length);
      const leaguesParticipated = matches.map((match) => {
        return {
          id: match.league.id,
          season: match.league.season,
          name: match.league.name,
          logo: match.league.logo,
        };
      });
      console.log("MODA leagues participated ", leaguesParticipated.length);
      const uniqueLeagues = Array.from(
        new Set(leaguesParticipated.map((obj) => JSON.stringify(obj))),
      ).map((str) => JSON.parse(str));

      console.log("MODA unique leagues ", uniqueLeagues.length);
      const leagues = uniqueLeagues
        .map((league) => ({
          id: league.id,
          name: league.name,
          logo: league.logo,
          season: league.season,
        }))
        .sort((a, b) => b.season - a.season);

      this.cacheService.set(cacheKey, leagues, 60 * 60 * 1000); // Cache for 1 hour
      return leagues;
    } catch (error) {
      console.error("Failed to fetch coach available leagues:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/career_stats/ - Get coach career statistics
   */
  async getCoachCareerStats(coachId: number): Promise<CoachCareerStatsResponse> {
    try {
      const cacheKey = `coach_career_stats_${coachId}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }

      // Aggregate stats from all leagues
      const stats = coach.stats;

      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000); // Cache for 30 minutes
      return stats;
    } catch (error) {
      console.error("Failed to fetch coach career stats:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/last-match/ - Get coach last match
   */
  async getCoachLastMatch(coachId: number): Promise<FixtureData> {
    try {
      const cacheKey = `coach_last_match_${coachId}`;

      const cached = this.cacheService.get<FixtureData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find last match for that team
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      const currentTeam = await Models.Team.findOne({
        "coaches.id": coachId,
      });
      if (!coach || !currentTeam?.korastats_id) {
        return null;
      }

      // Get last match where coach's current team participated
      const lastMatch = await Models.Match.findOne({
        $or: [
          { "teams.home.id": currentTeam.korastats_id },
          { "teams.away.id": currentTeam.korastats_id },
        ],
      }).sort({ date: -1 });

      if (!lastMatch) {
        return null;
      }

      const fixtures = this.mapMatchesToFixtureData([lastMatch]);

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures[0];
    } catch (error) {
      console.error("Failed to fetch coach last match:", error);
      return null;
    }
  }

  /**
   * GET /api/coach/match-stats/ - Get coach match statistics
   */
  async getCoachMatchStats(options: {
    coach: number;
    league: number;
  }): Promise<CoachMatchStatsResponse> {
    try {
      const cacheKey = `coach_match_stats_${options.coach}_${options.league}`;

      const cached = this.cacheService.get<CoachMatchStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find matches for that team in the league
      const coach = await Models.Coach.findOne({ korastats_id: options.coach });

      const currentTeam = await Models.Team.findOne({
        "coaches.id": coach.korastats_id,
      });
      if (!coach || !currentTeam?.korastats_id) {
        return [
          {
            yellow_cards: 0,
            red_cards: 0,
            fixture_data: null,
          },
        ];
      }

      // Get matches where coach's current team participated in the league
      const matches = await Models.Match.find({
        tournament_id: options.league,
        $or: [
          { "teams.home.id": currentTeam.korastats_id },
          { "teams.away.id": currentTeam.korastats_id },
        ],
      }).limit(20);

      const stats = await Promise.all(
        matches.map(async (match) => {
          const matchDetails = await Models.MatchDetails.findOne({
            korastats_id: match.korastats_id,
          });
          return {
            yellow_cards:
              matchDetails.timelineData?.filter((event) => event.detail === "Yellow Card")
                .length || 0,
            red_cards:
              matchDetails.timelineData?.filter((event) => event.detail === "Red Card")
                .length || 0,
            fixture_data: this.mapMatchesToFixtureData([match])[0],
          };
        }),
      );

      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000); // Cache for 30 minutes
      return stats;
    } catch (error) {
      console.error("Failed to fetch coach match stats:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/performance/ - Get coach performance
   */
  async getCoachPerformance(coachId: number): Promise<CoachPerformanceResponse> {
    try {
      const cacheKey = `coach_performance_${coachId}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }

      const performance = coach.coachPerformance;

      this.cacheService.set(cacheKey, performance, 30 * 60 * 1000); // Cache for 30 minutes
      return performance;
    } catch (error) {
      console.error("Failed to fetch coach performance:", error);
      return null;
    }
  }

  /**
   * GET /api/coach/team-form/ - Get coach team form
   */
  async getCoachTeamForm(fixtureId: number): Promise<any> {
    try {
      const cacheKey = `coach_team_form_${fixtureId}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get the fixture to find the coach
      const fixture = await Models.Match.findOne({ korastats_id: fixtureId });

      if (!fixture) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get the team from the fixture
      const teamId = fixture.teams?.home?.id || fixture.teams?.away?.id;

      if (!teamId) {
        return { form: "-----", recent_matches: [] };
      }

      const recentMatches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],

        korastats_id: { $ne: fixtureId },
      })
        .sort({ date: -1 })
        .limit(5);
      let form: string = "";
      // Calculate form string
      recentMatches.map((match) => {
        const isHome = match.teams?.home?.id === teamId;
        const homeScore = match.goals?.home || 0;
        const awayScore = match.goals?.away || 0;

        if (isHome) {
          if (homeScore > awayScore) form += "W";
          else if (homeScore === awayScore) form += "D";
          else form += "L";
        } else {
          if (awayScore > homeScore) form += "W";
          else if (awayScore === homeScore) form += "D";
          else form += "L";
        }
      });

      const teamForm = {
        form: form,
        recent_matches: recentMatches.map((match) => ({
          id: match.korastats_id,
          date: match.fixture?.date || new Date().toISOString(),
          home_team: match.teams?.home?.name,
          away_team: match.teams?.away?.name,
          score: `${match.goals?.home || 0}-${match.goals?.away || 0}`,
        })),
      };

      this.cacheService.set(cacheKey, teamForm, 15 * 60 * 1000); // Cache for 15 minutes
      return teamForm;
    } catch (error) {
      console.error("Failed to fetch coach team form:", error);
      return { form: "-----", recent_matches: [] };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB coach to CoachData format
   */
  private async mapCoachToCoachData(coach: any): Promise<CoachData> {
    const currentTeam = await Models.Team.findOne({
      "coaches.id": coach.korastats_id,
    });
    return {
      id: coach.korastats_id,
      name: coach.name,
      firstname: coach.firstname,
      lastname: coach.lastname, // Not available in current schema
      age: coach.age || null,
      birth: {
        date: coach.date_of_birth?.toISOString() || null,
        place: coach.place || null, // Not available in current schema
        country: coach.nationality?.name || null,
      },
      nationality: coach.nationality?.name || null,
      height: coach.height || null, // Not available for coaches
      weight: coach.weight || null, // Not available for coaches
      photo: coach.photo || "",
      team: {
        id: currentTeam?.korastats_id || 0,
        name: currentTeam?.name || "Unknown Team",
        logo: currentTeam?.logo || "",
      },
    };
  }

  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(matches: MatchInterface[]): FixtureDataResponse {
    return matches.map((match) => ({
      fixture: match.fixture,
      league: match.league,
      teams: match.teams,
      goals: match.goals,
      score: match.score,
      tablePosition: match.tablePosition || null,
      averageTeamRating: match.averageTeamRating || null,
    }));
  }
}

