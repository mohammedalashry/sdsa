import { TeamAttacking, TeamPasses, TeamDefending, TeamOther } from "./team-stats.types";
export interface Fixture {
  id: number;
  referee: string | null;
  timezone: string;
  date: string; // ISO string
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
    long: string; // "Match Finished", "Not Started", etc.
    short: string; // "FT", "NS", "LIVE", etc.
    elapsed: number | null; // Minutes elapsed
  };
}
export type StatType =
  | "Shots on Goal"
  | "Shots off Goal"
  | "Total Shots"
  | "Blocked Shots"
  | "Shots insidebox"
  | "Shots outsidebox"
  | "Fouls"
  | "Corner Kicks"
  | "Offsides"
  | "Ball Possession"
  | "Yellow Cards"
  | "Red Cards"
  | "Goalkeeper Saves"
  | "Total passes"
  | "Passes accurate"
  | "Passes %";
// League information within fixture
export interface FixtureLeague {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string | null;
  season: number;
  round: string;
}

// Team information within fixture
export interface FixtureTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null; // null for draws or unfinished matches
}

export interface FixtureTeams {
  home: FixtureTeam;
  away: FixtureTeam;
}

// Goals structure
export interface FixtureGoals {
  home: number | null;
  away: number | null;
}

// Complete score breakdown
export interface FixtureScore {
  halftime: FixtureGoals;
  fulltime: FixtureGoals;
  extratime: FixtureGoals;
  penalty: FixtureGoals;
}

// Table positions (optional)
export interface TablePosition {
  home: number | null;
  away: number | null;
}

// Average team ratings (optional, with random defaults in Django)
export interface AverageTeamRating {
  home: number; // 0-10 scale
  away: number; // 0-10 scale
}

// Main fixture data structure matching Django exactly
export interface FixtureData {
  fixture: Fixture;
  league: FixtureLeague;
  teams: FixtureTeams;
  goals: FixtureGoals;
  score: FixtureScore;
  tablePosition: TablePosition | null;
  averageTeamRating: AverageTeamRating | null;
}

// ===================== DETAILED FIXTURE TYPES ==============================
// For GET /fixture/details/?id=X endpoint

// Event data (timeline)
export interface EventData {
  time: {
    elapsed: number;
    extra: number | null;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  player: {
    id: number;
    name: string;
  };
  assist: {
    id: number | null;
    name: string | null;
  };
  type: string; // "Goal", "Card", "Substitution", etc.
  detail: string; // "Normal Goal", "Yellow Card", etc.
  comments: string | null;
}

// Lineup data
export interface LineupData {
  team: {
    id: number;
    name: string;
    logo: string;
    colors: {
      player: {
        primary: string;
        number: string;
        border: string;
      };
      goalkeeper: {
        primary: string;
        number: string;
        border: string;
      };
    };
  };
  formation: string;
  startXI: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      photo: string;
      rating: string | null;
      pos: string;
      grid: string;
    };
  }>;
  substitutes: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      photo: string;
      rating: string | null;
      pos: string;
      grid: string | null;
    };
  }>;
  coach: {
    id: number;
    name: string;
    photo: string;
  };
}

