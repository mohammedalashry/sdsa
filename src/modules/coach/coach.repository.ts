// src/modules/coach/coach.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { ApiError } from "../../core/middleware/error.middleware";
import { CoachData } from "../../legacy-types/players.types";
import { FixtureDataResponse } from "../../legacy-types/fixtures.types";

export class CoachRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/coach/ - Get coaches
   */
  async getCoaches(options: { league: number; season: number }): Promise<CoachData[]> {
    try {
      const cacheKey = `coaches_${options.league}_${options.season}`;

      const cached = this.cacheService.get<CoachData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coaches from MongoDB
      const coaches = await Models.Coach.find({
        "career_history.is_current": true,
      }).limit(50);

      const coachData = coaches.map((coach) => this.mapCoachToCoachData(coach));

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
  async getCoachCareer(coachId: number): Promise<CoachData[]> {
    try {
      const cacheKey = `coach_career_${coachId}`;

      const cached = this.cacheService.get<CoachData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }

      const coachData = [this.mapCoachToCoachData(coach)];

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coach career:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/fixtures/ - Get coach fixtures
   */
  async getCoachFixtures(options: {
    coach: number;
    league: number;
  }): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `coach_fixtures_${options.coach}_${options.league}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get matches where coach's team participated
      const matches = await Models.Match.find({
        tournament_id: options.league,
        $or: [
          { "teams.home.coach_id": options.coach },
          { "teams.away.coach_id": options.coach },
        ],
      })
        .sort({ date: -1 })
        .limit(50);

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
  async getCoachInfo(coachId: number): Promise<CoachData> {
    try {
      const cacheKey = `coach_info_${coachId}`;

      const cached = this.cacheService.get<CoachData>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach from MongoDB
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      if (!coach) {
        throw new ApiError(404, "Coach not found");
      }

      const coachData = this.mapCoachToCoachData(coach);

      this.cacheService.set(cacheKey, coachData, 30 * 60 * 1000); // Cache for 30 minutes
      return coachData;
    } catch (error) {
      console.error("Failed to fetch coach info:", error);
      throw new ApiError(500, "Failed to fetch coach info");
    }
  }

  /**
   * GET /api/coach/statistics/ - Get coach statistics
   */
  async getCoachStatistics(options: {
    coach: number;
    league: number;
    season: number;
  }): Promise<any> {
    try {
      const cacheKey = `coach_statistics_${options.coach}_${options.league}_${options.season}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve complex statistics calculation
      // For now, return empty object
      const statistics: any = {};

      this.cacheService.set(cacheKey, statistics, 60 * 60 * 1000); // Cache for 1 hour
      return statistics;
    } catch (error) {
      console.error("Failed to fetch coach statistics:", error);
      return {};
    }
  }

  /**
   * GET /api/coach/transfer/ - Get coach transfers
   */
  async getCoachTransfers(coachId: number): Promise<any[]> {
    try {
      const cacheKey = `coach_transfers_${coachId}`;

      const cached = this.cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically involve transfer history
      // For now, return empty array
      const transfers: any[] = [];

      this.cacheService.set(cacheKey, transfers, 60 * 60 * 1000); // Cache for 1 hour
      return transfers;
    } catch (error) {
      console.error("Failed to fetch coach transfers:", error);
      return [];
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

  // ========== HELPER METHODS ==========

  /**
   * Map MongoDB coach to CoachData format
   */
  private mapCoachToCoachData(coach: any): CoachData {
    return {
      id: coach.korastats_id,
      name: coach.name,
      firstname: null, // Not available in current schema
      lastname: null, // Not available in current schema
      age: coach.age || null,
      birth: {
        date: coach.date_of_birth?.toISOString() || null,
        place: null, // Not available in current schema
        country: coach.nationality?.name || null,
      },
      nationality: coach.nationality?.name || null,
      height: null, // Not available for coaches
      weight: null, // Not available for coaches
      photo: coach.image_url || "",
      team: {
        id: coach.career_history?.find((team) => team.is_current)?.team_id || 0,
        name:
          coach.career_history?.find((team) => team.is_current)?.team_name ||
          "Unknown Team",
        code: null,
        country: "",
        founded: null,
        national: false,
        logo: "",
      },
      career: [], // Would need to fetch from career history
    };
  }

  /**
   * Map MongoDB matches to FixtureData format
   */
  private mapMatchesToFixtureData(matches: any[]): FixtureDataResponse {
    return matches.map((match) => ({
      fixture: {
        id: match.korastats_id,
        referee: match.officials?.referee?.name || null,
        timezone: "UTC",
        date: match.date.toISOString(),
        timestamp: Math.floor(match.date.getTime() / 1000),
        periods: {
          first: null,
          second: null,
        },
        venue: {
          id: match.venue?.id || null,
          name: match.venue?.name || null,
          city: match.venue?.city || null,
        },
        status: {
          long: match.status?.name || "Unknown",
          short: match.status?.short || "UNK",
          elapsed: null,
        },
      },
      league: {
        id: match.tournament_id,
        name: "League Name", // Would need to fetch from tournament
        country: "",
        logo: "",
        flag: null,
        season: parseInt(match.season),
        round: match.round?.toString() || "",
      },
      teams: {
        home: {
          id: match.teams?.home?.id || 0,
          name: match.teams?.home?.name || "Home Team",
          logo: "",
          winner: match.teams?.home?.score > match.teams?.away?.score,
        },
        away: {
          id: match.teams?.away?.id || 0,
          name: match.teams?.away?.name || "Away Team",
          logo: "",
          winner: match.teams?.away?.score > match.teams?.home?.score,
        },
      },
      goals: {
        home: match.teams?.home?.score || 0,
        away: match.teams?.away?.score || 0,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: {
          home: match.teams?.home?.score || 0,
          away: match.teams?.away?.score || 0,
        },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      tablePosition: match.table_position || null,
      averageTeamRating: match.average_team_rating || null,
    }));
  }

  /**
   * GET /api/coach/available-leagues/ - Get available leagues for coach
   */
  async getAvailableLeagues(coachId: number): Promise<number[]> {
    try {
      const cacheKey = `coach_available_leagues_${coachId}`;

      const cached = this.cacheService.get<number[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find leagues where that team plays
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      const currentTeam = coach.career_history?.find((team) => team.is_current);
      if (!coach || !currentTeam?.team_id) {
        return [];
      }

      // Get leagues where coach's current team has matches
      const matches = await Models.Match.find({
        $or: [
          { "teams.home.id": currentTeam.team_id },
          { "teams.away.id": currentTeam.team_id },
        ],
      }).distinct("tournament_id");

      const leagues = matches
        .map((league) => parseInt(league.toString()))
        .sort((a, b) => b - a);

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
  async getCoachCareerStats(coachId: number): Promise<any> {
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

      const stats = {
        total_matches: coach.stats?.total_matches || 0,
        total_wins: coach.stats?.total_wins || 0,
        total_draws: coach.stats?.total_draws || 0,
        total_losses: coach.stats?.total_losses || 0,
        win_percentage:
          coach.stats?.total_matches > 0
            ? (coach.stats.total_wins / coach.stats.total_matches) * 100
            : 0,
        current_team_matches: 0, // Will be calculated from matches
        current_team_wins: 0, // Will be calculated from matches
        current_team_draws: 0, // Will be calculated from matches
        current_team_losses: 0, // Will be calculated from matches
      };

      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000); // Cache for 30 minutes
      return stats;
    } catch (error) {
      console.error("Failed to fetch coach career stats:", error);
      return {};
    }
  }

  /**
   * GET /api/coach/last-match/ - Get coach last match
   */
  async getCoachLastMatch(coachId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `coach_last_match_${coachId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find last match for that team
      const coach = await Models.Coach.findOne({ korastats_id: coachId });

      const currentTeam = coach.career_history?.find((team) => team.is_current);
      if (!coach || !currentTeam?.team_id) {
        return [];
      }

      // Get last match where coach's current team participated
      const lastMatch = await Models.Match.findOne({
        $or: [
          { "teams.home.id": currentTeam.team_id },
          { "teams.away.id": currentTeam.team_id },
        ],
        status: { $in: ["finished", "completed"] },
      }).sort({ date: -1 });

      if (!lastMatch) {
        return [];
      }

      const fixtures = this.mapMatchesToFixtureData([lastMatch]);

      this.cacheService.set(cacheKey, fixtures, 15 * 60 * 1000); // Cache for 15 minutes
      return fixtures;
    } catch (error) {
      console.error("Failed to fetch coach last match:", error);
      return [];
    }
  }

  /**
   * GET /api/coach/match-stats/ - Get coach match statistics
   */
  async getCoachMatchStats(options: { coach: number; league: number }): Promise<any> {
    try {
      const cacheKey = `coach_match_stats_${options.coach}_${options.league}`;

      const cached = this.cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get coach's current team and find matches for that team in the league
      const coach = await Models.Coach.findOne({ korastats_id: options.coach });

      const currentTeam = coach.career_history?.find((team) => team.is_current);
      if (!coach || !currentTeam?.team_id) {
        return {
          total_matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
        };
      }

      // Get matches where coach's current team participated in the league
      const matches = await Models.Match.find({
        tournament_id: options.league,
        $or: [
          { "teams.home.id": currentTeam.team_id },
          { "teams.away.id": currentTeam.team_id },
        ],
      });

      const stats = {
        total_matches: matches.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
      };

      // Calculate stats from matches
      matches.forEach((match) => {
        const isHome = match.teams?.home?.id === currentTeam?.team_id;
        const homeScore = match.goals?.home || 0;
        const awayScore = match.goals?.away || 0;

        if (isHome) {
          stats.goals_for += homeScore;
          stats.goals_against += awayScore;
          if (homeScore > awayScore) stats.wins++;
          else if (homeScore === awayScore) stats.draws++;
          else stats.losses++;
        } else {
          stats.goals_for += awayScore;
          stats.goals_against += homeScore;
          if (awayScore > homeScore) stats.wins++;
          else if (awayScore === homeScore) stats.draws++;
          else stats.losses++;
        }
      });

      this.cacheService.set(cacheKey, stats, 30 * 60 * 1000); // Cache for 30 minutes
      return stats;
    } catch (error) {
      console.error("Failed to fetch coach match stats:", error);
      return {};
    }
  }

  /**
   * GET /api/coach/performance/ - Get coach performance
   */
  async getCoachPerformance(coachId: number): Promise<any> {
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

      const currentTeam = coach.career_history?.find((team) => team.is_current);
      const performance = {
        current_team: currentTeam,
        career_history: coach.career_history,
        coaching_stats: coach.stats,
        trophies: coach.trophies,
      };

      this.cacheService.set(cacheKey, performance, 30 * 60 * 1000); // Cache for 30 minutes
      return performance;
    } catch (error) {
      console.error("Failed to fetch coach performance:", error);
      return {};
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
        status: { $in: ["finished", "completed"] },
        korastats_id: { $ne: fixtureId },
      })
        .sort({ date: -1 })
        .limit(5);

      // Calculate form string
      const form = recentMatches
        .map((match) => {
          const isHome = match.teams?.home?.id === teamId;
          const homeScore = match.goals?.home || 0;
          const awayScore = match.goals?.away || 0;

          if (isHome) {
            if (homeScore > awayScore) return "W";
            else if (homeScore === awayScore) return "D";
            else return "L";
          } else {
            if (awayScore > homeScore) return "W";
            else if (awayScore === homeScore) return "D";
            else return "L";
          }
        })
        .join("");

      const teamForm = {
        form: form.padEnd(5, "-"),
        recent_matches: recentMatches.map((match) => ({
          id: match.korastats_id,
          date: match.date,
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
}

