import { CacheService } from "@/integrations/korastats/services/cache.service";
import {
  TeamsResponse,
  TeamInfo,
  TeamStatsResponse,
  GoalsOverTimeResponse,
  FormOverTimeResponse,
  TeamLineupResponse,
  PositionOverTimeResponse,
  TeamComparisonStatsResponse,
  TeamSquadResponse,
} from "@/legacy-types/teams.types";
import { FixtureDataResponse } from "@/legacy-types/fixtures.types";
import { ApiError } from "@/core/middleware/error.middleware";
import { Models } from "@/db/mogodb/models";
import { TeamInterface } from "@/db/mogodb/schemas/team.schema";

export class TeamsRepository {
  constructor(private readonly cacheService: CacheService) {}

  async getTeamsList(league: number, season: string): Promise<TeamsResponse> {
    const cacheKey = this.cacheService.createKey("teams", "list", league, season);

    // Try cache first
    let cachedData = this.cacheService.get<TeamsResponse>(cacheKey);
    if (cachedData) {
      console.log("Teams list served from cache");
      return cachedData;
    }

    try {
      // Get teams from new Team schema
      const mongoTeams = await Models.Team.find({
        // Filter by league if possible (would need league mapping)
        // For now, get all active teams
      }).limit(50);

      if (mongoTeams.length > 0) {
        console.log(`📦 Found ${mongoTeams.length} teams in MongoDB`);

        // Transform new Team schema to legacy format
        const teams = mongoTeams.map((team: TeamInterface) => ({
          team: {
            id: team.korastats_id,
            name: team.name,
            code: team.code || "",
            country: team.country,
            founded: team.founded || null,
            national: team.national || false,
            logo: team.logo || "",
          },
          venue: {
            id: team.venue?.id || null,
            name: team.venue?.name || null,
            address: team.venue?.address || null,
            city: team.venue?.city || null,
            capacity: team.venue?.capacity || null,
            surface: team.venue?.surface || null,
            image: team.venue?.image || null,
          },
        }));

        const response: TeamsResponse = teams;

        // Cache the result
        this.cacheService.set(cacheKey, response);
        return response;
      }

      // If no data in MongoDB, return empty array
      console.log("No teams found in MongoDB for league", league, "season", season);
      return [];
    } catch (error) {
      console.error("Failed to fetch teams list:", error);
      throw new ApiError(500, "Failed to fetch teams from data source");
    }
  }

  async getTeamInfo(teamId: number): Promise<TeamInfo> {
    const cacheKey = this.cacheService.createKey("teams", "info", teamId);

    // Try cache first
    let cachedData = this.cacheService.get<TeamInfo>(cacheKey);
    if (cachedData) {
      console.log("Team info served from cache");
      return cachedData;
    }

    try {
      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (mongoTeam) {
        console.log(`📦 Found team ${teamId} in MongoDB`);

        // Transform new Team schema to legacy TeamInfo format
        const teamInfo: TeamInfo = {
          team: {
            id: mongoTeam.korastats_id,
            name: mongoTeam.name,
            code: mongoTeam.code || "",
            country: mongoTeam.country,
            founded: mongoTeam.founded || null,
            national: mongoTeam.national || false,
            logo: mongoTeam.logo || "",
          },
          venue: {
            id: mongoTeam.venue?.id || null,
            name: mongoTeam.venue?.name || null,
            address: mongoTeam.venue?.address || null,
            city: mongoTeam.venue?.city || null,
            capacity: mongoTeam.venue?.capacity || null,
            surface: mongoTeam.venue?.surface || null,
            image: mongoTeam.venue?.image || null,
          },
          coach:
            mongoTeam.coaches && mongoTeam.coaches.length > 0
              ? mongoTeam.coaches
                  .filter((coach) => coach.current)
                  .map((coach) => ({
                    id: coach.id,
                    name: coach.name,
                    firstname: coach.name?.split(" ")[0] || null,
                    lastname: coach.name?.split(" ").slice(1).join(" ") || null,
                    age: null,
                    birth: {
                      date: null,
                      place: null,
                      country: "",
                    },
                    nationality: "",
                    height: null,
                    weight: null,
                    photo: "",
                    team: {
                      id: mongoTeam.korastats_id,
                      name: mongoTeam.name,
                      code: mongoTeam.code || "",
                      country: mongoTeam.country,
                      founded: mongoTeam.founded || null,
                      national: mongoTeam.national || false,
                      logo: mongoTeam.logo || "",
                    },
                    career: [],
                  }))
              : [],
          transfers: mongoTeam.transfers ? [mongoTeam.transfers] : [],
          totalPlayers: mongoTeam.totalPlayers || 0,
          foreignPlayers: mongoTeam.foreignPlayers || 0,
          averagePlayerAge: mongoTeam.averagePlayerAge || 0,
          clubMarketValue: mongoTeam.clubMarketValue || null,
          currentLeagues: [], // Would be populated from tournament data
          trophies:
            mongoTeam.trophies?.map((trophy) => ({
              league: trophy.league,
              country: trophy.country,
              season: trophy.season,
            })) || [],
        };

        this.cacheService.set(cacheKey, teamInfo);
        return teamInfo;
      }

      // If not in MongoDB, throw error
      throw new ApiError(404, "Team not found");
    } catch (error) {
      console.error("Failed to fetch team info:", error);
      throw new ApiError(500, "Failed to fetch team info");
    }
  }

