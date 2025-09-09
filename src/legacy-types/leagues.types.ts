import { Team } from "./teams.types";

export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string;
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
}
export interface League {
  id: number;
  name: string;
  type: string;
  logo: string;
}
export interface LeagueType {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number | null;
  round: string | null;
}
export interface LeagueCountry {
  name: string;
  code: string | null;
  flag: string | null;
}

export interface LeagueTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean;
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
export interface TeamFields {
  home: number;
  away: number;
}
// GET /league/last-fixture/
export interface LeagueLastFixture {
  fixture: Fixture;
  league: LeagueType;
  teams: { home: LeagueTeam; away: LeagueTeam };
  averageTeamRating: TeamFields;
  tablePosition: TeamFields;
  score: {
    halftime: TeamFields;
    fulltime: TeamFields;
    extratime: TeamFields;
    penalty: TeamFields;
  };
  goals: TeamFields;
}

export type LeagueDataResponse = LeagueData[];
export type LeagueRoundsResponse = string[];
export type LeagueHistoricalWinnersResponse = LeagueHistoricalWinner[];
export type LeagueLastFixtureResponse = LeagueLastFixture[];

