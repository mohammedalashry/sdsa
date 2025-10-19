import { ExportRequest, ExportResponse, ExportData, FileType } from "./export.types";
import { ApiError } from "@/core/middleware/error.middleware";
import { Models } from "@/db/mogodb/models";
import { FileGenerationService } from "./file-generation.service";
import { Response } from "express";
import fs from "fs";

export class ExportService {
  private fileGenerationService: FileGenerationService;

  constructor() {
    this.fileGenerationService = new FileGenerationService();
  }

  /**
   * Helper method to stream file directly to response
   */
  private async streamFile(
    res: Response,
    exportData: ExportData,
    filename: string,
    fileType: "xlsx" | "csv",
  ): Promise<void> {
    let filePath: string;

    if (fileType === "xlsx") {
      filePath = await this.fileGenerationService.generateExcelFile(exportData, filename);

      // Set headers for Excel download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    } else {
      filePath = await this.fileGenerationService.generateCsvFile(exportData, filename);

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    }

    res.setHeader("Content-Length", fs.statSync(filePath).size.toString());

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after streaming
    res.on("finish", () => {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Failed to delete temporary file ${filePath}:`, error);
      }
    });

    // Handle stream errors
    fileStream.on("error", (error) => {
      console.error("File stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to stream file" });
      }
    });
  }
  /**
   * Export leagues and teams
   */
  async exportLeaguesTeams(res: Response, params: ExportRequest): Promise<void> {
    try {
      const fileType = params.fileType || "xlsx";

      // Get leagues from MongoDB
      const leagues = await Models.League.find({}).lean();
      const teams = await Models.Team.find({}).lean();

      const exportData: ExportData = {
        leagues: leagues.map((league) => ({
          id: league.korastats_id,
          name: league.name,
          type: league.type,
          logo: league.logo,
          country: league.country,
        })),
        teams: teams.map((team) => ({
          id: team.korastats_id,
          name: team.name,
          logo: team.logo,
          country: team.country,
        })),
      };

      const filename = `leagues_teams_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      console.error("Export leagues teams error:", error);
      throw new ApiError(500, "Failed to export leagues and teams");
    }
  }

  /**
   * Export homepage data
   */
  async exportHomepage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { league, season, fileType = "xlsx" } = params;

      if (!league || !season) {
        throw new ApiError(400, "League and season are required");
      }

      // Get fixtures for the league and season
      const fixtures = await Models.Match.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      // Get standings (simplified)
      const standings = await Models.Standings.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      // Get top players (simplified)
      const players = await Models.Player.find({}).limit(20).lean();

      const exportData: ExportData = {
        fixtures: fixtures.map((fixture) => ({
          id: fixture.korastats_id,
          home_team: fixture.teams?.home?.name,
          away_team: fixture.teams?.away?.name,
          date: fixture.fixture?.date,
          status: fixture.fixture?.status?.short,
          score: fixture.goals,
        })),
        standings: standings.map((standing) => ({
          position: standing.seasons?.[0]?.standings?.[0]?.rank || 0,
          team: standing.seasons?.[0]?.standings?.[0]?.team?.name || "Unknown",
          points: standing.seasons?.[0]?.standings?.[0]?.points || 0,
          played: standing.seasons?.[0]?.standings?.[0]?.all?.played || 0,
          won: standing.seasons?.[0]?.standings?.[0]?.all?.win || 0,
          drawn: standing.seasons?.[0]?.standings?.[0]?.all?.draw || 0,
          lost: standing.seasons?.[0]?.standings?.[0]?.all?.lose || 0,
        })),
        top_players: players.map((player) => ({
          id: player.korastats_id,
          name: player.name,
          position: player.positions?.primary?.name,
          team: player.current_team?.name,
          goals: 0, // Player statistics not available in current schema
          assists: 0, // Player statistics not available in current schema
        })),
      };

      const filename = `homepage_${league}_${season}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export homepage error:", error);
      throw new ApiError(500, "Failed to export homepage data");
    }
  }

  /**
   * Export matches page data
   */
  async exportMatchesPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { league, season, fileType = "xlsx" } = params;

      if (!league || !season) {
        throw new ApiError(400, "League and season are required");
      }

      // Get matches for the league and season
      const matches = await Models.Match.find({
        "league.id": league,
        "league.season": season,
      }).lean();

      const exportData: ExportData = {
        matches: matches.map((match) => ({
          id: match.korastats_id,
          home_team: match.teams?.home?.name,
          away_team: match.teams?.away?.name,
          date: match.fixture?.date,
          status: match.fixture?.status?.short,
          score: match.goals,
          league: match.league?.name,
          season: match.league?.season,
        })),
      };

      const filename = `matches_page_${league}_${season}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export matches page error:", error);
      throw new ApiError(500, "Failed to export matches page data");
    }
  }

  /**
   * Export match detail page
   */
  async exportMatchDetailPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { fixture, fileType = "xlsx" } = params;

      if (!fixture) {
        throw new ApiError(400, "Fixture ID is required");
      }

      // Get fixture details
      const fixtureData = await Models.Match.findOne({
        korastats_id: fixture,
      }).lean();

      if (!fixtureData) {
        throw new ApiError(404, "Fixture not found");
      }

      // Get match details
      const matchDetails = await Models.MatchDetails.findOne({
        korastats_id: fixture,
      }).lean();

      const exportData: ExportData = {
        fixture: [
          {
            id: fixtureData.korastats_id,
            home_team: fixtureData.teams?.home?.name,
            away_team: fixtureData.teams?.away?.name,
            date: fixtureData.fixture?.date,
            status: fixtureData.fixture?.status?.short,
            score: fixtureData.goals,
            league: fixtureData.league?.name,
          },
        ],
        events:
          matchDetails?.timelineData?.map((event) => ({
            time: event.time?.elapsed,
            team: event.team?.name,
            player: event.player?.name,
            type: event.type,
            detail: event.detail,
          })) || [],
        statistics:
          matchDetails?.statisticsData?.map((stat) => ({
            team: stat.team?.name,
            type: stat.statistics?.[0]?.type || "Unknown",
            value: stat.statistics?.[0]?.value || 0,
          })) || [],
        lineup: matchDetails?.lineupsData?.map((lineup) => ({
          team: lineup.team?.name,
          formation: lineup.formation,
          startXI: lineup.startXI,
          substitutes: lineup.substitutes,
          coach: lineup.coach,
        })),
      };

      const filename = `match_detail_${fixture}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export match detail error:", error);
      throw new ApiError(500, "Failed to export match detail data");
    }
  }

  /**
   * Export player detail page
   */
  async exportPlayerDetailPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { player, league, season, fileType = "xlsx" } = params;

      if (!player || !league || !season) {
        throw new ApiError(400, "Player ID, league ID, and season are required");
      }

      // Get player data
      const playerData = await Models.Player.findOne({
        korastats_id: player,
      }).lean();

      if (!playerData) {
        throw new ApiError(404, "Player not found");
      }

      const exportData: ExportData = {
        player_info: [
          {
            id: playerData.korastats_id,
            name: playerData.name,
            age: playerData.age,
            position: playerData.positions?.primary?.name,
            nationality: playerData.nationality,
            team: playerData.current_team?.name,
            height: playerData.height,
            weight: playerData.weight,
          },
        ],
        statistics: playerData.stats,
      };

      const filename = `player_detail_${player}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export player detail error:", error);
      throw new ApiError(500, "Failed to export player detail data");
    }
  }

  /**
   * Export team detail page
   */
  async exportTeamDetailPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { team, league, season, fileType = "xlsx" } = params;

      if (!team || !league || !season) {
        throw new ApiError(400, "Team ID, league ID, and season are required");
      }

      // Get team data
      const teamData = await Models.Team.findOne({
        korastats_id: team,
      }).lean();

      if (!teamData) {
        throw new ApiError(404, "Team not found");
      }

      // Get team players
      const players = await Models.Player.find({
        "current_team.id": team,
      }).lean();

      const exportData: ExportData = {
        team_info: [
          {
            id: teamData.korastats_id,
            name: teamData.name,
            logo: teamData.logo,
            country: teamData.country,
            founded: teamData.founded,
            national: teamData.national,
            code: teamData.code,
            venue: {
              id: teamData.venue?.id,
              name: teamData.venue?.name,
              address: teamData.venue?.address,
              capacity: teamData.venue?.capacity,
              surface: teamData.venue?.surface,
              city: teamData.venue?.city,
              image: teamData.venue?.image,
            },
            coach: teamData.coaches.map((coach) => ({
              id: coach.id,
              name: coach.name,
              photo: coach.photo,
            })),
            totalPlayers: teamData.totalPlayers,
            foreignPlayers: teamData.foreignPlayers,
            averagePlayerAge: teamData.averagePlayerAge,
            clubMarketValue: teamData.clubMarketValue,
            currentLeagues: teamData.tournaments.map((tournament) => ({
              id: tournament.id,
              name: tournament.name,
              logo: tournament.logo,
              season: tournament.season,
              current: tournament.current,
            })),
          },
        ],
        squad: players.map((player) => ({
          id: player.korastats_id,
          name: player.name,
          position: player.positions?.primary?.name,
          age: player.age,
          nationality: player.nationality,
          goals: player.stats?.[0]?.goals?.total || 0,
          assists: player.stats?.[0]?.goals?.assists || 0,
          shots: player.stats?.[0]?.shots?.total || 0,
          passes: player.stats?.[0]?.passes?.total || 0,
          tackles: player.stats?.[0]?.tackles?.total || 0,
          cards:
            player.stats?.[0]?.cards?.yellow ||
            0 + player.stats?.[0]?.cards?.yellowred ||
            0 + player.stats?.[0]?.cards?.red ||
            0,
          fouls: player.stats?.[0]?.fouls?.committed || 0,
          penalty: player.stats?.[0]?.penalty?.commited || 0,
          penalty_scored: player.stats?.[0]?.penalty?.scored || 0,
          penalty_missed: player.stats?.[0]?.penalty?.missed || 0,
          penalty_saved: player.stats?.[0]?.penalty?.saved || 0,
          penalty_won: player.stats?.[0]?.penalty?.won || 0,
        })),
      };

      const filename = `team_detail_${team}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export team detail error:", error);
      throw new ApiError(500, "Failed to export team detail data");
    }
  }

  /**
   * Export upcoming match detail page
   */
  async exportUpcomingMatchDetailPage(
    res: Response,
    params: ExportRequest,
  ): Promise<void> {
    // For now, use the same logic as match detail page
    await this.exportMatchDetailPage(res, params);
  }

  /**
   * Export leagues and cups
   */
  async exportLeaguesCups(res: Response, params: ExportRequest): Promise<void> {
    // For now, use the same logic as leagues teams
    await this.exportLeaguesTeams(res, params);
  }

  /**
   * Export leagues and cups detail
   */
  async exportLeaguesCupsDetail(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { league, fileType = "xlsx" } = params;

      if (!league) {
        throw new ApiError(400, "League ID is required");
      }

      // Get comprehensive league data
      const leagueData = await Models.League.findOne({
        korastats_id: league,
      }).lean();

      if (!leagueData) {
        throw new ApiError(404, "League not found");
      }

      // Get teams in this league
      const teams = await Models.Team.find({
        "tournaments.id": league,
      }).lean();

      // Get standings for this league
      const standings = await Models.Standings.findOne({
        korastats_id: league,
      }).lean();

      // Get recent matches for this league
      const recentMatches = await Models.Match.find({
        "league.id": league,
      })
        .sort({ "fixture.timestamp": -1 })
        .limit(20)
        .lean();

      const exportData: ExportData = {
        league_info: [
          {
            id: leagueData.korastats_id,
            name: leagueData.name,
            type: leagueData.type,
            logo: leagueData.logo,
            country: leagueData.country?.name,
            country_code: leagueData.country?.code,
            country_flag: leagueData.country?.flag,
            organizer: leagueData.organizer?.name,
            organizer_abbrev: leagueData.organizer?.abbrev,
            age_group: leagueData.age_group?.name,
            min_age: leagueData.age_group?.min_age,
            max_age: leagueData.age_group?.max_age,
            gender: leagueData.gender,
            rounds_count: leagueData.rounds_count,
            rounds: leagueData.rounds?.join(", "),
            last_synced: leagueData.last_synced,
            created_at: leagueData.created_at,
            updated_at: leagueData.updated_at,
          },
        ],
        seasons:
          leagueData.seasons?.map((season) => ({
            year: season.year,
            start: season.start,
            end: season.end,
            current: season.current,
            rounds_count: season.rounds_count,
            rounds: season.rounds?.join(", "),
          })) || [],
        teams: teams.map((team) => ({
          id: team.korastats_id,
          name: team.name,
          code: team.code,
          logo: team.logo,
          founded: team.founded,
          national: team.national,
          country: team.country,
          venue_name: team.venue?.name,
          venue_capacity: team.venue?.capacity,
          venue_surface: team.venue?.surface,
          venue_city: team.venue?.city,
          total_players: team.totalPlayers,
          foreign_players: team.foreignPlayers,
          average_player_age: team.averagePlayerAge,
          club_market_value: team.clubMarketValue,
          current_coach: team.coaches?.find((c) => c.current)?.name,
          games_played_home: team.stats_summary?.gamesPlayed?.home || 0,
          games_played_away: team.stats_summary?.gamesPlayed?.away || 0,
          wins_home: team.stats_summary?.wins?.home || 0,
          wins_away: team.stats_summary?.wins?.away || 0,
          draws_home: team.stats_summary?.draws?.home || 0,
          draws_away: team.stats_summary?.draws?.away || 0,
          loses_home: team.stats_summary?.loses?.home || 0,
          loses_away: team.stats_summary?.loses?.away || 0,
          goals_scored_home: team.stats_summary?.goalsScored?.home || 0,
          goals_scored_away: team.stats_summary?.goalsScored?.away || 0,
          goals_conceded_home: team.stats_summary?.goalsConceded?.home || 0,
          goals_conceded_away: team.stats_summary?.goalsConceded?.away || 0,
          goal_difference: team.stats_summary?.goalDifference || 0,
          clean_sheet_games: team.stats_summary?.cleanSheetGames || 0,
        })),
        standings:
          standings?.seasons?.flatMap(
            (season) =>
              season.standings?.map((standing) => ({
                season_year: season.year,
                rank: standing.rank,
                team_name: standing.team?.name,
                team_logo: standing.team?.logo,
                points: standing.points,
                goals_diff: standing.goalsDiff,
                group: standing.group,
                form: standing.form,
                status: standing.status,
                description: standing.description,
                all_played: standing.all?.played || 0,
                all_win: standing.all?.win || 0,
                all_draw: standing.all?.draw || 0,
                all_lose: standing.all?.lose || 0,
                all_goals_for: standing.all?.goals?.for_ || 0,
                all_goals_against: standing.all?.goals?.against || 0,
                home_played: standing.home?.played || 0,
                home_win: standing.home?.win || 0,
                home_draw: standing.home?.draw || 0,
                home_lose: standing.home?.lose || 0,
                home_goals_for: standing.home?.goals?.for_ || 0,
                home_goals_against: standing.home?.goals?.against || 0,
                away_played: standing.away?.played || 0,
                away_win: standing.away?.win || 0,
                away_draw: standing.away?.draw || 0,
                away_lose: standing.away?.lose || 0,
                away_goals_for: standing.away?.goals?.for_ || 0,
                away_goals_against: standing.away?.goals?.against || 0,
              })) || [],
          ) || [],
        recent_matches: recentMatches.map((match) => ({
          id: match.korastats_id,
          tournament_id: match.tournament_id,
          home_team: match.teams?.home?.name,
          away_team: match.teams?.away?.name,
          home_team_logo: match.teams?.home?.logo,
          away_team_logo: match.teams?.away?.logo,
          home_goals: match.goals?.home,
          away_goals: match.goals?.away,
          date: match.fixture?.date,
          timestamp: match.fixture?.timestamp,
          status: match.fixture?.status?.short,
          status_long: match.fixture?.status?.long,
          elapsed: match.fixture?.status?.elapsed,
          venue_name: match.fixture?.venue?.name,
          venue_city: match.fixture?.venue?.city,
          referee: match.fixture?.referee,
          round: match.league?.round,
          season: match.league?.season,
          halftime_home: match.score?.halftime?.home,
          halftime_away: match.score?.halftime?.away,
          fulltime_home: match.score?.fulltime?.home,
          fulltime_away: match.score?.fulltime?.away,
          extratime_home: match.score?.extratime?.home,
          extratime_away: match.score?.extratime?.away,
          penalty_home: match.score?.penalty?.home,
          penalty_away: match.score?.penalty?.away,
        })),
      };

      const filename = `leagues_cups_detail_${league}_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export leagues cups detail error:", error);
      throw new ApiError(500, "Failed to export leagues cups detail data");
    }
  }

  /**
   * Export player comparison page
   */
  async exportPlayerComparisonPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { players, fileType = "xlsx" } = params;

      if (!players || !Array.isArray(players)) {
        throw new ApiError(400, "Player IDs array is required");
      }

      // Get player data for comparison
      const playersData = await Models.Player.find({
        korastats_id: { $in: players },
      }).lean();

      const exportData: ExportData = {
        players: playersData.map((player) => ({
          id: player.korastats_id,
          name: player.name,
          position: player.positions?.primary?.name,
          team: player.current_team?.name,
          nationality: player.nationality,
          age: player.age,
          goals: player.stats?.[0]?.goals?.total || 0,
          assists: player.stats?.[0]?.goals?.assists || 0,
          appearances: player.stats?.[0]?.games?.appearences || 0,
          minutes: player.stats?.[0]?.games?.minutes || 0,
          rating: player.stats?.[0]?.games?.rating || "0.0",
        })),
      };

      const filename = `player_comparison_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export player comparison error:", error);
      throw new ApiError(500, "Failed to export player comparison data");
    }
  }

  /**
   * Export team comparison page
   */
  async exportTeamComparisonPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { teams, fileType = "xlsx" } = params;

      if (!teams || !Array.isArray(teams)) {
        throw new ApiError(400, "Team IDs array is required");
      }

      // Get team data for comparison
      const teamsData = await Models.Team.find({
        korastats_id: { $in: teams },
      }).lean();

      const exportData: ExportData = {
        teams: teamsData.map((team) => ({
          id: team.korastats_id,
          name: team.name,
          country:
            typeof team.country === "string"
              ? team.country
              : (team.country as any)?.name || "Unknown",
          founded: team.founded,
          venue: typeof team.venue === "string" ? team.venue : team.venue?.name,
          logo: team.logo,
        })),
      };

      const filename = `team_comparison_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export team comparison error:", error);
      throw new ApiError(500, "Failed to export team comparison data");
    }
  }

  /**
   * Export coach comparison page
   */
  async exportCoachComparisonPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { coaches, fileType = "xlsx" } = params;

      if (!coaches || !Array.isArray(coaches)) {
        throw new ApiError(400, "Coach IDs array is required");
      }

      // Get coach data for comparison
      const coachesData = await Models.Coach.find({
        korastats_id: { $in: coaches },
      }).lean();

      const exportData: ExportData = {
        coaches: coachesData.map((coach) => ({
          id: coach.korastats_id,
          name: coach.name,
          nationality: coach.nationality,
          team: (coach as any).current_team?.name || "Unknown",
          age: coach.age,
        })),
      };

      const filename = `coach_comparison_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export coach comparison error:", error);
      throw new ApiError(500, "Failed to export coach comparison data");
    }
  }

  /**
   * Export referee comparison page
   */
  async exportRefereeComparisonPage(res: Response, params: ExportRequest): Promise<void> {
    try {
      const { referees, fileType = "xlsx" } = params;

      if (!referees || !Array.isArray(referees)) {
        throw new ApiError(400, "Referee IDs array is required");
      }

      // Get referee data for comparison
      const refereesData = await Models.Referee.find({
        korastats_id: { $in: referees },
      }).lean();

      const exportData: ExportData = {
        referees: refereesData.map((referee) => ({
          id: referee.korastats_id,
          name: referee.name,
          nationality: (referee as any).nationality || "Unknown",
          age: referee.age,
        })),
      };

      const filename = `referee_comparison_${Date.now()}`;
      await this.streamFile(res, exportData, filename, fileType);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Export referee comparison error:", error);
      throw new ApiError(500, "Failed to export referee comparison data");
    }
  }
}

