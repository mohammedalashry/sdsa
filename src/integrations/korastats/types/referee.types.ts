// src/integrations/korastats/types/referee.types.ts
// Korastats API response types for referee-related endpoints

// Base response wrapper for Korastats API
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}

// ===== TOURNAMENT REFEREE LIST =====
// Response from TournamentRefereeList endpoint
export interface KorastatsTournamentRefereeList {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  startDate: string;
  endDate: string;
  referees: KorastatsRefereeInTournament[];
}

export interface KorastatsRefereeInTournament {
  _type: "REFEREE";
  id: number;
  name: string;
  dob: string;
  stats: KorastatsRefereeStats;
}

export interface KorastatsRefereeStats {
  MatchesPlayed: number;
  Corners: number;
  Offside: number;
  "Yellow Card": number;
  "2nd Yellow Card": number;
  "Direct Red Card": number;
  Penalties: number;
  Fouls: number;
  "Fouls In Final Third": number;
  "Average Played Time in Minute": number;
}

// ===== ENTITY REFEREE =====
// Response from EntityReferee endpoint
export interface KorastatsEntityReferee {
  _type: "REFEREE";
  id: number;
  fullname: string;
  nationality: {
    id: number;
    name: string;
  };
  dob: string;
  age: string;
  retired: boolean;
  gender: string;
  image: string;
}

// ===== RESPONSE TYPE WRAPPERS =====
export type KorastatsTournamentRefereeListResponse =
  KorastatsBaseResponse<KorastatsTournamentRefereeList>;
export type KorastatsEntityRefereeResponse =
  KorastatsBaseResponse<KorastatsEntityReferee>;

