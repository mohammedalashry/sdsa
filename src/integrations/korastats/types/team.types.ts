// src/integrations/korastats/types/team.types.ts
// KoraStats Team API response types

import { KorastatsBaseResponse } from "./index";

// ===== TEAM INFO =====
// Response from TeamInfo endpoint
export interface KorastatsTeamInfo {
  _type: "TEAM";
  id: number;
  name: string;
  short_name?: string;
  nickname?: string;
  country: {
    id: number;
    name: string;
  };
  city?: string;
  founded?: number;
  logo?: string;
  is_national_team: boolean;
  stadium?: {
    id: number;
    name: string;
    capacity?: number;
    surface?: string;
    city?: string;
  };
}

// ===== TOURNAMENT TEAM LIST =====
// Response from TournamentTeamList endpoint
export interface KorastatsTournamentTeamList {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  teams: KorastatsTeamListItem[];
}

export interface KorastatsTeamListItem {
  _type: "TEAM";
  id: number;
  name: string;
  short_name?: string;
  nickname?: string;
  country: {
    id: number;
    name: string;
  };
  city?: string;
  founded?: number;
  logo?: string;
  is_national_team: boolean;
  stadium?: {
    id: number;
    name: string;
    capacity?: number;
    surface?: string;
    city?: string;
  };
}

// ===== TOURNAMENT TEAM STATS =====
// Response from TournamentTeamStats endpoint
export interface KorastatsTournamentTeamStats {
  _type: "TEAM";
  id: number;
  name: string;
  stats: KorastatsTeamStat[];
}

export interface KorastatsTeamStat {
  _type: "STAT";
  id: number;
  stat: string;
  value: number;
}

// Stat names enum for type safety
export type StatName =
  | "Success Passes"
  | "Total Passes"
  | "Success Crosses"
  | "Total Crosses"
  | "Success Long Pass"
  | "Total Long Pass"
  | "Total Ball Lost"
  | "Total Ball Won"
  | "Total Attempts"
  | "Success Attempts"
  | "Yellow Card"
  | "Second Yellow Card"
  | "Red Card"
  | "Fouls Commited"
  | "Minutes Played"
  | "Goals Scored"
  | "Assists"
  | "Corners"
  | "Offsides"
  | "Matches Played as Lineup"
  | "Goals Conceded"
  | "Possession"
  | "Possession 0-15"
  | "Possession 15-30"
  | "Possession 30-45"
  | "Possession 45-60"
  | "Possession 60-75"
  | "Possession 75-90"
  | "Possession 90-105"
  | "Possession 105-120"
  | "Failed Crosses"
  | "Attempts Off Target"
  | "Attempts Blocked"
  | "Win"
  | "Draw"
  | "Lost"
  | "Throw-In Cross Total"
  | "Throw-In Cross Success"
  | "ThrowInLongPassTotal"
  | "ThrowInLongPassSuccess"
  | "ThrowInShortPassTotal"
  | "ThrowInShortPassSuccess"
  | "ThrowInTotal"
  | "ThrowInSuccess"
  | "Expected Threat"
  | "Expected Threat (Pass Success)"
  | "Expected Threat (Pass Fail)"
  | "Expected Threat SD"
  | "Expected Threat SD (Pass Success)"
  | "Expected Threat SD (Pass Fail)"
  | "Expected Threat Mean"
  | "Expected Threat Mean (Pass Success)"
  | "Expected Threat Mean (Pass Fail)"
  | "Expected Threat RSD"
  | "Expected Threat RSD (Pass Success)"
  | "Expected Threat RSD (Pass Fail)"
  | "Expected Threat Positive Success"
  | "Expected Threat Positive Fail"
  | "Expected Threat Positive Total"
  | "Expected Threat Negative Success"
  | "Expected Threat Negative Fail"
  | "Expected Threat Negative Total"
  | "Red Card Total (2nd Yellow Card + Red Card)"
  | "Pass Per Defensive Action"
  | "Chances Created Open Play"
  | "Chances Created Set-Pieces";

// ===== TOURNAMENT TEAM PLAYER LIST =====
// Response from TournamentTeamPlayerList endpoint
export interface KorastatsTournamentTeamPlayerList {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  teams: KorastatsTeamWithPlayers[];
}

export interface KorastatsTeamWithPlayers {
  _type: "TEAM";
  id: number;
  team: string;
  players: KorastatsPlayerInTeam[];
}

export interface KorastatsPlayerInTeam {
  _type: "PLAYER";
  id: number;
  name: string;
  nickname?: string;
  dob: string;
  age: number;
  nationality: {
    id: number;
    name: string;
  };
  height?: number;
  weight?: number;
  preferred_foot?: string;
  position: {
    id: number;
    name: string;
    category: string;
  };
  shirtnumber?: number;
  photo?: string;
}

// ===== ENTITY CLUB =====
// Response from EntityClub endpoint
export interface KorastatsEntityClub {
  _type: "CLUB";
  id: number;
  name: string;
  short_name?: string;
  nickname?: string;
  country: {
    id: number;
    name: string;
  };
  city?: string;
  founded?: number;
  logo?: string;
  is_national_team: boolean;
  stadium?: {
    id: number;
    name: string;
    capacity?: number;
    surface?: string;
    city?: string;
  };
  current_season?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
}

// ===== RESPONSE TYPES =====
export type KorastatsTeamInfoResponse = KorastatsBaseResponse<KorastatsTeamInfo>;
export type KorastatsTournamentTeamListResponse =
  KorastatsBaseResponse<KorastatsTournamentTeamList>;
export type KorastatsTournamentTeamStatsResponse =
  KorastatsBaseResponse<KorastatsTournamentTeamStats>;
export type KorastatsTournamentTeamPlayerListResponse =
  KorastatsBaseResponse<KorastatsTournamentTeamPlayerList>;
export type KorastatsEntityClubResponse = KorastatsBaseResponse<KorastatsEntityClub>;
