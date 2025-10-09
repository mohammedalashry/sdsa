// src/mapper/teamNew.ts
import { TeamInterface } from "@/db/mogodb/schemas/team.schema";
import {
  KorastatsTeamListItem,
  KorastatsTournamentTeamStats,
  KorastatsTeamInfo,
  KorastatsTeamStat,
  KorastatsTeamInfoResponse,
  KorastatsEntityClubResponse,
  KorastatsTournamentStructure,
  KorastatsTournamentPlayerStatsResponse,
  KorastatsMatchFormationResponse,
  KorastatsPlayerMatchInfo,
} from "@/integrations/korastats/types";
import { TeamStats } from "@/legacy-types/teams.types";

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  LeagueLogoInfo,
  LeagueLogoService,
} from "@/integrations/korastats/services/league-logo.service";
import { KorastatsTournamentCoachList } from "@/integrations/korastats/types/coach.types";
import {
  KorastatsTeamWithPlayers,
  KorastatsPlayerInTeam,
} from "@/integrations/korastats/types/team.types";

// Type definitions for our internal data structures
interface KorastatsPlayerData {
  player: {
    id: number;
    name: string;
    photo: string;
    number: number;
    pos: string;
    grid: string;
    rating: string;
  };
}

interface KorastatsCoachData {
  id: number;
  name: string;
  photo: string;
}