  async getTeamStats(
    teamId: number,
    league: number,
    season: number,
  ): Promise<TeamStatsResponse> {
    const cacheKey = this.cacheService.createKey(
      "teams",
      "stats",
      teamId,
      league,
      season,
    );

    // Try cache first
    let cachedData = this.cacheService.get<TeamStatsResponse>(cacheKey);
    if (cachedData) {
      console.log("Team stats served from cache");
      return cachedData;
    }

    try {
      // Get team from new Team schema
      let mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (mongoTeam) {
        console.log(`📦 Found team stats for team ${teamId} in MongoDB`);

        // Transform new Team schema stats to legacy format
        // Get the first tournament stats (or aggregate from all if needed)
        const tournamentStats =
          mongoTeam.tournament_stats?.find(
            (t) => t.league?.id === league && t.league?.season === season,
          ) || mongoTeam.tournament_stats?.[0];
        const stats: TeamStatsResponse =
          tournamentStats ||
          ({
            league: null,
            rank: 0,
            average_team_rating: 0,
            team: { id: teamId, name: mongoTeam.name, logo: mongoTeam.logo },
            form: "N/A",
            korastats_stats: {} as any,
            team_attacking: {} as any,
            team_defending: {} as any,
            team_others: {} as any,
            team_passing: {} as any,
            clean_sheet: {} as any,
            fixtures: {} as any,
            goals: {} as any,
            biggest: { streak: { wins: 0, draws: 0, loses: 0 } },
          } as TeamStatsResponse);

        // Cache the result
        this.cacheService.set(cacheKey, stats);
        return stats;
      }

      // If not in MongoDB, throw error
      throw new ApiError(404, "Team stats not found");
    } catch (error) {
      console.error("Failed to fetch team stats:", error);
      throw new ApiError(500, "Failed to fetch team statistics");
    }
  }

