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
export type GoalsOverTimeResponse = { pagingInfo: any; data: GoalsOverTime };
export type FormOverTimeResponse = { pagingInfo: any; data: FormOverTime };
export type TeamLineupResponse = TeamLineup[];
export type PositionOverTimeResponse = PositionOverTime;

