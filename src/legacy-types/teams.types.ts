import { CoachData } from "./coach.types";
import { League } from "./leagues.types";
import { PlayerData } from "./players.types";
import { TeamAttacking, TeamDefending, TeamOther, TeamPasses } from "./team-stats.types";
import { TeamHomeAwayStats } from "./fixtures.types";
export interface Transfer {
  date: string;
  type: string | null;
  teams: {
    in: { id: number; name: string; logo: string };
    out: { id: number; name: string; logo: string };
  };
}
export interface TeamLineupPlayer {
  id: number;
  name: string;
  photo: string;
  number: number;
  pos: string;
  grid: string;
  rating: string;
}
export interface TransferData {
  player: { id: number; name: string };
  update: string;
  transfers: Transfer[];
}
export interface TeamCommon {
  id: number;
  name: string;
  logo: string;
  winner?: boolean;
}
export interface TeamStatsLeague {
  id: number;
  name: string;
  logo: string;
  flag: string;
  season: number;
  country: string;
}
export interface GoalsData {
  totalShots: number;
  totalGoals: number;
  team: TeamCommon;
}
export interface Team {
  id: number;
  name: string;
  code: string | null;
  country: string;
  founded: number | null;
  national: boolean;
  logo: string;
}

export interface TeamVenue {
  id: number | null;
  name: string | null;
  address: string | null;
  city: string | null;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}

export interface TeamsTrophiesData {
  league: string;
  country: string;
  season: string;
}
export interface TeamData {
  team: Team;
  venue: TeamVenue;
}

export interface TeamInfo {
  team: Team;
  venue: TeamVenue;
  coach: CoachData[];
  transfers: TransferData[];
  totalPlayers: number;
  foreignPlayers: number;
  averagePlayerAge: number;
  clubMarketValue: string;
  currentLeagues: League[];
  trophies: TeamsTrophiesData[];
}
export interface TeamSquad {
  players: PlayerData[];
  coach: CoachData[];
}
export interface TeamComparisonStats {
  league: TeamStatsLeague | null;

  team: Team;
  averageAge: number;
  nationalTeamPlayers: number;
  foreigners: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  loses: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  cleanSheetGames: number;
}
export interface TeamStats {
  league: TeamStatsLeague | null;
  rank: number;
  average_team_rating: number;

  team: { id: number; name: string; logo: string };
  form: string;