  async getAvailableSeasons(teamId: number): Promise<number[]> {
    try {
      const cacheKey = `available_seasons_${teamId}`;

      const cached = this.cacheService.get<number[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get available seasons from MongoDB matches
      const seasons = await Models.Match.distinct("season", {
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
      });

      const seasonNumbers = seasons
        .map((season: unknown) => parseInt(season as string))
        .filter((year) => year >= 2000 && !isNaN(year));
      seasonNumbers.sort((a, b) => b - a); // Most recent first

      this.cacheService.set(cacheKey, seasonNumbers, 60 * 60 * 1000); // Cache for 1 hour
      return seasonNumbers;
    } catch (error) {
      console.error("Failed to fetch available seasons:", error);
      throw new ApiError(500, "Failed to fetch available seasons");
    }
  }

  async getTeamComparisonStats(
    season: number,
    teamId: number,
  ): Promise<TeamComparisonStatsResponse> {
    try {
      const cacheKey = `team_comparison_stats_${season}_${teamId}`;

      const cached = this.cacheService.get<TeamComparisonStatsResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Extract comparison stats from team's stats_summary
      const firstTournamentStats = mongoTeam.tournament_stats?.[0];
      const result: TeamComparisonStatsResponse = {
        league: firstTournamentStats?.league || null,
        team: {
          id: teamId,
          name: mongoTeam.name,
          code: mongoTeam.code || "",
          country: mongoTeam.country,
          founded: mongoTeam.founded || null,
          national: mongoTeam.national || false,
          logo: mongoTeam.logo || "",
        },
        averageAge: mongoTeam.averagePlayerAge || 0,
        nationalTeamPlayers: mongoTeam.totalPlayers - mongoTeam.foreignPlayers,
        foreigners: mongoTeam.foreignPlayers || 0,
        gamesPlayed:
          mongoTeam.stats_summary.gamesPlayed.home +
          mongoTeam.stats_summary.gamesPlayed.away,
        wins: mongoTeam.stats_summary.wins.home + mongoTeam.stats_summary.wins.away,
        draws: mongoTeam.stats_summary.draws.home + mongoTeam.stats_summary.draws.away,
        loses: mongoTeam.stats_summary.loses.home + mongoTeam.stats_summary.loses.away,
        goalsScored:
          mongoTeam.stats_summary.goalsScored.home +
          mongoTeam.stats_summary.goalsScored.away,
        goalsConceded:
          mongoTeam.stats_summary.goalsConceded.home +
          mongoTeam.stats_summary.goalsConceded.away,
        goalDifference: mongoTeam.stats_summary.goalDifference,
        cleanSheetGames: mongoTeam.stats_summary.cleanSheetGames,
      };

      this.cacheService.set(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error("Failed to fetch team comparison stats:", error);
      throw new ApiError(500, "Failed to fetch team comparison stats");
    }
  }

  async getTeamFixtures(
    teamId: number,
    league: number,
    season: string,
  ): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `team_fixtures_${teamId}_${league}_${season}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team fixtures from MongoDB matches
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        tournament_id: league,
        season: season,
      }).sort({ "fixture.date": -1 });

      // Transform matches to legacy fixture format
      const fixtures = matches.map((match) => ({
        fixture: {
          id: match.korastats_id,
          referee: match.fixture?.referee || null,
          timezone: match.fixture?.timezone || "UTC",
          date: match.fixture?.date,
          timestamp: match.fixture?.timestamp,
          periods: {
            first: match.fixture?.periods?.first || null,
            second: match.fixture?.periods?.second || null,
          },
          venue: {
            id: match.fixture?.venue?.id || null,
            name: match.fixture?.venue?.name || null,
            city: match.fixture?.venue?.city || null,
          },
          status: {
            long: match.fixture?.status?.long || "Finished",
            short: match.fixture?.status?.short || "FT",
            elapsed: match.fixture?.status?.elapsed || null,
          },
        },
        league: {
          id: match.league?.id || league,
          name: match.league?.name || "",
          country: match.league?.country || "Saudi Arabia",
          logo: match.league?.logo || "",
          flag: match.league?.flag || "https://media.api-sports.io/flags/sa.svg",
          season: parseInt(season),
          round: match.league?.round || "",
        },
        teams: {
          home: {
            id: match.teams?.home?.id || 0,
            name: match.teams?.home?.name || "",
            logo: match.teams?.home?.logo || "",
            winner: match.teams?.home?.winner || match.goals?.home > match.goals?.away,
          },
          away: {
            id: match.teams?.away?.id || 0,
            name: match.teams?.away?.name || "",
            logo: match.teams?.away?.logo || "",
            winner: match.teams?.away?.winner || match.goals?.away > match.goals?.home,
          },
        },
        goals: {
          home: match.goals?.home || null,
          away: match.goals?.away || null,
        },
        score: {
          halftime: {
            home: match.score?.halftime?.home || null,
            away: match.score?.halftime?.away || null,
          },
          fulltime: {
            home: match.score?.fulltime?.home || match.goals?.home || null,
            away: match.score?.fulltime?.away || match.goals?.away || null,
          },
          extratime: {
            home: match.score?.extratime?.home || null,
            away: match.score?.extratime?.away || null,
          },
          penalty: {
            home: match.score?.penalty?.home || null,
            away: match.score?.penalty?.away || null,
          },
        },
        tablePosition: match.tablePosition || null,
        averageTeamRating: match.averageTeamRating || null,
      }));

      const response: FixtureDataResponse = fixtures;

      this.cacheService.set(cacheKey, response, 15 * 60 * 1000); // Cache for 15 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch team fixtures:", error);
      throw new ApiError(500, "Failed to fetch team fixtures");
    }
  }

  async getTeamGoalsOverTime(
    league: number,
    season: number,
    teamId: number,
  ): Promise<GoalsOverTimeResponse> {
    try {
      const cacheKey = `team_goals_over_time_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<GoalsOverTimeResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Return goals over time data from team schema
      const response: GoalsOverTimeResponse = {
        pagingInfo: {
          page: 1,
          pageSize: 10,
          total: 1,
        },
        data: mongoTeam.goalsOverTime || [
          {
            date: "",
            timestamp: 0,
            goalsScored: {
              totalShots: 0,
              totalGoals: 0,
              team: { id: 0, name: "", logo: "" },
            },
            goalsConceded: {
              totalShots: 0,
              totalGoals: 0,
              team: { id: 0, name: "", logo: "" },
            },
            opponentTeam: { id: 0, name: "", logo: "" },
          },
        ],
      };

      this.cacheService.set(cacheKey, response, 60 * 60 * 1000); // Cache for 1 hour
      return response;
    } catch (error) {
      console.error("Failed to fetch team goals over time:", error);
      throw new ApiError(500, "Failed to fetch team goals over time");
    }
  }

