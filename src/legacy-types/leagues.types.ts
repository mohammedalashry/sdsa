import { Team } from "./teams.types";
import { FixtureDataResponse } from "./fixtures.types";

export interface League {
  id: number;
  name: string;
  type: string;
  logo: string;
}
export interface LeagueCountry {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface LeagueSeason {
  year: number;
  start: string;
  end: string;
  current: boolean;
}
// GET /league/
export interface LeagueData {
  league: League;
  country: LeagueCountry;
  seasons: LeagueSeason[];
}

// GET /league/historical-winners/
export interface LeagueHistoricalWinner {
  season: number;
  winner: Team;
  runnerUp: Team;
}

export type LeagueDataResponse = LeagueData[];
export type LeagueRoundsResponse = string[];
export type LeagueHistoricalWinnersResponse = LeagueHistoricalWinner[];
export type LeagueLastFixtureResponse = FixtureDataResponse[];