// Injury data
export interface InjuriesData {
  player: {
    id: number;
    name: string;
    photo: string;
    type: string;
    reason: string;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  fixture: {
    id: number;
    timezone: string;
    date: string;
    timestamp: number;
  };
  league: {
    id: number;
    season: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
  };
}

// Player statistics for fixture
export interface FixturePlayerStatsData {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  players: Array<{
    player: {
      id: number;
      name: string;
      photo: string;
    };
    statistics: Array<{
      games: {
        minutes: number | null;
        number: number;
        position: string;
        rating: string | null;
        captain: boolean;
        substitute: boolean;
      };
      offsides: number | null;
      shots: {
        total: number | null;
        on: number | null;
      };
      goals: {
        total: number | null;
        conceded: number | null;
        assists: number | null;
        saves: number | null;
      };
      passes: {
        total: number | null;
        key: number | null;
        accuracy: string | null;
      };
      tackles: {
        total: number | null;
        blocks: number | null;
        interceptions: number | null;
      };
      duels: {
        total: number | null;
        won: number | null;
      };
      dribbles: {
        attempts: number | null;
        success: number | null;
        past: number | null;
      };
      fouls: {
        drawn: number | null;
        committed: number | null;
      };
      cards: {
        yellow: number | null;
        red: number | null;
        yellowred: number | null;
      };
      penalty: {
        won: number | null;
        committed: number | null;
        scored: number | null;
        missed: number | null;
        saved: number | null;
      };
    }>;
  }>;
}
// Team statistics for fixture
export interface FixtureStatsData {
  team: {
    id: number;
    name: string;
    logo: string;
  };
  statistics: Array<{
    type: StatType; // "Shots on Goal", "Shots off Goal", "Total Shots", etc.
    value: number | string | null;
  }>;
}
export interface TeamHomeAwayStats {
  home: number;
  away: number;
  total: number;
}
// Team stats data (season performance)
export interface TeamStatsData {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  form: string;
  fixtures: {
    played: TeamHomeAwayStats;
    wins: TeamHomeAwayStats;
    draws: TeamHomeAwayStats;
    loses: TeamHomeAwayStats;
  };
  goals: {
    for_: { total: TeamHomeAwayStats; average: TeamHomeAwayStats };
    against: { total: TeamHomeAwayStats; average: TeamHomeAwayStats };
  };
  biggest: {
    streak: { wins: number; draws: number; loses: number };
  };
  clean_sheet: TeamHomeAwayStats;
  teamAttacking: TeamAttacking;
  teamPasses: TeamPasses;
  teamDefending: TeamDefending;
  teamOther: TeamOther;
  average_team_rating: number;
  rank: number;
}

// Complete detailed fixture response
export interface FixtureDetailed {
  fixtureData: FixtureData;
  timelineData: EventData[]; // Match timeline data (collected from the API)
  lineupsData: LineupData[]; // MatchSquad
  injuriesData: InjuriesData[];
  playerStatsData: FixturePlayerStatsData[]; // MatchPlayersStats for each player in match
  statisticsData: FixtureStatsData[]; // Match Summary(collected from the API) -> home and away > stats > type and value with gemini
  headToHeadData: FixtureData[]; // find similar teams names in MatchList and return FixtureData for match Id
  teamStatsData: TeamStatsData[];
}

// ===== PREDICTION AND COMPARISON TYPES =====

export interface ComparisonData {
  team: {
    id: number;
    name: string;
    logo: string;
    code: string;
    country: string;
    founded: number;
    national: boolean;
  };
  clean_sheet: number;
  form: number;
  win_streak: number;
  goals_scored: number;
  goals_conceded: number;
  consistency: number;
}

export interface PredictionsData {
  winner: {
    id: number | null;
    name: string;
    comment: string;
  };
  win_or_draw: boolean;
  under_over: string | null;
  goals: {
    home: string;
    away: string;
  };
  advice: string;
  percent: {
    home: string;
    draw: string;
    away: string;
  };
}

// ===== MOMENTUM AND ANALYSIS TYPES =====

export interface MomentumData {
  time: string;
  homeEvent: string | null;
  awayEvent: string | null;
  homeMomentum: string;
  awayMomentum: string;
}

export interface MomentumResponse {
  data: MomentumData[];
  home: FixtureTeam;
  away: FixtureTeam;
}

// Match highlights
export interface MatchHighlights {
  host: string; // "youtube", "youtube-channel", etc.
  url: string;
}

// Heatmap data
export interface FixtureHeatmapData {
  points: number[][]; // Array of [x, y, intensity] coordinates
}

export interface FixtureTeamHeatmap {
  team: FixtureTeam;
  heatmap: FixtureHeatmapData;
}

// Shot map data
export interface Shot {
  id: number;
  playerId: number;
  time: string;
  zone: string;
  outcome: string;
  x: number;
  y: number;
  isBlocked: boolean;
  isOnTarget: boolean;
  blockedX: number;
  blockedY: number;
  goalCrossedY: number;
  goalCrossedZ: number;
  shotType: string;
  situation: string;
}

export interface TeamShotmapData {
  team: FixtureTeam;
  shots: Shot[];
}

// Top performers data
export interface FixtureTopPlayersStats {
  name: string;
  home: number | string;
  away: number | string;
}

export interface FixtureTopPlayers {
  homePlayer: {
    id: number;
    name: string;
    photo: string;
  };
  awayPlayer: {
    id: number;
    name: string;
    photo: string;
  };
  stats: FixtureTopPlayersStats[];
}

export interface FixtureTopPerformers {
  league: {
    name: string;
    logo: string;
    season: number;
  };
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  topScorer: FixtureTopPlayers;
  topAssister: FixtureTopPlayers;
  topKeeper: FixtureTopPlayers;
}

// ===== RESPONSE TYPE DEFINITIONS =====

// Main endpoint responses
export type FixtureDataResponse = FixtureData[];
export type FixtureDetailedResponse = FixtureDetailed;
export type FixtureComparisonResponse = ComparisonData[];
export type FixturePredictionsResponse = PredictionsData;
export type FixtureMomentumResponse = MomentumResponse;
export type FixtureHighlightsResponse = MatchHighlights;
export type FixtureHeatmapResponse = FixtureTeamHeatmap[];
export type FixtureShotmapResponse = TeamShotmapData[];
export type FixtureTopPerformersResponse = FixtureTopPerformers;