  async getTeamFormOverTime(
    league: number,
    season: number,
    teamId: number,
  ): Promise<FormOverTimeResponse> {
    try {
      const cacheKey = `team_form_over_time_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<FormOverTimeResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Return form over time data from team schema
      const response: FormOverTimeResponse = {
        pagingInfo: {
          page: 1,
          pageSize: 10,
          total: 1,
        },
        data: mongoTeam.formOverTime || [
          {
            date: "",
            timestamp: 0,
            currentPossession: 50,
            opponentPossession: 50,
            opponentTeam: { id: 0, name: "", logo: "" },
            currentTeam: { id: 0, name: "", logo: "" },
          },
        ],
      };

      this.cacheService.set(cacheKey, response, 60 * 60 * 1000); // Cache for 1 hour
      return response;
    } catch (error) {
      console.error("Failed to fetch team form over time:", error);
      throw new ApiError(500, "Failed to fetch team form over time");
    }
  }

  async getTeamLineup(
    league: number,
    season: number,
    teamId: number,
  ): Promise<TeamLineupResponse> {
    try {
      const cacheKey = `team_lineup_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<TeamLineupResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Return lineup data from team schema
      const response: TeamLineupResponse = [mongoTeam.lineup];

      this.cacheService.set(cacheKey, response, 60 * 60 * 1000); // Cache for 1 hour
      return response;
    } catch (error) {
      console.error("Failed to fetch team lineup:", error);
      throw new ApiError(500, "Failed to fetch team lineup");
    }
  }

