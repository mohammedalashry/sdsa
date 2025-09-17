// src/integrations/korastats/types/league.types.ts
// Based on your REAL Korastats API responses

export interface KorastatsBaseResponse<T> {
  result: string;
  message: string;
  data: T;
}

// Real Tournament List Response Structure
export interface KorastatsTournament {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  organizer: {
    _type: "ORGANIZER";
    id: number;
    name: string;
    abbrev: string;
    country: {
      _type: "COUNTRY";
      id: number;
      name: string;
    };
    continent: string | null;
  };
  ageGroup: {
    _type: "AGE GROUP";
    id: number;
    name: string;
    age: {
      min: number | null;
      max: number | null;
    };
  };
}

// Real Tournament Structure Response
export interface KorastatsTournamentStructure {
  _type: "TOURNAMENT";
  id: number;
  tournament: string;
  season: string;
  startDate: string;
  endDate: string;
  gender: string;
  ageGroup: {
    _type: "AGE GROUP";
    id: number;
    name: string;
    age: {
      min: number | null;
      max: number | null;
    };
  };
  organizer: {
    _type: "ORGANIZER";
    id: number;
    name: string;
    abbrev: string;
    country: {
      _type: "COUNTRY";
      id: number;
      name: string;
    };
    continent: string | null;
  };
  stages: KorastatsStage[];
}

export interface KorastatsStage {
  _type: "STAGE";
  id: number;
  stage: string;
  order: number;
  rounds: number;
  type: string; // "League" or other
  groups: KorastatsGroup[];
}

export interface KorastatsGroup {
  _type: "GROUP";
  id: number;
  group: string;
  teams: KorastatsTeamInStructure[];
  matches: KorastatsMatchInStructure[];
}

export interface KorastatsTeamInStructure {
  _type: "TEAM";
  id: number;
  team: string;
  matches: number;
  points: number;
  goals_scored: number;
  goals_conceded: number;
  goals_difference: number;
  won: number;
  draw: number;
  lost: number;
  goals_scored_home: number;
  goals_conceded_home: number;
  goals_difference_home: number;
  goals_scored_away: number;
  goals_conceded_away: number;
  goals_difference_away: number;
  lastupdate: string;
}

export interface KorastatsMatchInStructure {
  _type: "MATCH";
  id: number;
  dateTime: string;
  lastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
  };
  teams: {
    home: {
      _type: "TEAM";
      id: number;
      side: string;
      team: string;
      coach: {
        _type: "COACH";
        id: number;
        name: string;
        dob: string;
        gender: string;
        nationality: {
          _type: "NATIONALITY";
          id: number;
          name: string;
        };
      };
    };
    away: {
      _type: "TEAM";
      id: number;
      side: string;
      team: string;
      coach: {
        _type: "COACH";
        id: number;
        name: string;
        dob: string;
        gender: string;
        nationality: {
          _type: "NATIONALITY";
          id: number;
          name: string;
        };
      };
    };
  };
  score: {
    home: number;
    away: number;
  };
  referee: {
    _type: "REFEREE";
    id: number;
    name: string;
    dob: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
  };
  assistant1: {
    _type: "ASSISTANT RFFEREE";
    id: number;
    name: string;
    dob: string | null;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    } | null;
  };
  assistant2: {
    _type: "ASSISTANT RFFEREE";
    id: number;
    name: string;
    dob: string | null;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    } | null;
  };
  fourthOfficial: {
    _type: "REFEREE";
    id: number;
    name: string;
    dob: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
  };
}

// FIXED: Season List Response (different structure than Tournament List!)
export interface KorastatsSeasonListResponse {
  root: {
    result: boolean;
    title: string;
    message: string;
    object: {
      total_records: number;
      current_records: number;
      pages: number;
      current_page: number;
      Data: KorastatsSeason[];
    };
  };
}

export interface KorastatsSeason {
  _type: "SEASON";
  id: number;
  name: string;
  gender: string | null;
  nature: string; // "LEAGUE"
  tournament: {
    id: number;
    name: string;
    gender: string;
    organizer: {
      id: number;
      name: string;
      country: {
        id: number;
        name: string;
      };
    };
    age_group: {
      id: number;
      name: string;
    };
  };
  startDate: string;
  endDate: string;
}

// Match List Response (TournamentMatchList)
interface KorastatsMatchListItem {
  _type: "MATCH";
  id: number;
  date: string;
  home_team: string;
  away_team: string;
  home_team_id?: number;
  away_team_id?: number;
  score?: string;
  stadium?: string;
  status?: string;
}

// Standings Response (TournamentGroupStandings)
export interface KorastatsStanding {
  teamID: number;
  team: string;
  rank: number;
  points: number;
  played: { total: number; home: number; away: number };
  won: { total: number; home: number; away: number };
  draw: { total: number; home: number; away: number };
  lost: { total: number; home: number; away: number };
  scored: { total: number; home: number; away: number };
  conceded: { total: number; home: number; away: number };
}

export interface KorastatsStandingsData {
  _type: "TOURNAMENT";
  id: number;
  stages: Array<{
    groups: Array<{
      group: string;
      standings: KorastatsStanding[];
    }>;
  }>;
}

// Response type wrappers
export type KorastatsTournamentListResponse = KorastatsBaseResponse<
  KorastatsTournament[]
>;
export type KorastatsTournamentStructureResponse =
  KorastatsBaseResponse<KorastatsTournamentStructure>;
export type KorastatsStandingsResponse = KorastatsBaseResponse<KorastatsStandingsData>;

