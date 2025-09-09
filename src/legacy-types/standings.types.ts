// src/legacy-types/standings.types.ts

export interface StandingsTeam {
  id: number;
  name: string;
  logo: string;
}

export interface StandingsGoals {
  for_: number;
  against: number;
}

export interface StandingsStats {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals: StandingsGoals;
}

export interface StandingsEntry {
  rank: number;
  team: StandingsTeam;
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: StandingsStats;
  home: StandingsStats;
  away: StandingsStats;
  update: string;
}

export interface StandingsLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
  standings: StandingsEntry[][];
}

export interface StandingsResponse {
  league: StandingsLeague;
}