  async getTeamPositionOverTime(
    league: number,
    season: number,
    teamId: number,
  ): Promise<PositionOverTimeResponse> {
    try {
      const cacheKey = `team_position_over_time_${league}_${season}_${teamId}`;

      const cached = this.cacheService.get<PositionOverTimeResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team's current ranking and generate position over time
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Generate position over time based on current rank
      // In a full implementation, this would track actual position changes
      const currentRank = mongoTeam.rank || 10;
      const positions = [];

      for (let i = 1; i <= 10; i++) {
        // Simulate position changes over time
        const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const position = Math.max(1, Math.min(20, currentRank + variation));
        positions.push({
          date: new Date(Date.now() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          position,
        });
      }

      const response: PositionOverTimeResponse = { positions };

      this.cacheService.set(cacheKey, response, 60 * 60 * 1000); // Cache for 1 hour
      return response;
    } catch (error) {
      console.error("Failed to fetch team position over time:", error);
      throw new ApiError(500, "Failed to fetch team position over time");
    }
  }

  async getTeamSquad(teamId: number): Promise<TeamSquadResponse> {
    try {
      const cacheKey = `team_squad_${teamId}`;

      const cached = this.cacheService.get<TeamSquadResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get team from new Team schema
      const mongoTeam = await Models.Team.findOne({ korastats_id: teamId });

      if (!mongoTeam) {
        throw new ApiError(404, "Team not found");
      }

      // Extract squad from lineup and create proper TeamSquad structure
      const players = [];

      if (mongoTeam.lineup?.startXI) {
        players.push(
          ...mongoTeam.lineup.startXI.map((player) => ({
            id: player.player.id,
            name: player.player.name,
            photo: player.player.photo,
            number: player.player.number,
            pos: player.player.pos,
            // Add other PlayerData properties with defaults
            age: null,
            birth: {
              date: null,
              place: null,
              country: "",
            },
            nationality: "",
            height: null,
            weight: null,
            injured: false,
            team: {
              id: mongoTeam.korastats_id,
              name: mongoTeam.name,
              code: mongoTeam.code || "",
              country: mongoTeam.country,
              founded: mongoTeam.founded || null,
              national: mongoTeam.national || false,
              logo: mongoTeam.logo || "",
            },
            statistics: [],
          })),
        );
      }

      if (mongoTeam.lineup?.substitutes) {
        players.push(
          ...mongoTeam.lineup.substitutes.map((player) => ({
            id: player.player.id,
            name: player.player.name,
            photo: player.player.photo,
            number: player.player.number,
            pos: player.player.pos,
            // Add other PlayerData properties with defaults
            age: null,
            birth: {
              date: null,
              place: null,
              country: "",
            },
            nationality: "",
            height: null,
            weight: null,
            injured: false,
            team: {
              id: mongoTeam.korastats_id,
              name: mongoTeam.name,
              code: mongoTeam.code || "",
              country: mongoTeam.country,
              founded: mongoTeam.founded || null,
              national: mongoTeam.national || false,
              logo: mongoTeam.logo || "",
            },
            statistics: [],
          })),
        );
      }

      // Get coach data
      const coach =
        mongoTeam.coaches && mongoTeam.coaches.length > 0
          ? mongoTeam.coaches
              .filter((c) => c.current)
              .map((c) => ({
                id: c.id,
                name: c.name,
                firstname: c.name?.split(" ")[0] || null,
                lastname: c.name?.split(" ").slice(1).join(" ") || null,
                age: null,
                birth: {
                  date: null,
                  place: null,
                  country: "",
                },
                nationality: "",
                height: null,
                weight: null,
                photo: "",
                team: {
                  id: mongoTeam.korastats_id,
                  name: mongoTeam.name,
                  code: mongoTeam.code || "",
                  country: mongoTeam.country,
                  founded: mongoTeam.founded || null,
                  national: mongoTeam.national || false,
                  logo: mongoTeam.logo || "",
                },
                career: [],
              }))
          : [];

      const response: TeamSquadResponse = {
        players,
        coach,
      };

      this.cacheService.set(cacheKey, response, 60 * 60 * 1000); // Cache for 1 hour
      return response;
    } catch (error) {
      console.error("Failed to fetch team squad:", error);
      throw new ApiError(500, "Failed to fetch team squad");
    }
  }

  // ===================================================================
  // TEAM FOLLOWING METHODS (User-specific, would integrate with auth)
  // ===================================================================

  async followTeam(
    teamId: number,
  ): Promise<{ success: boolean; message: string; team_id: number }> {
    // This would typically interact with a user preferences database
    // For now, return a success response
    return {
      success: true,
      message: "Team followed successfully",
      team_id: teamId,
    };
  }

  async isFollowingTeam(teamId: number): Promise<boolean> {
    // This would typically check a user preferences database
    // For now, return false
    return false;
  }

  async unfollowTeam(
    teamId: number,
  ): Promise<{ success: boolean; message: string; team_id: number }> {
    // This would typically interact with a user preferences database
    // For now, return a success response
    return {
      success: true,
      message: "Team unfollowed successfully",
      team_id: teamId,
    };
  }

  // ===================================================================
  // CONVENIENCE METHODS FOR RECENT/UPCOMING FIXTURES
  // ===================================================================

  async getUpcomingFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `upcoming_fixture_${teamId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get next upcoming match for the team
      const upcomingMatch = await Models.Match.findOne({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        "fixture.date": { $gt: new Date() },
        "fixture.status.short": { $in: ["NS", "TBD"] },
      }).sort({ "fixture.date": 1 });

      if (!upcomingMatch) {
        return [];
      }

      const fixture = {
        fixture: {
          id: upcomingMatch.korastats_id,
          referee: upcomingMatch.fixture?.referee || null,
          timezone: upcomingMatch.fixture?.timezone || "UTC",
          date: upcomingMatch.fixture?.date,
          timestamp: upcomingMatch.fixture?.timestamp,
          periods: { first: null, second: null },
          venue: {
            id: upcomingMatch.fixture?.venue?.id || null,
            name: upcomingMatch.fixture?.venue?.name || null,
            city: upcomingMatch.fixture?.venue?.city || null,
          },
          status: {
            long: upcomingMatch.fixture?.status?.long || "Not Started",
            short: upcomingMatch.fixture?.status?.short || "NS",
            elapsed: null,
          },
        },
        league: {
          id: upcomingMatch.league?.id || upcomingMatch.tournament_id,
          name: upcomingMatch.league?.name || "",
          country: upcomingMatch.league?.country || "Saudi Arabia",
          logo: upcomingMatch.league?.logo || "",
          flag: upcomingMatch.league?.flag || "https://media.api-sports.io/flags/sa.svg",
          season: upcomingMatch.league?.season || new Date().getFullYear(),
          round: upcomingMatch.league?.round || "",
        },
        teams: {
          home: {
            id: upcomingMatch.teams?.home?.id || 0,
            name: upcomingMatch.teams?.home?.name || "",
            logo: upcomingMatch.teams?.home?.logo || "",
            winner: null,
          },
          away: {
            id: upcomingMatch.teams?.away?.id || 0,
            name: upcomingMatch.teams?.away?.name || "",
            logo: upcomingMatch.teams?.away?.logo || "",
            winner: null,
          },
        },
        goals: { home: null, away: null },
        score: {
          halftime: { home: null, away: null },
          fulltime: { home: null, away: null },
          extratime: { home: null, away: null },
          penalty: { home: null, away: null },
        },
        tablePosition: null,
        averageTeamRating: null,
      };

      const response: FixtureDataResponse = [fixture];

      this.cacheService.set(cacheKey, response, 5 * 60 * 1000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch upcoming fixture:", error);
      return [];
    }
  }

  async getLastFixture(teamId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `last_fixture_${teamId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get last completed match for the team
      const lastMatch = await Models.Match.findOne({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        "fixture.date": { $lt: new Date() },
        "fixture.status.short": "FT",
      }).sort({ "fixture.date": -1 });

      if (!lastMatch) {
        return [];
      }

      const fixture = {
        fixture: {
          id: lastMatch.korastats_id,
          referee: lastMatch.fixture?.referee || null,
          timezone: lastMatch.fixture?.timezone || "UTC",
          date: lastMatch.fixture?.date,
          timestamp: lastMatch.fixture?.timestamp,
          periods: {
            first: lastMatch.fixture?.periods?.first || null,
            second: lastMatch.fixture?.periods?.second || null,
          },
          venue: {
            id: lastMatch.fixture?.venue?.id || null,
            name: lastMatch.fixture?.venue?.name || null,
            city: lastMatch.fixture?.venue?.city || null,
          },
          status: {
            long: lastMatch.fixture?.status?.long || "Match Finished",
            short: lastMatch.fixture?.status?.short || "FT",
            elapsed: 90,
          },
        },
        league: {
          id: lastMatch.league?.id || lastMatch.tournament_id,
          name: lastMatch.league?.name || "",
          country: lastMatch.league?.country || "Saudi Arabia",
          logo: lastMatch.league?.logo || "",
          flag: lastMatch.league?.flag || "https://media.api-sports.io/flags/sa.svg",
          season: lastMatch.league?.season || new Date().getFullYear(),
          round: lastMatch.league?.round || "",
        },
        teams: {
          home: {
            id: lastMatch.teams?.home?.id || 0,
            name: lastMatch.teams?.home?.name || "",
            logo: lastMatch.teams?.home?.logo || "",
            winner:
              lastMatch.teams?.home?.winner ||
              lastMatch.goals?.home > lastMatch.goals?.away,
          },
          away: {
            id: lastMatch.teams?.away?.id || 0,
            name: lastMatch.teams?.away?.name || "",
            logo: lastMatch.teams?.away?.logo || "",
            winner:
              lastMatch.teams?.away?.winner ||
              lastMatch.goals?.away > lastMatch.goals?.home,
          },
        },
        goals: {
          home: lastMatch.goals?.home || 0,
          away: lastMatch.goals?.away || 0,
        },
        score: {
          halftime: {
            home: lastMatch.score?.halftime?.home || null,
            away: lastMatch.score?.halftime?.away || null,
          },
          fulltime: {
            home: lastMatch.score?.fulltime?.home || lastMatch.goals?.home || 0,
            away: lastMatch.score?.fulltime?.away || lastMatch.goals?.away || 0,
          },
          extratime: {
            home: lastMatch.score?.extratime?.home || null,
            away: lastMatch.score?.extratime?.away || null,
          },
          penalty: {
            home: lastMatch.score?.penalty?.home || null,
            away: lastMatch.score?.penalty?.away || null,
          },
        },
        tablePosition: lastMatch.tablePosition || null,
        averageTeamRating: lastMatch.averageTeamRating || null,
      };

      const response: FixtureDataResponse = [fixture];

      this.cacheService.set(cacheKey, response, 5 * 60 * 1000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch last fixture:", error);
      return [];
    }
  }
  async getTeamFormOverview(teamId: number): Promise<FixtureDataResponse> {
    try {
      const cacheKey = `team_form_overview_${teamId}`;

      const cached = this.cacheService.get<FixtureDataResponse>(cacheKey);
      if (cached) {
        return cached;
      }
      //get last 2 matches
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        "fixture.date": { $lt: new Date() },
        "fixture.status.short": "FT",
      })
        .sort({ "fixture.date": -1 })
        .limit(10);

      const response: FixtureDataResponse = matches.map((match) => ({
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
        tablePosition: match.tablePosition || null,
        averageTeamRating: match.averageTeamRating || null,
      }));

      this.cacheService.set(cacheKey, response, 5 * 60 * 1000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error("Failed to fetch team form overview:", error);
      return [];
    }
  }
}

