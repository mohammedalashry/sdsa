import { Team } from "./teams.types";
import { League } from "./leagues.types";
import { FixtureData, Shot } from "./fixtures.types";

export interface PlayerInfo {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  birth: {
    date: string | null;
    place: string | null;
    country: string | null;
  };
  nationality: string | null;
  height: string | null;
  weight: string | null;
  injured: boolean;
  photo: string;
}

export interface PlayerGames {
  appearences: number;
  lineups: number;
  minutes: number;
  number: number;
  position: string;
  rating: string;
  captain: boolean;
}
export interface PlayerPenalty {
  won: number;
  commited: number;
  scored: number;
  missed: number;
  saved: number;
}
export interface PlayerCard {
  yellow: number;
  yellowred: number;
  red: number;
}
export interface PlayerFouls {
  drawn: number;
  committed: number;
}
export interface PlayerDribbles {
  attempts: number;
  success: number;
  past: number;
}
export interface PlayerTackles {
  total: number;
  blocks: number;
  interceptions: number;
}
export interface PlayerDuels {
  total: number;
  won: number;
}
export interface PlayerPasses {
  total: number;
  key: number;
  accuracy: number;
}
export interface PlayerShots {
  total: number;
  on: number;
}
export interface PlayerGoals {
  total: number;
  assists: number;
  conceded: number;
  saves: number;
}
export interface PlayerSubstitutes {
  in: number;
  out: number;
  bench: number;
}
export interface PlayerStatistics {
  team: Team;
  league: League;
  games: PlayerGames;
  substitutes: PlayerSubstitutes;
  shots: PlayerShots;
  goals: PlayerGoals;
  passes: PlayerPasses;
  tackles: PlayerTackles;
  duels: PlayerDuels;
  dribbles: PlayerDribbles;
  fouls: PlayerFouls;
  cards: PlayerCard;
  penalty: PlayerPenalty;
}
export interface PlayerData {
  player: PlayerInfo;
  statistics: PlayerStatistics[];
}
interface TransferData {
  player: PlayerData;
  update: string;
  transfers: Transfer[];
}

interface Transfer {
  date: string;
  type: string | null;
  teams: {
    in: Team;
    out: Team;
  };
}

export interface TrophiesTeamData {
  league: League;
  season: string;
  seasonInt: number;
  team: Team;
}
export interface CareerData {
  team: Team;
  season: number;
  goals: {
    total: number;
    assists: number;
    conceded: number;
    saves: number;
  };
}
export interface PlayerBaseInfo {
  player: PlayerInfo;
  transfers: string;
  position: string;
  shirtNumber: number;
  team: { id: number; name: string; logo: string };
}
export interface PlayerStatisticsItem {
  games: PlayerGames;
  offsides: number;
  shots: PlayerShots;
  goals: PlayerGoals;
  passes: PlayerPasses;
  tackles: PlayerTackles;
  duels: PlayerDuels;
  dribbles: PlayerDribbles;
  fouls: PlayerFouls;
  cards: PlayerCard;
  penalty: PlayerPenalty;
}
export interface FixturePlayer {
  fixture: FixtureData;
  team: { id: number; name: string; logo: string };
  statistics: PlayerStatistics;
}
export interface PlayerTraits {
  att: number;
  dri: number;
  phy: number;
  pas: number;
  sht: number;
  def_: number;
  tac: number;
  due: number;
}
export interface PlayerHeatMap {
  points: number[][];
}
export interface ShotPlayer extends Shot {
  playerName: string;
  PlayerLogo: string;
}
export interface PlayerShotMap {
  shots: ShotPlayer[];
  accuracy: number;
}

export type PlayerInfoResponse = PlayerInfo;
export type TopScorersResponse = PlayerData[];
export type TopAssistsResponse = PlayerData[];
export type PlayerCareerResponse = CareerData[];
export type PlayerStatsResponse = PlayerData[];
export type TrophiesResponse = TrophiesTeamData[];
export type PlayerComparisonsResponse = PlayerData[];
export type PlayerFixturesResponse = FixturePlayer[];
export type PlayerTransfersResponse = TransferData[];
export type PlayerHeatMapResponse = PlayerHeatMap;
export type PlayerShotMapResponse = PlayerShotMap;
export type PlayerTraitsResponse = PlayerTraits;