  // Comprehensive Korastats statistics
  korastats_stats: {
    // Basic match stats
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_scored: number;
    goals_conceded: number;
    assists: number;

    // Possession stats
    possession: number;
    possession_time: number;
    possession_time_percent: number;

    // Passing stats
    total_passes: number;
    success_passes: number;
    total_short_pass: number;
    success_short_pass: number;
    total_long_pass: number;
    success_long_pass: number;
    total_crosses: number;
    success_crosses: number;
    failed_crosses: number;

    // Attacking stats
    total_attempts: number;
    success_attempts: number;
    attempts_off_target: number;
    attempts_blocked: number;
    attempts_saved: number;
    attempts_on_bars: number;
    one_on_one_missed: number;

    // Goal scoring breakdown
    goals_scored_by_right_foot: number;
    goals_scored_by_left_foot: number;
    goals_scored_by_head: number;

    // Penalty stats
    penalty_committed: number;
    penalty_awarded: number;
    penalty_missed: number;
    penalty_scored: number;
    goals_saved: number;

    // Defensive stats
    tackle_won: number;
    tackle_fail: number;
    tackle_clear: number;
    intercept_won: number;
    intercept_clear: number;
    aerial_won: number;
    aerial_lost: number;
    ball_recover: number;
    clear: number;
    blocks: number;
    opportunity_save: number;

    // Dribbling stats
    dribble_success: number;
    dribble_fail: number;

    // Ball control stats
    total_ball_lost: number;
    total_ball_won: number;
    ball_lost_under_pressure: number;
    ball_received_success: number;
    ball_received_fail: number;

    // Discipline stats
    yellow_card: number;
    second_yellow_card: number;
    red_card: number;
    red_card_total: number;
    fouls_committed: number;
    fouls_awarded: number;
    fouls_committed_in_defensive_third: number;
    fouls_awarded_in_offensive_third: number;

    // Set pieces
    corners: number;
    offsides: number;
    success_open_play_crosses: number;
    total_open_play_crosses: number;
    success_set_piece_crosses: number;
    total_set_piece_crosses: number;
    direct_set_piece_goal_scored: number;

    // Throw-ins
    throw_in_total: number;
    throw_in_success: number;
    throw_in_cross_total: number;
    throw_in_cross_success: number;
    throw_in_long_pass_total: number;
    throw_in_long_pass_success: number;
    throw_in_short_pass_total: number;
    throw_in_short_pass_success: number;

    // Advanced analytics
    xg: number;
    xga: number;
    expected_threat: number;
    expected_threat_pass_success: number;
    expected_threat_pass_fail: number;
    expected_threat_sd: number;
    expected_threat_mean: number;
    expected_threat_rsd: number;
    expected_threat_positive_success: number;
    expected_threat_positive_fail: number;
    expected_threat_positive_total: number;
    expected_threat_negative_success: number;
    expected_threat_negative_fail: number;
    expected_threat_negative_total: number;

    // Chances and key passes
    chance_created: number;
    chances_created_open_play: number;
    chances_created_set_pieces: number;
    key_passes: number;

    // Time-based stats
    minutes_played: number;
    suspicious_time: number;

    // Possession by time periods
    possession_0_15: number;
    possession_15_30: number;
    possession_30_45: number;
    possession_45_60: number;
    possession_60_75: number;
    possession_75_90: number;

    // Goals by time periods
    goals_scored_0_15: number;
    goals_scored_15_30: number;
    goals_scored_30_45: number;
    goals_scored_45_60: number;
    goals_scored_60_75: number;
    goals_scored_75_90: number;

    // Possession time by periods
    possession_time_0_15: number;
    possession_time_15_30: number;
    possession_time_30_45: number;
    possession_time_45_60: number;
    possession_time_60_75: number;
    possession_time_75_90: number;
    possession_time_90_105: number;
    possession_time_105_120: number;

    // Possession time percent by periods
    possession_time_percent_0_15: number;
    possession_time_percent_15_30: number;
    possession_time_percent_30_45: number;
    possession_time_percent_45_60: number;
    possession_time_percent_60_75: number;
    possession_time_percent_75_90: number;
    possession_time_percent_90_105: number;
    possession_time_percent_105_120: number;

    // Advanced metrics
    pass_per_defensive_action: number;
    clean_sheet: number;
    matches_played_as_lineup: number;
  };

  // Legacy stats structure (for backward compatibility)
  team_attacking: TeamAttacking;
  team_defending: TeamDefending;
  team_others: TeamOther;
  team_passing: TeamPasses;
  clean_sheet: TeamHomeAwayStats;
  goals: {
    for_: { total: TeamHomeAwayStats; average: TeamHomeAwayStats };
    against: { total: TeamHomeAwayStats; average: TeamHomeAwayStats };
  };
  biggest: { streak: { wins: number; draws: number; loses: number } };
  fixtures: {
    played: TeamHomeAwayStats;
    wins: TeamHomeAwayStats;
    draws: TeamHomeAwayStats;
    loses: TeamHomeAwayStats;
  };
}
export interface GoalsOverTime {
  date: string;
  timestamp: number;
  goalsScored: GoalsData;
  goalsConceded: GoalsData;
  opponentTeam: TeamCommon;
}
export interface FormOverTime {
  date: string;
  timestamp: number;
  currentPossession: number;
  opponentPossession: number;
  opponentTeam: TeamCommon;
  currentTeam: TeamCommon;
}
export interface TeamLineup {
  formation: string;
  coach: { id: number; name: string; photo: string };
  team: TeamCommon;
  startXI: { player: TeamLineupPlayer }[];
  substitutes: { player: TeamLineupPlayer }[];
}
export interface PositionOverTime {
  positions: { date: string; position: number }[];
}
export type TeamsResponse = TeamData[];
export type TeamInfoResponse = TeamInfo;
export type TeamSquadResponse = TeamSquad;
export type TeamComparisonStatsResponse = TeamComparisonStats;
export type TeamStatsResponse = TeamStats;
export type GoalsOverTimeResponse = { pagingInfo: any; data: GoalsOverTime[] };
export type FormOverTimeResponse = { pagingInfo: any; data: FormOverTime[] };
export type TeamLineupResponse = TeamLineup[];
export type PositionOverTimeResponse = PositionOverTime;