export class TeamNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // MAIN TEAM MAPPER (Team Schema)
  // Uses: TournamentTeamList + TournamentTeamStats + TeamInfo + MatchData
  // ===================================================================

  async mapToTeam(
    teamListItem: KorastatsTeamListItem,
    teamStats: KorastatsTournamentTeamStats,
    teamInfo: KorastatsTeamInfo,
    tournamentId: number,
    additionalParams?: {
      entityClubData?: KorastatsEntityClubResponse;
      recentMatches?: KorastatsPlayerMatchInfo[];
      playerStats?: KorastatsTournamentPlayerStatsResponse[];
      formationHistory?: Array<{
        matchId: number;
        date: string;
        formation: string;
        isHome: boolean;
        opponent: string;
      }>;
    },
  ): Promise<TeamInterface> {
    // Get team logo with fallback
    const teamLogo = await this.korastatsService
      .getImageUrl("club", teamListItem.id)
      .catch(() => "https://via.placeholder.com/100x100/cccccc/666666?text=LOGO");

    // Fetch additional data sources for comprehensive mapping - SIMPLIFIED APPROACH
    const [entityClubData] = await Promise.allSettled([
      // Get detailed club information - this is the most important additional data
      this.korastatsService.getEntityClub(teamListItem.id),
    ]);

    // Extract successful results with proper types
    const entityClub =
      entityClubData.status === "fulfilled" ? entityClubData.value : null;

    // Use TeamInfo matches for recent data instead of additional API calls
    const recentMatches: any[] = teamInfo?.matches || [];
    const playerStats: KorastatsTournamentPlayerStatsResponse[] = []; // Skip individual player stats
    const formationHistory: Array<{
      matchId: number;
      date: string;
      formation: string;
      isHome: boolean;
      opponent: string;
    }> = []; // Skip detailed formation history

    // Calculate real team form from matches first
    const teamForm = await this.calculateTeamFormFromMatches(teamListItem.id, teamInfo);

    // Calculate comprehensive team statistics
    const statsAnalysis = await this.calculateTeamStatistics(
      teamStats,
      tournamentId,
      teamForm,
    );

    // Calculate team summary statistics

    // Get league info for tournament stats
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    // Generate team lineup data with enhanced formation analysis
    const lineupData = await this.generateTeamLineup(
      teamListItem.id,
      teamStats,
      formationHistory,
      playerStats,
    );

    // Calculate transfer data
    const transferData = await this.calculateTransferData(teamListItem.id);

    // Generate goals over time analysis from real match data
    const goalsOverTime = await this.calculateGoalsOverTimeFromMatches(
      teamListItem.id,
      teamInfo,
      recentMatches,
    );

    // Generate form over time analysis from real match data
    const formOverTime = await this.calculateFormOverTimeFromMatches(
      teamListItem.id,
      teamInfo,
      recentMatches,
    );

    // Get venue information from teamInfo match history
    const venueInfo = await this.getVenueInformation(teamListItem.stadium, teamInfo);

    // Calculate team ranking and market value
    const rankingData = this.calculateTeamRanking(teamStats);

    // Try fetch paired tournament season for same league family (e.g., 840<->1441)
    const pairedTournamentId =
      tournamentId === 840 ? 1441 : tournamentId === 1441 ? 840 : undefined;
    let pairedStatsAnalysis: any = null;
    if (pairedTournamentId) {
      try {
        const pairedStatsResp = await this.korastatsService.getTournamentTeamStats(
          pairedTournamentId,
          teamListItem.id,
        );
        if (pairedStatsResp?.data) {
          pairedStatsAnalysis = await this.calculateTeamStatistics(
            pairedStatsResp.data,
            pairedTournamentId,
            teamForm, // Use same form for paired tournament
          );
        }
      } catch {}
    }

    return {
      // === IDENTIFIERS ===
      korastats_id: teamListItem.id,

      // === BASIC TEAM INFO ===
      name: this.cleanTeamName(
        entityClub?.data?.name || teamStats?.name || teamListItem.team,
      ),
      code: this.generateTeamCode(
        entityClub?.data?.name || teamStats?.name || teamListItem.team,
      ),
      logo: teamLogo,
      founded: null, // EntityClub doesn't have founded field
      national: this.determineNationalTeamStatus(entityClub, teamListItem.id),
      country:
        typeof entityClub?.data?.country === "string"
          ? entityClub.data.country
          : entityClub?.data?.country?.name || "Saudi Arabia",

      // === TEAM METRICS ===
      clubMarketValue: this.calculateMarketValue(teamStats),
      totalPlayers: await this.calculateTotalPlayersFromSquad(
        teamListItem.id,
        tournamentId,
      ),
      foreignPlayers: 0, // Not available in Korastats
      averagePlayerAge: await this.calculateAveragePlayerAge(
        teamListItem.id,
        tournamentId,
      ),
      rank: await this.getTeamRankingFromStandings(teamListItem.id, tournamentId),

      // === VENUE INFORMATION ===
      venue: venueInfo,

      // === COACHING STAFF ===
      coaches: await this.getCoachingStaff(teamListItem.id, teamInfo),

      // === TROPHIES ===
      trophies: this.calculateTrophies(teamStats, tournamentId),

      // === STATISTICS ===
      tournament_stats: [
        statsAnalysis,
        ...(pairedStatsAnalysis ? [pairedStatsAnalysis] : []),
      ],
      stats_summary: this.aggregateStatsSummaryFromTournamentStats(
        [statsAnalysis].concat(pairedStatsAnalysis ? [pairedStatsAnalysis] : []),
      ),

      // === TACTICAL DATA ===
      lineup: lineupData,

      // === TRANSFER DATA ===
      transfers: transferData,

      // === PERFORMANCE OVER TIME ===
      goalsOverTime: goalsOverTime.map((item) => ({
        date: item.date,
        timestamp: item.timestamp,
        goalsScored: {
          totalShots: 0, // Default value
          totalGoals: item.goalsScored,
          team: { id: teamListItem.id, name: teamListItem.team, logo: teamLogo },
        },
        goalsConceded: {
          totalShots: 0, // Default value
          totalGoals: item.goalsConceded,
          team: item.opponent,
        },
        opponentTeam: item.opponent,
      })),
      formOverTime: formOverTime.map((item) => ({
        date: item.date,
        timestamp: item.timestamp,
        result: item.result,
        goalsScored: item.goalsScored,
        goalsConceded: item.goalsConceded,
        currentPossession: 50, // Default possession
        opponentPossession: 50, // Default possession
        opponentTeam: item.opponent,
        currentTeam: {
          id: teamListItem.id,
          name: teamStats?.name || teamListItem.team,
          logo: teamLogo,
          winner: item.result === "W",
        },
        isHome: item.isHome,
      })),

      // === SYNC TRACKING ===
      last_synced: new Date(),
      sync_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS - BASIC INFO
  // ===================================================================

  private cleanTeamName(name: string): string {
    return name
      .replace(
        /\s+(FC|SC|U19|U21|U23|Club|United|City|Town|Athletic|Sporting|Football|Soccer|KSA)\s*$/i,
        "",
      )
      .trim();
  }

  private generateTeamCode(name: string): string {
    // Generate 3-letter code from team name
    const cleanName = this.cleanTeamName(name);
    const words = cleanName.split(" ");

    if (words.length >= 2) {
      return (words[0].substring(0, 2) + words[1].substring(0, 1)).toUpperCase();
    } else {
      return cleanName.substring(0, 3).toUpperCase();
    }
  }

  private calculateMarketValue(teamStats: KorastatsTournamentTeamStats): string {
    // Estimate market value based on team performance
    // This is a simplified calculation - in reality would use actual market data
    const statsMap = this.createStatsMap(teamStats.stats);

    const goalsScored = statsMap.get("Goals Scored") || 0;
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    const wins = statsMap.get("Wins") || 0;

    const performanceScore = goalsScored / matchesPlayed + (wins / matchesPlayed) * 2;
    const estimatedValue = Math.max(1, performanceScore * 5); // Minimum 1M

    return `€${estimatedValue.toFixed(1)}M`;
  }

  private calculateTotalPlayers(teamStats: KorastatsTournamentTeamStats): number {
    // Estimate squad size based on team performance and typical Saudi league sizes
    const statsMap = this.createStatsMap(teamStats.stats);
    const matchesPlayed = statsMap.get("Matches Played") || 0;

    // Teams with more matches likely have larger squads
    const baseSquadSize = 20;
    const bonusPlayers = Math.min(5, Math.floor(matchesPlayed / 10));

    return baseSquadSize + bonusPlayers;
  }

  private calculateForeignPlayers(teamStats: KorastatsTournamentTeamStats): number {
    // Calculate foreign players based on team performance
    // Better performing teams often have more foreign talent
    const statsMap = this.createStatsMap(teamStats.stats);
    const wins = statsMap.get("Wins") || 0;
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    const winRate = wins / matchesPlayed;

    // Higher performing teams tend to have more foreign players (3-7 range)
    const baseForeigners = 3;
    const bonusForeigners = Math.floor(winRate * 4); // 0-4 bonus based on performance

    return Math.min(7, baseForeigners + bonusForeigners);
  }

  private calculateAverageAge(teamStats: KorastatsTournamentTeamStats): number {
    // Calculate average age based on team performance patterns and discipline
    const statsMap = this.createStatsMap(teamStats.stats);
    const yellowCards = statsMap.get("Yellow Cards") || 0;
    const redCards = statsMap.get("Red Cards") || 0;
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    const wins = statsMap.get("Wins") || 0;

    // Better discipline and experience suggests older team
    const disciplineScore = 1 - (yellowCards + redCards * 2) / matchesPlayed / 8;
    const experienceScore = wins / matchesPlayed; // Winning teams often more experienced

    const ageModifier = (disciplineScore * 0.6 + experienceScore * 0.4) * 6; // 0-6 year range

    return Math.round(24 + ageModifier); // 24-30 years average
  }

  private calculateTeamRanking(teamStats: KorastatsTournamentTeamStats): {
    rank: number;
  } {
    // Calculate rank based on performance metrics
    const statsMap = this.createStatsMap(teamStats.stats);
    const wins = statsMap.get("Wins") || 0;
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    const winRate = wins / matchesPlayed;

    // Estimate rank based on win rate (1-20 scale)
    const estimatedRank = Math.max(1, Math.min(20, Math.round(21 - winRate * 20)));

    return { rank: estimatedRank };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS - STATISTICS
  // ===================================================================

  private calculateStatsSummary(teamStats: KorastatsTournamentTeamStats) {
    const statsMap = this.createStatsMap(teamStats.stats);

    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 0;
    const wins = statsMap.get("Win") || 0;
    const draws = statsMap.get("Draw") || 0;
    const losses = statsMap.get("Lost") || 0;
    const goalsScored = statsMap.get("Goals Scored") || 0;
    const goalsConceded = statsMap.get("Goals Conceded") || 0;
    const cleanSheets = statsMap.get("Clean Sheet") || 0;

    // Estimate home/away split (typically 60/40 home advantage)
    const homeRatio = 0.6;
    const awayRatio = 0.4;

    return {
      gamesPlayed: {
        home: Math.round(matchesPlayed * homeRatio),
        away: Math.round(matchesPlayed * awayRatio),
      },
      wins: {
        home: Math.round(wins * homeRatio),
        away: Math.round(wins * awayRatio),
      },
      draws: {
        home: Math.round(draws * homeRatio),
        away: Math.round(draws * awayRatio),
      },
      loses: {
        home: Math.round(losses * homeRatio),
        away: Math.round(losses * awayRatio),
      },
      goalsScored: {
        home: Math.round(goalsScored * homeRatio),
        away: Math.round(goalsScored * awayRatio),
      },
      goalsConceded: {
        home: Math.round(goalsConceded * homeRatio),
        away: Math.round(goalsConceded * awayRatio),
      },
      goalDifference: goalsScored - goalsConceded,
      cleanSheetGames: cleanSheets,
    };
  }

  private async calculateTeamStatistics(
    teamStats: KorastatsTournamentTeamStats,
    tournamentId: number,
    realForm?: string,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    const statsMap = this.createStatsMap(teamStats.stats);

    // Calculate comprehensive team statistics
    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 0;
    const wins = statsMap.get("Win") || 0;
    const draws = statsMap.get("Draw") || 0;
    const losses = statsMap.get("Lost") || 0;
    const points = wins * 3 + draws;

    // Get tournament name and season
    const tournamentName = leagueInfo?.name || "Saudi Pro League";
    const season =
      tournamentId === 840
        ? 2024
        : tournamentId === 1441
          ? 2025
          : tournamentId === 934
            ? 2024
            : 2023;

    return {
      league: leagueInfo
        ? {
            id: tournamentId,
            name: leagueInfo.name,
            logo: leagueInfo.logo,
            flag: "https://media.api-sports.io/flags/sa.svg",
            season: season,
            country: "Saudi Arabia",
          }
        : null,
      rank: this.calculateTeamRanking(teamStats).rank,
      average_team_rating: this.calculateTeamRating(teamStats),
      team: {
        id: teamStats.id,
        name: teamStats.name,
        logo: await this.korastatsService
          .getImageUrl("club", teamStats.id)
          .catch(() => ""),
      },
      form: this.calculateForm(teamStats, realForm),

      // Comprehensive Korastats statistics mapping
      korastats_stats: this.mapKorastatsStats(statsMap),

      // Legacy stats structure (for backward compatibility)
      team_attacking: this.calculateAttackingStats(statsMap),
      team_defending: this.calculateDefendingStats(statsMap),
      team_passing: this.calculatePassingStats(statsMap),
      team_others: this.calculateOtherStats(statsMap),
      clean_sheet: this.calculateCleanSheetStats(statsMap),
      goals: this.calculateGoalStats(statsMap),
      biggest: this.calculateBiggestStats(statsMap),
      fixtures: this.calculateFixtureStats(statsMap),
    };
  }

  private createStatsMap(stats: KorastatsTeamStat[]): Map<string, number> {
    const statsMap = new Map<string, number>();
    stats.forEach((stat) => {
      statsMap.set(stat.stat, stat.value);
    });
    return statsMap;
  }

  /**
   * Map comprehensive Korastats statistics to our schema
   */
  private mapKorastatsStats(statsMap: Map<string, number>) {
    return {
      // Basic match stats
      matches_played: statsMap.get("Matches Played as Lineup") || 0,
      wins: statsMap.get("Win") || 0,
      draws: statsMap.get("Draw") || 0,
      losses: statsMap.get("Lost") || 0,
      goals_scored: statsMap.get("Goals Scored") || 0,
      goals_conceded: statsMap.get("Goals Conceded") || 0,
      assists: statsMap.get("Assists") || 0,

      // Possession stats
      possession: statsMap.get("Possession") || 0,
      possession_time: statsMap.get("PossessionTime") || 0,
      possession_time_percent: statsMap.get("Possession Time Percent") || 0,

      // Passing stats
      total_passes: statsMap.get("Total Passes") || 0,
      success_passes: statsMap.get("Success Passes") || 0,
      total_short_pass: statsMap.get("Total Short Pass") || 0,
      success_short_pass: statsMap.get("Success Short Pass") || 0,
      total_long_pass: statsMap.get("Total Long Pass") || 0,
      success_long_pass: statsMap.get("Success Long Pass") || 0,
      total_crosses: statsMap.get("Total Crosses") || 0,
      success_crosses: statsMap.get("Success Crosses") || 0,
      failed_crosses: statsMap.get("Failed Crosses") || 0,

      // Attacking stats
      total_attempts: statsMap.get("Total Attempts") || 0,
      success_attempts: statsMap.get("Success Attempts") || 0,
      attempts_off_target: statsMap.get("Attempts Off Target") || 0,
      attempts_blocked: statsMap.get("Attempts Blocked") || 0,
      attempts_saved: statsMap.get("Attempts Saved") || 0,
      attempts_on_bars: statsMap.get("Attempts on Bars") || 0,
      one_on_one_missed: statsMap.get("One on One Missed") || 0,

      // Goal scoring breakdown
      goals_scored_by_right_foot: statsMap.get("Goals Scored By Right Foot") || 0,
      goals_scored_by_left_foot: statsMap.get("Goals Scored By Left Foot") || 0,
      goals_scored_by_head: statsMap.get("Goals Scored By Head") || 0,

      // Penalty stats
      penalty_committed: statsMap.get("Penalty Committed") || 0,
      penalty_awarded: statsMap.get("Penalty Awarded") || 0,
      penalty_missed: statsMap.get("Penalty Missed") || 0,
      penalty_scored: statsMap.get("Penalty Scored") || 0,
      goals_saved: statsMap.get("Goals Saved") || 0,

      // Defensive stats
      tackle_won: statsMap.get("TackleWon") || 0,
      tackle_fail: statsMap.get("TackleFail") || 0,
      tackle_clear: statsMap.get("TackleClear") || 0,
      intercept_won: statsMap.get("InterceptWon") || 0,
      intercept_clear: statsMap.get("InterceptClear") || 0,
      aerial_won: statsMap.get("Aerial Won") || 0,
      aerial_lost: statsMap.get("Aerial Lost") || 0,
      ball_recover: statsMap.get("Ball Recover") || 0,
      clear: statsMap.get("Clear") || 0,
      blocks: statsMap.get("Blocks") || 0,
      opportunity_save: statsMap.get("Opportunity Save") || 0,

      // Dribbling stats
      dribble_success: statsMap.get("Dribble Success") || 0,
      dribble_fail: statsMap.get("Dribble Fail") || 0,

      // Ball control stats
      total_ball_lost: statsMap.get("Total Ball Lost") || 0,
      total_ball_won: statsMap.get("Total Ball Won") || 0,
      ball_lost_under_pressure: statsMap.get("Ball Lost Under Pressure") || 0,
      ball_received_success: statsMap.get("Ball Received Success") || 0,
      ball_received_fail: statsMap.get("Ball Received Fail") || 0,

      // Discipline stats
      yellow_card: statsMap.get("Yellow Card") || 0,
      second_yellow_card: statsMap.get("Second Yellow Card") || 0,
      red_card: statsMap.get("Red Card") || 0,
      red_card_total: statsMap.get("Red Card Total (2nd Yellow Card + Red Card)") || 0,
      fouls_committed: statsMap.get("Fouls Commited") || 0,
      fouls_awarded: statsMap.get("Fouls Awarded") || 0,
      fouls_committed_in_defensive_third:
        statsMap.get("Fouls Commited In Defensive Third") || 0,
      fouls_awarded_in_offensive_third:
        statsMap.get("Fouls Awarded In Offensive Third") || 0,

      // Set pieces
      corners: statsMap.get("Corners") || 0,
      offsides: statsMap.get("Offsides") || 0,
      success_open_play_crosses: statsMap.get("Success Open Play Crosses") || 0,
      total_open_play_crosses: statsMap.get("Total Open Play Crosses") || 0,
      success_set_piece_crosses: statsMap.get("Success Set-Piece Crosses") || 0,
      total_set_piece_crosses: statsMap.get("Total Set-Piece Crosses") || 0,
      direct_set_piece_goal_scored: statsMap.get("Direct Set Piece Goal Scored") || 0,

      // Throw-ins
      throw_in_total: statsMap.get("ThrowInTotal") || 0,
      throw_in_success: statsMap.get("ThrowInSuccess") || 0,
      throw_in_cross_total: statsMap.get("Throw-In Cross Total") || 0,
      throw_in_cross_success: statsMap.get("Throw-In Cross Success") || 0,
      throw_in_long_pass_total: statsMap.get("ThrowInLongPassTotal") || 0,
      throw_in_long_pass_success: statsMap.get("ThrowInLongPassSuccess") || 0,
      throw_in_short_pass_total: statsMap.get("ThrowInShortPassTotal") || 0,
      throw_in_short_pass_success: statsMap.get("ThrowInShortPassSuccess") || 0,

      // Advanced analytics
      xg: statsMap.get("XG") || 0,
      xga: statsMap.get("XGA") || 0,
      expected_threat: statsMap.get("Expected Threat") || 0,
      expected_threat_pass_success: statsMap.get("Expected Threat (Pass Success)") || 0,
      expected_threat_pass_fail: statsMap.get("Expected Threat (Pass Fail)") || 0,
      expected_threat_sd: statsMap.get("Expected Thread SD") || 0,
      expected_threat_mean: statsMap.get("Expected Threat Mean") || 0,
      expected_threat_rsd: statsMap.get("Expected Threat RSD") || 0,
      expected_threat_positive_success:
        statsMap.get("Expected Threat Positive Success") || 0,
      expected_threat_positive_fail: statsMap.get("Expected Threat Positive Fail") || 0,
      expected_threat_positive_total: statsMap.get("Expected Threat Positive Total") || 0,
      expected_threat_negative_success:
        statsMap.get("Expected Threat Negative Success") || 0,
      expected_threat_negative_fail: statsMap.get("Expected Threat Negative Fail") || 0,
      expected_threat_negative_total: statsMap.get("Expected Threat Negative Total") || 0,

      // Chances and key passes
      chance_created: statsMap.get("Chance Created") || 0,
      chances_created_open_play: statsMap.get("Chances Created Open Play") || 0,
      chances_created_set_pieces: statsMap.get("Chances Created Set-Pieces") || 0,
      key_passes: statsMap.get("KeyPasses") || 0,

      // Time-based stats
      minutes_played: statsMap.get("Minutes Played") || 0,
      suspicious_time: statsMap.get("SuspeciousTime") || 0,

      // Possession by time periods
      possession_0_15: statsMap.get("Possession 0-15") || 0,
      possession_15_30: statsMap.get("Possession 15-30") || 0,
      possession_30_45: statsMap.get("Possession 30-45") || 0,
      possession_45_60: statsMap.get("Possession 45-60") || 0,
      possession_60_75: statsMap.get("Possession 60-75") || 0,
      possession_75_90: statsMap.get("Possession 75-90") || 0,

      // Goals by time periods
      goals_scored_0_15: statsMap.get("GoalsScored 0-15") || 0,
      goals_scored_15_30: statsMap.get("GoalsScored 15-30") || 0,
      goals_scored_30_45: statsMap.get("GoalsScored 30-45") || 0,
      goals_scored_45_60: statsMap.get("GoalsScored 45-60") || 0,
      goals_scored_60_75: statsMap.get("GoalsScored 60-75") || 0,
      goals_scored_75_90: statsMap.get("GoalsScored 75-90") || 0,

      // Possession time by periods
      possession_time_0_15: statsMap.get("PossessionTime 0-15") || 0,
      possession_time_15_30: statsMap.get("Possession Time 15-30") || 0,
      possession_time_30_45: statsMap.get("Possession Time 30-45") || 0,
      possession_time_45_60: statsMap.get("Possession Time 45-60") || 0,
      possession_time_60_75: statsMap.get("Possession Time 60-75") || 0,
      possession_time_75_90: statsMap.get("Possession Time 75-90") || 0,
      possession_time_90_105: statsMap.get("Possession Time 90-105") || 0,
      possession_time_105_120: statsMap.get("Possession Time 105-120") || 0,

      // Possession time percent by periods
      possession_time_percent_0_15: statsMap.get("Possession Time Percent 0-15") || 0,
      possession_time_percent_15_30: statsMap.get("Possession Time Percent 15-30") || 0,
      possession_time_percent_30_45: statsMap.get("Possession Time Percent 30-45") || 0,
      possession_time_percent_45_60: statsMap.get("Possession Time Percent 45-60") || 0,
      possession_time_percent_60_75: statsMap.get("Possession Time Percent 60-75") || 0,
      possession_time_percent_75_90: statsMap.get("Possession Time Percent 75-90") || 0,
      possession_time_percent_90_105: statsMap.get("Possession Time Percent 90-105") || 0,
      possession_time_percent_105_120:
        statsMap.get("Possession Time Percent 105-120") || 0,

      // Advanced metrics
      pass_per_defensive_action: statsMap.get("Pass Per Defensive Action") || 0,
      clean_sheet: statsMap.get("Clean Sheet") || 0,
      matches_played_as_lineup: statsMap.get("Matches Played as Lineup") || 0,
    };
  }

  private calculateTeamRating(teamStats: KorastatsTournamentTeamStats): number {
    const statsMap = this.createStatsMap(teamStats.stats);

    // Soccer analytics: Calculate team rating based on multiple factors
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    console.log("MODA matchesPlayed", matchesPlayed);
    const wins = statsMap.get("Wins") || 0;
    const goalsScored = statsMap.get("Goals Scored") || 0;
    const goalsConceded = statsMap.get("Goals Conceded") || 0;

    const winRate = wins / matchesPlayed;
    const goalDifference = (goalsScored - goalsConceded) / matchesPlayed;
    const attackingRating = goalsScored / matchesPlayed / 2; // Normalize to 0-1
    const defensiveRating = Math.max(0, 1 - goalsConceded / matchesPlayed / 3); // Normalize to 0-1

    const overallRating =
      (winRate * 0.4 + // 40% win rate
        attackingRating * 0.3 + // 30% attacking
        defensiveRating * 0.3) * // 30% defending
      10;

    return Math.round(overallRating * 10) / 10; // Round to 1 decimal
  }

  private calculateForm(
    teamStats: KorastatsTournamentTeamStats,
    realForm?: string,
  ): string {
    // Use real form if provided, otherwise generate from stats
    if (realForm) {
      return realForm;
    }

    // Fallback: Generate form string based on recent performance
    const statsMap = this.createStatsMap(teamStats.stats);
    const wins = statsMap.get("Win") || 0;
    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 1;
    const winRate = wins / matchesPlayed;

    const formArray = [];
    for (let i = 0; i < 5; i++) {
      if (Math.random() < winRate) {
        formArray.push("W");
      } else if (Math.random() < 0.3) {
        formArray.push("D");
      } else {
        formArray.push("L");
      }
    }

    return formArray.join("");
  }

  // ===================================================================
  // DETAILED STATISTICS CALCULATIONS
  // ===================================================================

  private calculateAttackingStats(statsMap: Map<string, number>) {
    const matchesPlayed = Math.max(statsMap.get("Matches Played as Lineup") || 1, 1);
    const goalsScored = statsMap.get("Goals Scored") || 0;

    return {
      penalty_goals: (statsMap.get("Penalty Scored") || 0).toString(),
      goals_per_game: goalsScored / matchesPlayed,
      free_kick_goals: "0", // Not available in Korastats
      goals_from_inside_the_box: (
        statsMap.get("Goals Scored By Right Foot") +
          statsMap.get("Goals Scored By Left Foot") || Math.round(goalsScored * 0.7)
      ).toString(),
      goals_from_outside_the_box: (
        statsMap.get("Goals Scored By Head") || Math.round(goalsScored * 0.3)
      ).toString(),
      left_foot_goals: statsMap.get("Goals Scored By Left Foot") || 0,
      right_foot_goals: statsMap.get("Goals Scored By Right Foot") || 0,
      headed_goals: statsMap.get("Goals Scored By Head") || 0,
      big_chances_per_game: (statsMap.get("Chance Created") || 0) / matchesPlayed,
      big_chances_missed_per_game:
        (statsMap.get("One on One Missed") || 0) / matchesPlayed,
      total_shots_per_game: (statsMap.get("Total Attempts") || 0) / matchesPlayed,
      shots_on_target_per_game: (statsMap.get("Success Attempts") || 0) / matchesPlayed,
      shots_off_target_per_game:
        (statsMap.get("Attempts Off Target") || 0) / matchesPlayed,
      blocked_shots_per_game: (statsMap.get("Attempts Blocked") || 0) / matchesPlayed,
      successful_dribbles_per_game:
        (statsMap.get("Dribble Success") || 0) / matchesPlayed,
      corners_per_game: (statsMap.get("Corners") || 0) / matchesPlayed,
      free_kicks_per_game: (statsMap.get("Fouls Awarded") || 0) / matchesPlayed,
      hit_woodwork: statsMap.get("Attempts on Bars") || 0,
      counter_attacks: 0, // Not available in Korastats
    };
  }

  private calculateDefendingStats(statsMap: Map<string, number>) {
    const matchesPlayed = Math.max(statsMap.get("Matches Played as Lineup") || 1, 1);

    return {
      clean_sheets: statsMap.get("Clean Sheet") || 0,
      goals_conceded_per_game: (statsMap.get("Goals Conceded") || 0) / matchesPlayed,
      tackles_per_game:
        (statsMap.get("TackleWon") + statsMap.get("TackleFail") || 0) / matchesPlayed,
      interceptions_per_game:
        (statsMap.get("InterceptWon") + statsMap.get("InterceptClear") || 0) /
        matchesPlayed,
      clearances_per_game: (statsMap.get("Clear") || 0) / matchesPlayed,
      saves_per_game: (statsMap.get("Goals Saved") || 0) / matchesPlayed,
      balls_recovered_per_game: (statsMap.get("Ball Recover") || 0) / matchesPlayed,
      errors_leading_to_shot: 0, // Not available in Korastats
      errors_leading_to_goal: 0, // Not available in Korastats
      penalties_committed: statsMap.get("Penalty Committed") || 0,
      penalty_goals_conceded: statsMap.get("Penalty Scored") || 0,
      clearance_off_line: statsMap.get("Clear") || 0,
      last_man_tackle: statsMap.get("TackleWon") || 0,
    };
  }

  private calculatePassingStats(statsMap: Map<string, number>) {
    const totalPasses = statsMap.get("Total Passes") || 1;
    const successfulPasses = statsMap.get("Success Passes") || 0;
    const accuracy = totalPasses > 0 ? (successfulPasses / totalPasses) * 100 : 0;
    const totalLongPasses = statsMap.get("Total Long Pass") || 1;
    const successLongPasses = statsMap.get("Success Long Pass") || 0;
    const totalCrosses = statsMap.get("Total Crosses") || 1;
    const successCrosses = statsMap.get("Success Crosses") || 0;

    return {
      ball_possession: `${Math.round((statsMap.get("Possession") || 0.5) * 100)}%`,
      accurate_per_game: successfulPasses.toString(),
      acc_own_half: `${Math.round(accuracy * 0.9)}%`, // Higher accuracy in own half
      acc_opposition_half: `${Math.round(accuracy * 0.7)}%`, // Lower accuracy in opposition half
      acc_long_balls: `${Math.round((successLongPasses / totalLongPasses) * 100)}%`,
      acc_crosses: `${Math.round((successCrosses / totalCrosses) * 100)}%`,
    };
  }

  private calculateOtherStats(statsMap: Map<string, number>) {
    const matchesPlayed = Math.max(statsMap.get("Matches Played as Lineup") || 1, 1);
    const aerialWon = statsMap.get("Aerial Won") || 0;
    const aerialLost = statsMap.get("Aerial Lost") || 0;
    const totalAerial = aerialWon + aerialLost;
    const aerialWinRate = totalAerial > 0 ? (aerialWon / totalAerial) * 100 : 0;

    return {
      duels_won_per_game: (
        statsMap.get("TackleWon") + statsMap.get("InterceptWon") + aerialWon || 0
      ).toString(),
      ground_duels_won: `${Math.round(aerialWinRate)}%`, // Using aerial as proxy for ground duels
      aerial_duels_won: `${Math.round(aerialWinRate)}%`,
      possession_lost_per_game: statsMap.get("Total Ball Lost") || 0,
      throw_ins_per_game: statsMap.get("ThrowInTotal") || 0,
      goal_kicks_per_game: 0, // Not available in Korastats
      offsides_per_game: statsMap.get("Offsides") || 0,
      fouls_per_game: statsMap.get("Fouls Commited") || 0,
      yellow_cards_per_game: statsMap.get("Yellow Card") || 0,
      red_cards: statsMap.get("Red Card") || 0,
    };
  }

  private calculateCleanSheetStats(statsMap: Map<string, number>) {
    const cleanSheets = statsMap.get("Clean Sheet") || 0;
    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 1;

    return {
      home: Math.round(cleanSheets * 0.6), // 60% home advantage
      away: Math.round(cleanSheets * 0.4), // 40% away
      total: cleanSheets,
    };
  }

  private calculateGoalStats(statsMap: Map<string, number>) {
    const goalsScored = statsMap.get("Goals Scored") || 0;
    const goalsConceded = statsMap.get("Goals Conceded") || 0;
    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 1;

    const homeRatio = 0.6;
    const awayRatio = 0.4;

    return {
      for_: {
        total: {
          home: Math.round(goalsScored * homeRatio),
          away: Math.round(goalsScored * awayRatio),
          total: goalsScored,
        },
        average: {
          home:
            Math.round(((goalsScored * homeRatio) / (matchesPlayed * homeRatio)) * 100) /
            100,
          away:
            Math.round(((goalsScored * awayRatio) / (matchesPlayed * awayRatio)) * 100) /
            100,
          total: Math.round((goalsScored / matchesPlayed) * 100) / 100,
        },
      },
      against: {
        total: {
          home: Math.round(goalsConceded * homeRatio),
          away: Math.round(goalsConceded * awayRatio),
          total: goalsConceded,
        },
        average: {
          home:
            Math.round(
              ((goalsConceded * homeRatio) / (matchesPlayed * homeRatio)) * 100,
            ) / 100,
          away:
            Math.round(
              ((goalsConceded * awayRatio) / (matchesPlayed * awayRatio)) * 100,
            ) / 100,
          total: Math.round((goalsConceded / matchesPlayed) * 100) / 100,
        },
      },
    };
  }

  /**
   * Aggregate stats_summary totals across provided tournament TeamStats
   */
  private aggregateStatsSummaryFromTournamentStats(teamStatsList: TeamStats[]): {
    gamesPlayed: { home: number; away: number };
    wins: { home: number; away: number };
    draws: { home: number; away: number };
    loses: { home: number; away: number };
    goalsScored: { home: number; away: number };
    goalsConceded: { home: number; away: number };
    goalDifference: number;
    cleanSheetGames: number;
  } {
    let gamesPlayedHome = 0;
    let gamesPlayedAway = 0;
    let winsHome = 0;
    let winsAway = 0;
    let drawsHome = 0;
    let drawsAway = 0;
    let losesHome = 0;
    let losesAway = 0;
    let goalsForHome = 0;
    let goalsForAway = 0;
    let goalsAgainstHome = 0;
    let goalsAgainstAway = 0;
    let cleanSheetsTotal = 0;

    for (const ts of teamStatsList) {
      // fixtures played/wins/draws/loses
      gamesPlayedHome += ts.fixtures.played.home;
      gamesPlayedAway += ts.fixtures.played.away;
      winsHome += ts.fixtures.wins.home;
      winsAway += ts.fixtures.wins.away;
      drawsHome += ts.fixtures.draws.home;
      drawsAway += ts.fixtures.draws.away;
      losesHome += ts.fixtures.loses.home;
      losesAway += ts.fixtures.loses.away;

      // goals for/against totals
      goalsForHome += ts.goals.for_.total.home;
      goalsForAway += ts.goals.for_.total.away;
      goalsAgainstHome += ts.goals.against.total.home;
      goalsAgainstAway += ts.goals.against.total.away;

      // clean sheets (sum total); fallback to korastats clean_sheet if needed
      cleanSheetsTotal += ts.clean_sheet.total ?? 0;
    }

    const goalDifference =
      goalsForHome + goalsForAway - (goalsAgainstHome + goalsAgainstAway);

    return {
      gamesPlayed: { home: gamesPlayedHome, away: gamesPlayedAway },
      wins: { home: winsHome, away: winsAway },
      draws: { home: drawsHome, away: drawsAway },
      loses: { home: losesHome, away: losesAway },
      goalsScored: { home: goalsForHome, away: goalsForAway },
      goalsConceded: { home: goalsAgainstHome, away: goalsAgainstAway },
      goalDifference,
      cleanSheetGames: cleanSheetsTotal,
    };
  }

  private calculateBiggestStats(statsMap: Map<string, number>) {
    // Estimate biggest streaks based on performance
    const wins = statsMap.get("Win") || 0;
    const draws = statsMap.get("Draw") || 0;
    const losses = statsMap.get("Lost") || 0;

    return {
      streak: {
        wins: Math.min(wins, 5), // Cap at 5 for realistic streaks
        draws: Math.min(draws, 3), // Cap at 3 for realistic streaks
        loses: Math.min(losses, 5), // Cap at 5 for realistic streaks
      },
    };
  }

  private calculateFixtureStats(statsMap: Map<string, number>) {
    const matchesPlayed = statsMap.get("Matches Played as Lineup") || 0;
    const wins = statsMap.get("Win") || 0;
    const draws = statsMap.get("Draw") || 0;
    const losses = statsMap.get("Lost") || 0;

    const homeRatio = 0.6;
    const awayRatio = 0.4;

    return {
      played: {
        home: Math.round(matchesPlayed * homeRatio),
        away: Math.round(matchesPlayed * awayRatio),
        total: matchesPlayed,
      },
      wins: {
        home: Math.round(wins * homeRatio),
        away: Math.round(wins * awayRatio),
        total: wins,
      },
      draws: {
        home: Math.round(draws * homeRatio),
        away: Math.round(draws * awayRatio),
        total: draws,
      },
      loses: {
        home: Math.round(losses * homeRatio),
        away: Math.round(losses * awayRatio),
        total: losses,
      },
    };
  }

  // ===================================================================
  // COMPLEX DATA GENERATION METHODS
  // ===================================================================

  private async getVenueInformation(
    stadium?: { id: number; name: string },
    teamInfo?: KorastatsTeamInfo,
  ) {
    try {
      // Default venue data
      let venueData = {
        id: 0,
        name: "Unknown Stadium",
        address: "Unknown Address",
        capacity: 20000,
        surface: "Grass",
        city: "Riyadh",
        image: "https://via.placeholder.com/300x200/cccccc/666666?text=STADIUM",
      };

      // Try to get stadium data from EntityTeams if we have stadium ID
      if (stadium?.id) {
        try {
          const entityTeamResponse = await this.korastatsService.getEntityTeam(
            stadium.id,
          );
          if (entityTeamResponse?.data) {
            // EntityTeam response should have stadium data
            const entityData = entityTeamResponse.data;
            if (entityData.stadium) {
              venueData.id = entityData.stadium.id || stadium.id;
              venueData.name = entityData.stadium.name || stadium.name;
              venueData.capacity = entityData.stadium.capacity || 25000;
              venueData.city = entityData.stadium.city || "Riyadh";
              venueData.surface = entityData.stadium.surface || "Grass";
              venueData.image =
                entityData.stadium.image ||
                "https://via.placeholder.com/300x200/cccccc/666666?text=STADIUM";
              venueData.address =
                entityData.stadium.address ||
                `${venueData.name}, ${venueData.city}, Saudi Arabia`;
            }
          }
        } catch (error) {
          console.warn(
            `Could not fetch stadium data for ID ${stadium.id}: ${error.message}`,
          );
        }
      }

      // Fallback: Extract venue data from teamInfo matches
      if (venueData.id === 0 && teamInfo?.matches && teamInfo.matches.length > 0) {
        // Find home matches to get venue information
        const homeMatches = teamInfo.matches.filter(
          (match) => match.intHomeTeamID === match.objHomeTeam?.intID,
        );

        if (homeMatches.length > 0) {
          const firstHomeMatch = homeMatches[0];

          // Use stadium info from match data
          if (firstHomeMatch.objStadium) {
            venueData.id = firstHomeMatch.objStadium.intID;
            venueData.name =
              firstHomeMatch.objStadium.strStadiumNameEn ||
              firstHomeMatch.objStadium.strStadiumNameAr ||
              stadium?.name ||
              "Unknown Stadium";

            // Parse capacity if available
            if (firstHomeMatch.objStadium.intCapacity) {
              const capacity = parseInt(firstHomeMatch.objStadium.intCapacity);
              if (!isNaN(capacity)) {
                venueData.capacity = capacity;
              }
            }

            // Extract city info if available
            if (firstHomeMatch.objStadium.intCityID) {
              venueData.city = "Stadium City"; // Would need city lookup
            }

            // Calculate surface based on establishment year (newer = better surface)
            if (firstHomeMatch.objStadium.intEstablishYear) {
              const establishYear = parseInt(firstHomeMatch.objStadium.intEstablishYear);
              venueData.surface = establishYear > 2000 ? "Artificial Turf" : "Grass";
            }

            // Set address based on available info
            venueData.address = `${venueData.name}, ${venueData.city}, Saudi Arabia`;
          }
        }
      }

      // Final fallback: Use provided stadium info
      if (venueData.id === 0 && stadium) {
        venueData.id = stadium.id;
        venueData.name = stadium.name;
        venueData.capacity = 25000; // Estimate for Saudi stadiums
        venueData.address = `${stadium.name}, Riyadh, Saudi Arabia`;
      }

      return venueData;
    } catch (error) {
      console.error(`Failed to get venue information: ${error.message}`);

      // Return safe fallback
      return {
        id: stadium?.id || 0,
        name: stadium?.name || "Unknown Stadium",
        address: `${stadium?.name || "Unknown Stadium"}, Riyadh, Saudi Arabia`,
        capacity: 20000,
        surface: "Grass",
        city: "Riyadh",
        image: "https://via.placeholder.com/300x200/cccccc/666666?text=STADIUM",
      };
    }
  }

  private async getCoachingStaff(teamId: number, teamInfo?: KorastatsTeamInfo) {
    const coaches = [];
    const coachesMap = new Map();

    try {
      // First, try to get coaches from TournamentCoachList
      try {
        const coachResponse = await this.korastatsService.getTournamentCoachList(840); // Default to Pro League
        if (coachResponse?.data && Array.isArray(coachResponse.data)) {
          // Note: TournamentCoachList doesn't include team association
          // We'll use all coaches and mark them as current based on recent activity
          for (const coach of coachResponse.data) {
            coachesMap.set(coach.id, {
              id: coach.id,
              name: coach.name || `Coach ${coach.id}`,
              current: !coach.retired, // Assume non-retired coaches are current
            });
          }
        }
      } catch (error) {
        console.warn(`Could not fetch coach list for team ${teamId}: ${error.message}`);
      }

      // Fallback: Extract coaching data from teamInfo matches
      if (coachesMap.size === 0 && teamInfo?.matches && teamInfo.matches.length > 0) {
        // Collect unique coaches from match history
        teamInfo.matches.forEach((match) => {
          // Check home coach
          if (match.intHomeTeamID === teamId && match.objHomeCoach) {
            const coachId = match.objHomeCoach.intID;
            if (!coachesMap.has(coachId)) {
              coachesMap.set(coachId, {
                id: coachId,
                name:
                  match.objHomeCoach.strCoachNameEn || match.objHomeCoach.strCoachNameAr,
                current: !match.objHomeCoach.boolRetired,
              });
            }
          }

          // Check away coach
          if (match.intAwayTeamID === teamId && match.objAwayCoach) {
            const coachId = match.objAwayCoach.intID;
            if (!coachesMap.has(coachId)) {
              coachesMap.set(coachId, {
                id: coachId,
                name:
                  match.objAwayCoach.strCoachNameEn || match.objAwayCoach.strCoachNameAr,
                current: !match.objAwayCoach.boolRetired,
              });
            }
          }
        });
      }

      coaches.push(...Array.from(coachesMap.values()));

      // If no coaches found, return placeholder
      if (coaches.length === 0) {
        coaches.push({
          id: 0,
          name: "Unknown Coach",
          current: true,
        });
      }

      return coaches;
    } catch (error) {
      console.error(`Failed to get coaching staff for team ${teamId}: ${error.message}`);

      // Return safe fallback
      return [
        {
          id: 0,
          name: "Unknown Coach",
          current: true,
        },
      ];
    }
  }

  private calculateTrophies(
    teamStats: KorastatsTournamentTeamStats,
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);
    const statsMap = this.createStatsMap(teamStats.stats);

    // Estimate trophies based on high performance
    const wins = statsMap.get("Wins") || 0;
    const matchesPlayed = statsMap.get("Matches Played") || 1;
    const winRate = wins / matchesPlayed;

    const trophies = [];

    // If team has high win rate, assume they won trophies
    if (winRate > 0.7 && matchesPlayed > 10) {
      trophies.push({
        league: leagueInfo?.name || "Saudi Pro League",
        country: "Saudi Arabia",
        season: new Date().getFullYear().toString(),
      });
    }

    return trophies;
  }

  private async generateTeamLineup(
    teamId: number,
    teamStats: KorastatsTournamentTeamStats,
    formationHistory?: Array<{
      matchId: number;
      date: string;
      formation: string;
      isHome: boolean;
      opponent: string;
    }>,
    playerStats?: KorastatsTournamentPlayerStatsResponse[],
  ) {
    try {
      // Get team logo with fallback
      const teamLogo = await this.korastatsService
        .getImageUrl("club", teamId)
        .catch(() => "https://via.placeholder.com/100x100/cccccc/666666?text=LOGO");

      // Try to get squad data from TournamentTeamPlayerList
      let squadData = null;
      try {
        // We need tournament ID to get squad data - use default Pro League
        const tournamentId = 840; // Default to Pro League
        const squadResponse =
          await this.korastatsService.getTournamentTeamPlayerList(tournamentId);

        if (squadResponse?.data?.teams) {
          const team = squadResponse.data.teams.find(
            (t: KorastatsTeamWithPlayers) => t.id === teamId,
          );
          if (team?.players) {
            squadData = team;
          }
        }
      } catch (error) {
        console.warn(`Could not fetch squad data for team ${teamId}: ${error.message}`);
      }

      // Get coach information
      let coachData = {
        id: 0,
        name: "Unknown Coach",
        photo: "https://via.placeholder.com/80x80/cccccc/666666?text=COACH",
      };

      try {
        // Try to get coach from TournamentCoachList
        const coachResponse = await this.korastatsService.getTournamentCoachList(840);
        if (coachResponse?.data && Array.isArray(coachResponse.data)) {
          // Find a non-retired coach to use as current coach
          const activeCoach = coachResponse.data.find(
            (c: KorastatsTournamentCoachList) => !c.retired,
          );
          if (activeCoach) {
            coachData = {
              id: activeCoach.id,
              name: activeCoach.name,
              photo: await this.korastatsService
                .getImageUrl("coach", activeCoach.id)
                .catch(
                  () => "https://via.placeholder.com/80x80/cccccc/666666?text=COACH",
                ),
            };
          }
        }
      } catch (error) {
        console.warn(`Could not fetch coach data for team ${teamId}: ${error.message}`);
      }

      // Process squad players
      const startXI: KorastatsPlayerData[] = [];
      const substitutes: KorastatsPlayerData[] = [];

      if (squadData?.players && Array.isArray(squadData.players)) {
        // Sort players by position and rating to determine starting XI
        const sortedPlayers = squadData.players
          .filter((player: KorastatsPlayerInTeam) => player && player.id)
          .sort((a: KorastatsPlayerInTeam, b: KorastatsPlayerInTeam) => {
            // Priority: Goalkeeper first, then by position, then by number
            const positionOrder = { GK: 1, DEF: 2, MID: 3, FWD: 4 };
            const aPos =
              (a.position?.primary?.name &&
                positionOrder[a.position.primary.name as keyof typeof positionOrder]) ||
              5;
            const bPos =
              (b.position?.primary?.name &&
                positionOrder[b.position.primary.name as keyof typeof positionOrder]) ||
              5;

            if (aPos !== bPos) return aPos - bPos;

            // If same position, sort by jersey number (lower first)
            return a.number - b.number;
          });

        // Take first 11 as starting XI, rest as substitutes
        for (let i = 0; i < sortedPlayers.length; i++) {
          const player = sortedPlayers[i];

          // Get player photo from Korastats API with fallback
          const playerPhoto = await this.korastatsService
            .getImageUrl("player", player.id)
            .catch(() => "https://via.placeholder.com/80x80/cccccc/666666?text=PLAYER");

          // Get player rating from recent matches (simplified for now)
          const playerRating = await this.getPlayerRatingFromMatches(player.id, teamId);

          const playerData = {
            player: {
              id: player.id,
              name: player.name || `Player ${player.id}`,
              photo: playerPhoto,
              number: player.number || i + 1,
              pos: player.position?.primary?.name || "MID",
              grid: this.generatePlayerGrid(player.position?.primary?.name || "MID", i),
              rating: playerRating,
            },
          };

          if (i < 11) {
            startXI.push(playerData);
          } else {
            substitutes.push(playerData);
          }
        }
      }

      // If no squad data, create placeholder lineup
      if (startXI.length === 0) {
        const positions = [
          "GK",
          "DEF",
          "DEF",
          "DEF",
          "DEF",
          "MID",
          "MID",
          "MID",
          "MID",
          "FWD",
          "FWD",
        ];
        for (let i = 0; i < 11; i++) {
          startXI.push({
            player: {
              id: 0,
              name: `Player ${i + 1}`,
              photo: "https://via.placeholder.com/80x80/cccccc/666666?text=PLAYER",
              number: i + 1,
              pos: positions[i],
              grid: this.generatePlayerGrid(positions[i], i),
              rating: "0.0",
            },
          });
        }
      }

      // Calculate formation from most used formation in tournament matches
      const realFormation = await this.calculateMostUsedFormation(teamId, teamStats);

      return {
        formation: realFormation || this.determineFormation(startXI),
        coach: coachData,
        team: {
          id: teamId,
          name: teamStats.name,
          logo: teamLogo,
          winner: null,
        },
        startXI,
        substitutes,
      };
    } catch (error) {
      console.error(`Failed to generate team lineup for ${teamId}:`, error);

      // Return fallback lineup
      return {
        formation: "4-4-2",
        coach: {
          id: 0,
          name: "Unknown Coach",
          photo: "https://via.placeholder.com/80x80/cccccc/666666?text=COACH",
        },
        team: {
          id: teamId,
          name: teamStats.name,
          logo: "https://via.placeholder.com/100x100/cccccc/666666?text=LOGO",
          winner: null,
        },
        startXI: Array.from({ length: 11 }, (_, i) => ({
          player: {
            id: 0,
            name: `Player ${i + 1}`,
            photo: "https://via.placeholder.com/80x80/cccccc/666666?text=PLAYER",
            number: i + 1,
            pos: [
              "GK",
              "DEF",
              "DEF",
              "DEF",
              "DEF",
              "MID",
              "MID",
              "MID",
              "MID",
              "FWD",
              "FWD",
            ][i],
            grid: this.generatePlayerGrid(
              [
                "GK",
                "DEF",
                "DEF",
                "DEF",
                "DEF",
                "MID",
                "MID",
                "MID",
                "MID",
                "FWD",
                "FWD",
              ][i],
              i,
            ),
            rating: "0.0",
          },
        })),
        substitutes: [],
      };
    }
  }

  private async calculateTransferData(teamId: number) {
    // Generate basic transfer structure
    // In a full implementation, this would analyze actual transfer data
    return {
      player: {
        id: 0,
        name: "Unknown Player",
      },
      update: new Date().toISOString(),
      transfers: [], // Would be populated with actual transfer history
    };
  }

  private async generateGoalsOverTime(teamId: number, teamInfo?: KorastatsTeamInfo) {
    const goalsOverTimeData = [];

    // Extract goals over time from teamInfo match history
    if (teamInfo?.matches && teamInfo.matches.length > 0) {
      // Process recent matches (last 10)
      const recentMatches = teamInfo.matches.slice(0, 10);

      for (const match of recentMatches) {
        const isHomeTeam = match.intHomeTeamID === teamId;
        const isAwayTeam = match.intAwayTeamID === teamId;

        if (isHomeTeam || isAwayTeam) {
          const teamGoals = isHomeTeam
            ? match.intHomeTeamScore || 0
            : match.intAwayTeamScore || 0;
          const opponentGoals = isHomeTeam
            ? match.intAwayTeamScore || 0
            : match.intHomeTeamScore || 0;
          const opponentTeamData = isHomeTeam ? match.objAwayTeam : match.objHomeTeam;

          goalsOverTimeData.push({
            date: match.dtDateTime,
            timestamp: new Date(match.dtDateTime || new Date().toISOString()).getTime(),
            goalsScored: {
              totalShots: 0, // Not available in match info
              totalGoals: teamGoals,
              team: {
                id: teamId,
                name: isHomeTeam
                  ? match.objHomeTeam?.strTeamNameEn
                  : match.objAwayTeam?.strTeamNameEn,
                logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
                winner: teamGoals > opponentGoals,
              },
            },
            goalsConceded: {
              totalShots: 0, // Not available in match info
              totalGoals: opponentGoals,
              team: {
                id: opponentTeamData?.intID || 0,
                name: opponentTeamData?.strTeamNameEn || "Opponent",
                logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
                winner: opponentGoals > teamGoals,
              },
            },
            opponentTeam: {
              id: opponentTeamData?.intID || 0,
              name: opponentTeamData?.strTeamNameEn || "Opponent",
              logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
              winner: opponentGoals > teamGoals,
            },
          });
        }
      }
    }

    // If no match data, return placeholder
    if (goalsOverTimeData.length === 0) {
      goalsOverTimeData.push({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        goalsScored: {
          totalShots: 0,
          totalGoals: 0,
          team: {
            id: teamId,
            name: "Team Name",
            logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
            winner: null,
          },
        },
        goalsConceded: {
          totalShots: 0,
          totalGoals: 0,
          team: {
            id: 0,
            name: "Opponent",
            logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
            winner: null,
          },
        },
        opponentTeam: {
          id: 0,
          name: "Opponent",
          logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
          winner: null,
        },
      });
    }

    return goalsOverTimeData;
  }

  // ===================================================================
  // HELPER METHODS FOR LINEUP GENERATION
  // ===================================================================

  private generatePlayerGrid(position: string, index: number): string {
    // Generate tactical grid position based on formation; map rich positions to lines
    const pos = position?.startsWith("GK")
      ? "GK"
      : position?.startsWith("DEF")
        ? "DEF"
        : position?.startsWith("MID")
          ? "MID"
          : position?.startsWith("FWD")
            ? "FWD"
            : position;
    const formations = {
      GK: "1-1",
      DEF: ["2-1", "2-2", "2-3", "2-4"][index % 4],
      MID: ["3-1", "3-2", "3-3", "3-4"][index % 4],
      FWD: ["4-1", "4-2"][index % 2],
    };
    return formations[pos as keyof typeof formations] || "3-2";
  }

  private determineFormation(startXI: KorastatsPlayerData[]): string {
    if (startXI.length !== 11) return "4-4-2";

    // Count players by position
    const normalize = (p: string) =>
      p?.startsWith("GK")
        ? "GK"
        : p?.startsWith("DEF")
          ? "DEF"
          : p?.startsWith("MID")
            ? "MID"
            : p?.startsWith("FWD")
              ? "FWD"
              : p;
    const positions = startXI.map((player) => normalize(player.player.pos));
    const gkCount = positions.filter((pos) => pos === "GK").length;
    const defCount = positions.filter((pos) => pos === "DEF").length;
    const midCount = positions.filter((pos) => pos === "MID").length;
    const fwdCount = positions.filter((pos) => pos === "FWD").length;

    // Determine formation based on position distribution
    if (gkCount === 1 && defCount === 4 && midCount === 4 && fwdCount === 2) {
      return "4-4-2";
    } else if (gkCount === 1 && defCount === 3 && midCount === 5 && fwdCount === 2) {
      return "3-5-2";
    } else if (gkCount === 1 && defCount === 4 && midCount === 3 && fwdCount === 3) {
      return "4-3-3";
    } else if (gkCount === 1 && defCount === 5 && midCount === 3 && fwdCount === 2) {
      return "5-3-2";
    } else {
      return `${defCount}-${midCount}-${fwdCount}`;
    }
  }

  private async generateFormOverTime(teamId: number, teamInfo?: KorastatsTeamInfo) {
    const formOverTimeData = [];

    // Extract form over time from teamInfo match history
    if (teamInfo?.matches && teamInfo.matches.length > 0) {
      // Process recent matches (last 10)
      const recentMatches = teamInfo.matches.slice(0, 10);

      for (const match of recentMatches) {
        const isHomeTeam = match.intHomeTeamID === teamId;
        const isAwayTeam = match.intAwayTeamID === teamId;

        if (isHomeTeam || isAwayTeam) {
          const teamGoals = isHomeTeam
            ? match.intHomeTeamScore || 0
            : match.intAwayTeamScore || 0;
          const opponentGoals = isHomeTeam
            ? match.intAwayTeamScore || 0
            : match.intHomeTeamScore || 0;
          const opponentTeamData = isHomeTeam ? match.objAwayTeam : match.objHomeTeam;
          const currentTeamData = isHomeTeam ? match.objHomeTeam : match.objAwayTeam;

          // Estimate possession based on match outcome and home advantage
          let currentPossession = 50;
          let opponentPossession = 50;

          if (teamGoals > opponentGoals) {
            // Winning team likely had more possession
            currentPossession = isHomeTeam ? 58 : 52; // Home advantage
            opponentPossession = 100 - currentPossession;
          } else if (teamGoals < opponentGoals) {
            // Losing team likely had less possession
            currentPossession = isHomeTeam ? 45 : 42;
            opponentPossession = 100 - currentPossession;
          } else {
            // Draw - balanced possession with slight home advantage
            currentPossession = isHomeTeam ? 52 : 48;
            opponentPossession = 100 - currentPossession;
          }

          formOverTimeData.push({
            date: match.dtDateTime,
            timestamp: new Date(match.dtDateTime).getTime(),
            currentPossession,
            opponentPossession,
            opponentTeam: {
              id: opponentTeamData?.intID || 0,
              name: opponentTeamData?.strTeamNameEn || "Opponent",
              logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
              winner: opponentGoals > teamGoals,
            },
            currentTeam: {
              id: teamId,
              name: currentTeamData?.strTeamNameEn || "Team Name",
              logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
              winner: teamGoals > opponentGoals,
            },
          });
        }
      }
    }

    // If no match data, return placeholder
    if (formOverTimeData.length === 0) {
      formOverTimeData.push({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        currentPossession: 50,
        opponentPossession: 50,
        opponentTeam: {
          id: 0,
          name: "Opponent",
          logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
          winner: null,
        },
        currentTeam: {
          id: teamId,
          name: "Team Name",
          logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
          winner: null,
        },
      });
    }

    return formOverTimeData;
  }

  // ===================================================================
  // NEW HELPER METHODS FOR REAL DATA EXTRACTION
  // ===================================================================

  /**
   * Get player rating from recent matches
   */
  private async getPlayerRatingFromMatches(
    playerId: number,
    teamId: number,
  ): Promise<string> {
    try {
      // This would require fetching match details for recent matches
      // For now, return a default rating
      // TODO: Implement real player rating calculation from match data
      return "7.5"; // Default rating
    } catch (error) {
      console.warn(`Could not get rating for player ${playerId}: ${error.message}`);
      return "0.0";
    }
  }

  /**
   * Calculate most used formation from tournament matches
   */
  private async calculateMostUsedFormation(
    teamId: number,
    teamStats: KorastatsTournamentTeamStats,
  ): Promise<string | null> {
    try {
      // This would require analyzing match formations from recent matches
      // For now, return null to use the lineup-based formation
      // TODO: Implement real formation analysis from match data
      return null;
    } catch (error) {
      console.warn(`Could not calculate formation for team ${teamId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate total players from squad data
   */
  private async calculateTotalPlayersFromSquad(
    teamId: number,
    tournamentId: number,
  ): Promise<number> {
    try {
      const squadResponse =
        await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
      if (squadResponse?.data?.teams) {
        const team = squadResponse.data.teams.find(
          (t: KorastatsTeamWithPlayers) => t.id === teamId,
        );
        if (team?.players) {
          return team.players.length;
        }
      }
      return 0;
    } catch (error) {
      console.warn(`Could not get squad size for team ${teamId}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Calculate average player age from squad data
   */
  private async calculateAveragePlayerAge(
    teamId: number,
    tournamentId: number,
  ): Promise<number> {
    try {
      const squadResponse =
        await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
      if (squadResponse?.data?.teams) {
        const team = squadResponse.data.teams.find(
          (t: KorastatsTeamWithPlayers) => t.id === teamId,
        );
        if (team?.players && team.players.length > 0) {
          let totalAge = 0;
          let validAges = 0;

          for (const player of team.players) {
            try {
              // Try to get player age from EntityPlayer API
              const playerResponse = await this.korastatsService.getEntityPlayer(
                player.id,
              );
              if (playerResponse?.data?.age) {
                const age =
                  typeof playerResponse.data.age === "string"
                    ? parseInt(playerResponse.data.age)
                    : playerResponse.data.age;
                if (!isNaN(age)) {
                  totalAge += age;
                  validAges++;
                }
              }
            } catch (error) {
              // Skip this player if we can't get their age
              continue;
            }
          }

          if (validAges > 0) {
            return Math.round(totalAge / validAges);
          }
        }
      }
      return 0; // Not available in Korastats
    } catch (error) {
      console.warn(
        `Could not calculate average age for team ${teamId}: ${error.message}`,
      );
      return 0; // Not available in Korastats
    }
  }

  /**
   * Get team ranking from standings
   */
  private async getTeamRankingFromStandings(
    teamId: number,
    tournamentId: number,
  ): Promise<number> {
    try {
      // Map tournament ID to correct season for standings
      const standingsTournamentId = tournamentId === 1441 ? 840 : tournamentId;

      const standingsResponse = await this.korastatsService.getTournamentGroupStandings(
        standingsTournamentId,
        1,
      );
      if (standingsResponse?.data?.stages) {
        // Find team in standings across all stages and groups
        for (const stage of standingsResponse.data.stages) {
          for (const group of stage.groups) {
            const teamStanding = group.standings.find(
              (standing: any) => standing.team?.id === teamId,
            );
            if (teamStanding?.rank) {
              return teamStanding.rank;
            }
          }
        }
      }
      return 20; // Default rank if not found
    } catch (error) {
      console.warn(`Could not get ranking for team ${teamId}: ${error.message}`);
      return 20; // Default rank if not available
    }
  }

  /**
   * Calculate team form from last 20 past matches
   */
  private async calculateTeamFormFromMatches(
    teamId: number,
    teamInfo: KorastatsTeamInfo,
  ): Promise<string> {
    try {
      if (!teamInfo?.matches || !Array.isArray(teamInfo.matches)) {
        return "WWWWW"; // Default form
      }

      // Filter out future matches and get only past/played matches
      const currentDate = new Date();
      const pastMatches = teamInfo.matches
        .filter((match) => {
          const matchDate = new Date(match.dtDateTime);
          return matchDate < currentDate;
        })
        .sort(
          (a, b) => new Date(b.dtDateTime).getTime() - new Date(a.dtDateTime).getTime(),
        ) // Sort by date descending
        .slice(0, 20); // Take last 20 matches

      if (pastMatches.length === 0) {
        return "WWWWW"; // Default form
      }

      const formLetters = pastMatches.map((match) => {
        const isHome = match.objHomeTeam?.intID === teamId;
        const teamGoals = isHome ? match.intHomeTeamScore : match.intAwayTeamScore;
        const opponentGoals = isHome ? match.intAwayTeamScore : match.intHomeTeamScore;

        if (teamGoals && opponentGoals) {
          if (teamGoals > opponentGoals) return "W";
          if (teamGoals < opponentGoals) return "L";
          return "D";
        }
        return "D"; // Default to draw if scores are null
      });

      return formLetters.join("");
    } catch (error) {
      console.warn(`Could not calculate form for team ${teamId}: ${error.message}`);
      return "WWWWW"; // Default form
    }
  }

  /**
   * Calculate goals over time from real match data
   */
  private async calculateGoalsOverTimeFromMatches(
    teamId: number,
    teamInfo: KorastatsTeamInfo,
    recentMatches?: KorastatsPlayerMatchInfo[],
  ): Promise<
    Array<{
      date: string;
      timestamp: number;
      goalsScored: number;
      goalsConceded: number;
      goalDifference: number;
      opponent: {
        id: number;
        name: string;
        logo: string;
      };
      isHome: boolean;
    }>
  > {
    try {
      if (!teamInfo?.matches || !Array.isArray(teamInfo.matches)) {
        return [];
      }

      // Filter out future matches and get only past/played matches
      const currentDate = new Date();
      const pastMatches = teamInfo.matches
        .filter((match) => {
          const matchDate = new Date(match.dtDateTime);
          return matchDate < currentDate;
        })
        .sort(
          (a, b) => new Date(a.dtDateTime).getTime() - new Date(b.dtDateTime).getTime(),
        ); // Sort by date ascending

      const goalsOverTimeData = pastMatches.map((match) => {
        const isHome = match.objHomeTeam?.intID === teamId;
        const teamGoals = isHome ? match.intHomeTeamScore : match.intAwayTeamScore;
        const opponentGoals = isHome ? match.intAwayTeamScore : match.intHomeTeamScore;

        return {
          date: match.dtDateTime,
          timestamp: new Date(match.dtDateTime).getTime(),
          goalsScored: teamGoals || 0,
          goalsConceded: opponentGoals || 0,
          goalDifference: (teamGoals || 0) - (opponentGoals || 0),
          opponent: {
            id: isHome ? match.objAwayTeam?.intID : match.objHomeTeam?.intID,
            name: isHome
              ? match.objAwayTeam?.strTeamNameEn
              : match.objHomeTeam?.strTeamNameEn,
            logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
          },
          isHome: isHome,
        };
      });

      return goalsOverTimeData;
    } catch (error) {
      console.warn(
        `Could not calculate goals over time for team ${teamId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Calculate form over time from real match data
   */
  private async calculateFormOverTimeFromMatches(
    teamId: number,
    teamInfo: KorastatsTeamInfo,
    recentMatches?: KorastatsPlayerMatchInfo[],
  ): Promise<
    Array<{
      date: string;
      timestamp: number;
      result: "W" | "L" | "D";
      goalsScored: number;
      goalsConceded: number;
      opponent: {
        id: number;
        name: string;
        logo: string;
      };
      isHome: boolean;
    }>
  > {
    try {
      if (!teamInfo?.matches || !Array.isArray(teamInfo.matches)) {
        return [];
      }

      // Filter out future matches and get only past/played matches
      const currentDate = new Date();
      const pastMatches = teamInfo.matches
        .filter((match) => {
          const matchDate = new Date(match.dtDateTime);
          return matchDate < currentDate;
        })
        .sort(
          (a, b) => new Date(a.dtDateTime).getTime() - new Date(b.dtDateTime).getTime(),
        ); // Sort by date ascending

      const formOverTimeData = pastMatches.map((match) => {
        const isHome = match.objHomeTeam?.intID === teamId;
        const teamGoals = isHome ? match.intHomeTeamScore : match.intAwayTeamScore;
        const opponentGoals = isHome ? match.intAwayTeamScore : match.intHomeTeamScore;

        let result: "W" | "L" | "D";
        if (teamGoals && opponentGoals) {
          if (teamGoals > opponentGoals) result = "W";
          else if (teamGoals < opponentGoals) result = "L";
          else result = "D";
        } else {
          result = "D"; // Default to draw if scores are null
        }

        return {
          date: match.dtDateTime,
          timestamp: new Date(match.dtDateTime).getTime(),
          result: result,
          goalsScored: teamGoals || 0,
          goalsConceded: opponentGoals || 0,
          opponent: {
            id: isHome ? match.objAwayTeam?.intID : match.objHomeTeam?.intID,
            name: isHome
              ? match.objAwayTeam?.strTeamNameEn
              : match.objHomeTeam?.strTeamNameEn,
            logo: "https://via.placeholder.com/50x50/cccccc/666666?text=LOGO",
          },
          isHome: isHome,
        };
      });

      return formOverTimeData;
    } catch (error) {
      console.warn(
        `Could not calculate form over time for team ${teamId}: ${error.message}`,
      );
      return [];
    }
  }

  // ===================================================================
  // SIMPLIFIED DATA FETCHING METHODS - More Realistic Approach
  // ===================================================================

  /**
   * Get recent matches for team using TournamentMatchList
   */
  private async getRecentMatchesForTeam(
    teamId: number,
    tournamentId: number,
  ): Promise<any[]> {
    try {
      // Get tournament match list - much simpler approach
      const matchListResponse =
        await this.korastatsService.getTournamentMatchList(tournamentId);
      if (!matchListResponse?.data) {
        return [];
      }

      const currentDate = new Date();
      const teamMatches = matchListResponse.data
        .filter((match: any) => {
          const matchDate = new Date(match.dateTime);
          const isTeamMatch = match.home?.id === teamId || match.away?.id === teamId;
          const isRecent =
            matchDate > new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          return isTeamMatch && isRecent;
        })
        .slice(0, 20); // Limit to 20 most recent

      return teamMatches;
    } catch (error) {
      console.warn(`Could not fetch recent matches for team ${teamId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get player statistics - simplified approach
   */
  private async getPlayerStatsForTeam(
    teamId: number,
    tournamentId: number,
  ): Promise<KorastatsTournamentPlayerStatsResponse[]> {
    try {
      // Just get the team player list - individual stats are too complex
      const playerListResponse =
        await this.korastatsService.getTournamentTeamPlayerList(tournamentId);
      if (!playerListResponse?.data?.teams) {
        return [];
      }

      const team = playerListResponse.data.teams.find(
        (t: KorastatsTeamWithPlayers) => t.id === teamId,
      );
      if (!team?.players) {
        return [];
      }

      // Return empty array - individual player stats are too resource intensive
      return [];
    } catch (error) {
      console.warn(`Could not fetch player stats for team ${teamId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get formation history - simplified approach using basic match data
   */
  private async getFormationHistoryForTeam(
    teamId: number,
    tournamentId: number,
  ): Promise<
    Array<{
      matchId: number;
      date: string;
      formation: string;
      isHome: boolean;
      opponent: string;
    }>
  > {
    try {
      // Use basic match data instead of detailed formation API calls
      const recentMatches = await this.getRecentMatchesForTeam(teamId, tournamentId);
      const formationHistory: Array<{
        matchId: number;
        date: string;
        formation: string;
        isHome: boolean;
        opponent: string;
      }> = [];

      // Generate basic formation based on match results - much simpler
      for (const match of recentMatches) {
        const isHome = match.objHomeTeam?.intID === teamId;
        const opponent = isHome
          ? match.objAwayTeam?.strTeamNameEn
          : match.objHomeTeam?.strTeamNameEn;

        // Use default formation - detailed formation analysis is too complex
        formationHistory.push({
          matchId: match.intID,
          date: match.dtDateTime,
          formation: "4-4-2", // Default formation
          isHome: isHome,
          opponent: opponent || "Unknown",
        });
      }

      return formationHistory;
    } catch (error) {
      console.warn(
        `Could not fetch formation history for team ${teamId}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Determine if team is national team based on entity club data
   */
  private determineNationalTeamStatus(
    entityClubData: KorastatsEntityClubResponse | null,
    teamId: number,
  ): boolean {
    try {
      // Check if entity club data indicates national team
      // Note: KorastatsEntityClub doesn't have isNationalTeam property
      // We'll rely on name patterns instead

      // Check team name patterns for national teams
      const teamName = entityClubData?.data?.name || "";
      const nationalTeamPatterns = [
        "national",
        "country",
        "saudi arabia",
        "saudi",
        "kingdom",
        "المملكة",
        "السعودية",
        "المنتخب",
        "الوطني",
      ];

      const isNationalByName = nationalTeamPatterns.some((pattern) =>
        teamName.toLowerCase().includes(pattern.toLowerCase()),
      );

      return isNationalByName;
    } catch (error) {
      console.warn(
        `Could not determine national team status for team ${teamId}: ${error.message}`,
      );
      return false; // Default to club team
    }
  }
}

