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
      let query = {
        tournaments: {
          $elemMatch: {
            id: league,
            season: parseInt(season), // Convert string to number
          },
        },
      };
      const mongoTeams = await Models.Team.find(query);

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

      // If no data in MongoDB, return empty response
      console.log("No teams found in MongoDB for league", league, "season", season);
      const emptyResponse: TeamsResponse = [];
      this.cacheService.set(cacheKey, emptyResponse);
      return emptyResponse;
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
      const coaches = await Models.Coach.find({ team_id: teamId });
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
            coaches && coaches.length > 0
              ? coaches
                  .filter((coach) => coach.status === "active")
                  .map((coach) => ({
                    id: coach.korastats_id,
                    name: coach.name,
                    firstname: coach.firstname || null,
                    lastname: coach.lastname || null,
                    age: coach.age || null,
                    birth: {
                      date: coach.birth.date.toISOString() || null,
                      place: coach.birth.place || null,
                      country: coach.birth.country || "",
                    },
                    nationality: coach.nationality || "",
                    height: coach.height?.toString() || null,
                    weight: coach.weight?.toString() || null,
                    photo: coach.photo || "",
                    team: {
                      id: mongoTeam.korastats_id,
                      name: mongoTeam.name,
                      code: mongoTeam.code || "",
                      country: mongoTeam.country,
                      founded: mongoTeam.founded || null,
                      national: mongoTeam.national || false,
                      logo: mongoTeam.logo || "",
                    },
                    career: coach.career_history || [],
                  }))
              : [],
          transfers: [],
          totalPlayers: mongoTeam.totalPlayers || 0,
          foreignPlayers: mongoTeam.foreignPlayers || 0,
          averagePlayerAge: mongoTeam.averagePlayerAge || 0,
          clubMarketValue: mongoTeam.clubMarketValue || null,
          currentLeagues:
            mongoTeam.tournaments
              .filter((tournament) => tournament.current)
              .map((tournament) => ({
                id: tournament.id,
                name: tournament.name,
                type: "league",
                logo: tournament.logo,
              })) || [], // Would be populated from tournament data
          trophies: [],
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
        fixture: match.fixture,
        league: match.league,
        teams: match.teams,
        goals: match.goals,
        score: match.score,
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
        data: await this.calculateGoalsOverTime(teamId),
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
        data: await this.calculateFormOverTime(teamId),
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
      const currentStandings = await Models.Standings.findOne({ korastats_id: league });
      const currentSeason = currentStandings?.seasons.find((s) => s.year === season);
      const currentRank = currentSeason?.standings.find((s) => s.team.id === teamId);
      const positions = [];

      for (let i = 1; i <= 10; i++) {
        // Simulate position changes over time
        const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const position = Math.max(1, Math.min(20, currentRank?.rank + variation));
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
        fixture: upcomingMatch.fixture,
        league: upcomingMatch.league,
        teams: upcomingMatch.teams,
        goals: upcomingMatch.goals,
        score: upcomingMatch.score,
        tablePosition: upcomingMatch.tablePosition,
        averageTeamRating: upcomingMatch.averageTeamRating,
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
        fixture: lastMatch.fixture,
        league: lastMatch.league,
        teams: lastMatch.teams,
        goals: lastMatch.goals,
        score: lastMatch.score,
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

  /**
   * Calculate goals over time from actual match data
   */
  private async calculateGoalsOverTime(teamId: number): Promise<any[]> {
    try {
      // Step 1: Fetch matches where this team played (home or away)
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        "fixture.status.short": "FT", // Only finished matches
      })
        .sort({ "fixture.timestamp": 1 }) // Sort by date ascending
        .lean();

      if (matches.length === 0) {
        return [];
      }

      // Step 2: Get match IDs for MatchDetails lookup
      const matchIds = matches.map((match) => match.korastats_id);

      // Step 3: Fetch MatchDetails for statistics (shots, possession, logos)
      const matchDetails = await Models.MatchDetails.find({
        korastats_id: { $in: matchIds },
      }).lean();

      // Step 4: Create a map for quick lookup
      const detailsMap = new Map();
      matchDetails.forEach((detail) => {
        detailsMap.set(detail.korastats_id, detail);
      });

      // Step 5: Combine data and return
      return matches.map((match) => {
        const isHome = match.teams.home.id === teamId;
        const goalsScored = isHome
          ? match.score?.fulltime?.home || 0
          : match.score?.fulltime?.away || 0;
        const goalsConceded = isHome
          ? match.score?.fulltime?.away || 0
          : match.score?.fulltime?.home || 0;
        const opponent = isHome ? match.teams.away : match.teams.home;

        // Get match details for this match
        const details = detailsMap.get(match.korastats_id);
        let teamLogo = "";
        let opponentLogo = "";
        let totalShots = 0;
        let opponentTotalShots = 0;
        if (details?.statisticsData) {
          // Find team stats in MatchDetails
          const teamStats = details.statisticsData.find(
            (stat) => stat.team.id === teamId,
          );
          const opponentStats = details.statisticsData.find(
            (stat) => stat.team.id === opponent.id,
          );

          if (teamStats) {
            teamLogo = teamStats.team.logo;
            const shotsStat = teamStats.statistics.find((s) => s.type === "Total Shots");
            totalShots = shotsStat ? Number(shotsStat.value) || 0 : 0;
          }

          if (opponentStats) {
            opponentLogo = opponentStats.team.logo;
            const shotsStat = opponentStats.statistics.find(
              (s) => s.type === "Total Shots",
            );
            opponentTotalShots = shotsStat ? Number(shotsStat.value) || 0 : 0;
          }
        }

        return {
          date: match.fixture.date,
          timestamp: match.fixture.timestamp,
          goalsScored: {
            totalShots: totalShots,
            totalGoals: goalsScored,
            team: {
              id: teamId,
              name: isHome ? match.teams.home.name : match.teams.away.name,
              logo: teamLogo,
            },
          },
          goalsConceded: {
            totalShots: opponentTotalShots,
            totalGoals: goalsConceded,
            team: { id: opponent.id, name: opponent.name, logo: opponentLogo },
          },
          opponentTeam: { id: opponent.id, name: opponent.name, logo: opponentLogo },
        };
      });
    } catch (error) {
      console.error("Failed to calculate goals over time:", error);
      return [];
    }
  }

  /**
   * Calculate form over time from actual match data
   */
  private async calculateFormOverTime(teamId: number): Promise<any[]> {
    try {
      // Step 1: Fetch matches where this team played (home or away)
      const matches = await Models.Match.find({
        $or: [{ "teams.home.id": teamId }, { "teams.away.id": teamId }],
        "fixture.status.short": "FT", // Only finished matches
      })
        .sort({ "fixture.timestamp": 1 }) // Sort by date ascending
        .lean();

      if (matches.length === 0) {
        return [];
      }

      // Step 2: Get match IDs for MatchDetails lookup
      const matchIds = matches.map((match) => match.korastats_id);

      // Step 3: Fetch MatchDetails for statistics (possession, logos)
      const matchDetails = await Models.MatchDetails.find({
        korastats_id: { $in: matchIds },
      }).lean();

      // Step 4: Create a map for quick lookup
      const detailsMap = new Map();
      matchDetails.forEach((detail) => {
        detailsMap.set(detail.korastats_id, detail);
      });

      // Step 5: Combine data and return
      return matches.map((match) => {
        const isHome = match.teams.home.id === teamId;
        const opponent = isHome ? match.teams.away : match.teams.home;

        // Get match details for this match
        const details = detailsMap.get(match.korastats_id);
        let teamLogo = "";
        let opponentLogo = "";
        let currentPossession = 50; // Default fallback
        let opponentPossession = 50; // Default fallback

        if (details?.statisticsData) {
          // Find team stats in MatchDetails
          const teamStats = details.statisticsData.find(
            (stat) => stat.team.id === teamId,
          );
          const opponentStats = details.statisticsData.find(
            (stat) => stat.team.id === opponent.id,
          );

          if (teamStats) {
            teamLogo = teamStats.team.logo;
            const possessionStat = teamStats.statistics.find(
              (s) => s.type === "Ball Possession",
            );
            if (possessionStat) {
              currentPossession = Number(possessionStat.value) || 50;
            }
          }

          if (opponentStats) {
            opponentLogo = opponentStats.team.logo;
            const possessionStat = opponentStats.statistics.find(
              (s) => s.type === "Ball Possession",
            );
            if (possessionStat) {
              opponentPossession = Number(possessionStat.value) || 50;
            }
          }
        }

        return {
          date: match.fixture.date,
          timestamp: match.fixture.timestamp,
          currentPossession: currentPossession,
          opponentPossession: opponentPossession,
          opponentTeam: { id: opponent.id, name: opponent.name, logo: opponentLogo },
          currentTeam: {
            id: teamId,
            name: isHome ? match.teams.home.name : match.teams.away.name,
            logo: teamLogo,
          },
        };
      });
    } catch (error) {
      console.error("Failed to calculate form over time:", error);
      return [];
    }
  }
}

