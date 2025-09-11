// src/integrations/korastats/types/fixture.types.ts
// Korastats API response types for fixture-related endpoints

// Base response wrapper for Korastats API
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}

// ===== TOURNAMENT MATCH LIST =====
// Response from TournamentMatchList endpoint
export interface KorastatsMatchListItem {
  _type: "MATCH";
  matchId: number;
  status: {
    id: number;
    status: string; // "Approved", "Pending", etc.
  };
  tournament: string;
  season: string;
  round: number;
  home: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  away: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  dateTime: string; // "2025-05-29 21:00:00" format
  dtLastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
  };
  referee: {
    _type: "REFEREE";
    id: number;
    name: string;
    dob: string | null;
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
    };
  } | null;
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
    };
  } | null;
  score: {
    home: number;
    away: number;
  } | null;
}

// ===== MATCH SQUAD =====
// Response from MatchSquad endpoint
export interface KorastatsMatchSquad {
  _type: "MATCH SUMMARY";
  matchId: number;
  tournament_id: number;
  tournament: string;
  season_id: number;
  season: string;
  round: number;
  dateTime: string;
  lastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
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
    dob: string;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
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
  home: {
    _type: "TEAM";
    team: {
      _type: "TEAM";
      id: number;
      name: string;
    };
    squad: KorastatsPlayerInSquad[];
  };
  away: {
    _type: "TEAM";
    team: {
      _type: "TEAM";
      id: number;
      name: string;
    };
    squad: KorastatsPlayerInSquad[];
  };
  status: {
    id: number;
    status: string;
  };
}

export interface KorastatsPlayerInSquad {
  _type: "PLAYER";
  id: number;
  name: string;
  nick_name: string;
  shirt_number: number;
  position: {
    _type: "POSITION";
    id: number;
    name: string;
  };
  lineup: boolean;
  bench: boolean;
}

// ===== MATCH TIMELINE =====
// Response from MatchTimeline endpoint
export interface KorastatsMatchTimeline {
  _type: "MATCH_SUMMARY";
  matchId: number;
  tournament: string;
  seasonId: number;
  season: string;
  round: number;
  home: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  away: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  score: {
    home: number;
    away: number;
  };
  dateTime: string;
  dtLastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
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
    dob: string;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
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
  timeline: KorastatsMatchEvent[];
}

export interface KorastatsMatchEvent {
  _type: "EVENT";
  half: number;
  time: string; // "41:48" format
  event: string; // "Goal Scored", "Yellow Card", "Substitution", etc.
  team: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  player: {
    _type: "PLAYER";
    id: number;
    name: string;
    nickname: string;
    dob: string;
    number: number;
    position: {
      primay: {
        _type: "POSITION";
        id: number;
        name: string;
      };
      secondary: {
        _type: "POSITION";
        id: number;
        name: string;
      };
    };
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
  };
  in?: {
    _type: "PLAYER";
    id: number;
    name: string;
    nickname: string;
    dob: string;
    number: number;
    position: {
      primay: {
        _type: "POSITION";
        id: number;
        name: string;
      };
      secondary: {
        _type: "POSITION";
        id: number;
        name: string;
      };
    };
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
  };
  out?: {
    _type: "PLAYER";
    id: number;
    name: string;
    nickname: string;
    dob: string;
    number: number;
    position: {
      primay: {
        _type: "POSITION";
        id: number;
        name: string;
      };
      secondary: {
        _type: "POSITION";
        id: number;
        name: string;
      };
    };
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
  };
}

// ===== MATCH SUMMARY =====
// Response from MatchSummary endpoint
export interface KorastatsMatchSummary {
  _type: "MATCH SUMMARY";
  matchId: number;
  tournament: string;
  season: string;
  round: number;
  dateTime: string;
  lastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
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
    dob: string;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
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
  score: {
    home: number;
    away: number;
  };
  home: KorastatsTeamSummary;
  away: KorastatsTeamSummary;
}

export interface KorastatsTeamSummary {
  _type: "TEAM SUMMARY";
  team: {
    _type: "TEAM";
    id: number;
    name: string;
  };
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
  stats: KorastatsTeamMatchStats;
}

export interface KorastatsTeamMatchStats {
  Pass: {
    Success: number;
    Total: number;
    Accuracy: number;
  };
  Cross: {
    Success: number;
    Total: number;
    OpenPlay: {
      Success: number;
      Total: number;
      Accuracy: number;
    };
    SetPiece: {
      Success: number;
      Total: number;
      Accuracy: number;
    };
    Accuracy: number;
  };
  LongPass: {
    Success: number;
    Total: number;
    Accuracy: number;
  };
  BallLost: {
    Total: number;
    UnderPressure: number;
    Aerial: number;
  };
  BallWon: {
    Total: number;
    TackleWon: number;
    InterceptionWon: number;
    Aerial: number;
    BallRecover: number;
  };
  Attempts: {
    Total: number;
    Success: number;
    PenaltyMissed: number;
    Bars: number;
    OneOnOneMissed: number;
    AttemptToScore: number;
    SuccessAttemptToScore: number;
    Accuracy: number;
  };
  Cards: {
    Yellow: number;
    SecondYellow: number;
    Red: number;
  };
  Fouls: {
    Committed: number;
    Awarded: number;
    CommittedInDefensiveThird: number;
    AwardedInOffensiveThird: number;
  };
  GoalsScored: {
    Total: number;
    OwnGoals: number;
    Head: number;
    PenaltyScored: number;
    T_0_15: number;
    T_15_30: number;
    T_30_45: number;
    T_45_60: number;
    T_60_75: number;
    T_75_90: number;
    RightFoot: number;
    LeftFoot: number;
    Other: number;
    SetPiece: number;
    T_90_105: number;
    T_105_120: number;
    XG: number;
  };
  Chances: {
    Assists: number;
    KeyPasses: number;
    ChancesCreated: number;
  };
  GoalsConceded: {
    OwnGoals: number;
    Total: number;
  };
  Admin: {
    Corners: number;
    Offside: number;
    MatchesPlayed: number;
  };
  Possession: {
    Touches: {
      Average: number;
      T_0_15: number;
      T_15_30: number;
      T_30_45: number;
      T_45_60: number;
      T_60_75: number;
      T_75_90: number;
      T_90_105: number;
      T_105_120: number;
    };
    Time: {
      Average: number;
      T_0_15: number;
      T_15_30: number;
      T_30_45: number;
      T_45_60: number;
      T_60_75: number;
      T_75_90: number;
      T_90_105: number;
      T_105_120: number;
    };
    TimePercent: {
      Average: number;
      T_0_15: number;
      T_15_30: number;
      T_30_45: number;
      T_45_60: number;
      T_60_75: number;
      T_75_90: number;
      T_90_105: number;
      T_105_120: number;
    };
    SuspeciousTime: number;
    ActualTime: number;
  };
  BallReceive: {
    Success: number;
    Fail: number;
    Total: number;
    Accuracy: number;
  };
  Penalty: {
    Committed: number;
    Awarded: number;
  };
  Defensive: {
    GoalsSaved: number;
    Blocks: number;
    OpportunitySaved: number;
    PPDA: number;
    TackleFail: number;
    TackleClear: number;
    InterceptionClear: number;
    Clear: number;
    Cleansheet: number;
  };
  xT: {
    Total: number;
    PassSuccess: number;
    PassFail: number;
    SD_Total: number;
    SD_PassSuccess: number;
    SD_PassFail: number;
    Mean_Total: number;
    Mean_PassSuccess: number;
    Mean_PassFail: number;
    RSD_Total: number;
    RSD_PassSuccess: number;
    RSD_PassFail: number;
    Positive_Success: number;
    Positive_Fail: number;
    Positive_Total: number;
    Negative_Success: number;
    Negative_Fail: number;
    Negative_Total: number;
  };
  ShortPass: {
    Total: number;
    Success: number;
    Accuracy: number;
  };
  Dribble: {
    Success: number;
    Fail: number;
    Total: number;
    Accuracy: number;
  };
}

// ===== MATCH FORMATION =====
// Response from MatchFormation endpoint
export interface KorastatsMatchFormation {
  _type: "FORMATION";
  matchId: number;
  matchName: string;
  teamId: number;
  teamName: string;
  lineupFormationName: string;
  endOfMatchFormationName: string;
  lineupFormation: KorastatsPlayerLocation[];
  endOfMatchFormation: KorastatsPlayerLocation[];
  intervals: {
    "1st Half": KorastatsPlayerLocation[];
    "1st Half Q1": KorastatsPlayerLocation[];
    "1st Half Q2": KorastatsPlayerLocation[];
    "1st Half Q3": KorastatsPlayerLocation[];
    "2nd Half": KorastatsPlayerLocation[];
    "2nd Half Q1": KorastatsPlayerLocation[];
    "2nd Half Q2": KorastatsPlayerLocation[];
    "2nd Half Q3": KorastatsPlayerLocation[];
  };
  startingLineupFormation: string;
}

export interface KorastatsPlayerLocation {
  _type: "PLAYER_AVERAGE_LOCATION";
  player: {
    intPlayerID: number;
    intPositionID: number;
    strPositionEn: string;
    strPositionClass: string;
    strFullNameEn: string;
    strNickNameEn: string;
    intShirtNumber: number;
    status: "substitute" | "lineup";
  };
  location: {
    x: string | number;
    y: string | number;
  };
}

// ===== MATCH PLAYERS STATS =====
// Response from MatchPlayersStats endpoint (plural - all players)
export interface KorastatsMatchPlayersStats {
  _type: "PLAYERS";
  players: KorastatsPlayerMatchStats[];
}

// Response from MatchPlayerStats endpoint (singular - single player)
export interface KorastatsMatchPlayerStats {
  _type: "PLAYER";
  player: KorastatsPlayerMatchStats;
}

export interface KorastatsPlayerMatchStats {
  _type: "PLAYER";
  id: number;
  name: string;
  nickname: string;
  dob: string;
  shirtnumber: number;
  position: {
    _type: "POSITION";
    id: number;
    name: string;
  };
  team: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  stats: KorastatsPlayerDetailedStats;
}

export interface KorastatsPlayerDetailedStats {
  Admin: {
    MatchesPlayed: number;
    MinutesPlayed: number;
    MatchesPlayedasSub: number;
    MatchesPlayerSubstitutedIn: number;
    Corners: number;
    Offside: number;
  };
  Attempts: {
    Total: number;
    Success: number;
    PenaltyMissed: number;
    Bars: number;
    OneOnOneMissed: number;
    Blocked: number;
    OffTarget: number;
    AttemptToScore: number;
    SuccessAttemptToScore: number;
    Accuracy: number;
  };
  BallLost: {
    Total: number;
    UnderPressure: number;
    Aerial: number;
  };
  BallReceive: {
    Total: number;
    Success: number;
    Fail: number;
    Accuracy: number;
  };
  BallWon: {
    Total: number;
    TackleWon: number;
    InterceptionWon: number;
    Aerial: number;
    BallRecover: number;
  };
  Chances: {
    KeyPasses: number;
    Assists: number;
    ChancesCreated: number;
  };
  Cards: {
    Yellow: number;
    SecondYellow: number;
    Red: number;
  };
  Cross: {
    Success: number;
    Total: number;
    OpenPlay: {
      Success: number;
      Total: number;
      Accuracy: number;
    };
    SetPiece: {
      Success: number;
      Total: number;
      Accuracy: number;
    };
    Accuracy: number;
  };
  Dribble: {
    Total: number;
    Success: number;
    Fail: number;
    Accuracy: number;
  };
  Defensive: {
    TackleFail: number;
    TackleClear: number;
    InterceptionClear: number;
    Clear: number;
    Cleansheet: number;
    GoalsSaved: number;
    Blocks: number;
    OpportunitySaved: number;
  };
  Fouls: {
    Committed: number;
    Awarded: number;
    CommittedInDefensiveThird: number;
    AwardedInOffensiveThird: number;
  };
  GK?: {
    Attempts: {
      Total: number;
      Success: number;
      Saved: number;
    };
    OneonOne: {
      Total: number;
      Saved: number;
      Goal: number;
    };
    Cross: {
      Total: number;
      Saved: number;
    };
    Shoot: {
      Goal: number;
      Saved: number;
    };
    Penalty: {
      Total: number;
      Saved: number;
      Goal: number;
    };
    Freekick: {
      Goal: number;
      Saved: number;
    };
    GoalConceded: number;
  };
  GoalsScored: {
    Total: number;
    PenaltyScored: number;
    OwnGoals: number;
    Head: number;
    T_0_15: number;
    T_15_30: number;
    T_30_45: number;
    T_45_60: number;
    T_60_75: number;
    T_75_90: number;
    RightFoot: number;
    LeftFoot: number;
    Other: number;
    SetPiece: number;
    T_90_105: number;
    T_105_120: number;
    XG: number;
  };
  GoalsConceded: {
    OwnGoals: number;
    Total: number;
  };
  LongPass: {
    Success: number;
    Accuracy: number;
    Total: number;
  };
  Pass: {
    Success: number;
    Total: number;
    Accuracy: number;
  };
  Penalty: {
    Committed: number;
    Awarded: number;
  };
  ShortPass: {
    Total: number;
    Success: number;
    Accuracy: number;
  };
  xT: {
    Total: number;
    PassSuccess: number;
    PassFail: number;
    SD_Total: number;
    SD_PassSuccess: number;
    SD_PassFail: number;
    Mean_Total: number;
    Mean_PassSuccess: number;
    Mean_PassFail: number;
    RSD_Total: number;
    RSD_PassSuccess: number;
    RSD_PassFail: number;
    Positive_Success: number;
    Positive_Fail: number;
    Positive_Total: number;
    Negative_Success: number;
    Negative_Fail: number;
    Negative_Total: number;
  };
}

// ===== MATCH POSSESSION TIMELINE =====
// Response from MatchPossessionTimeline endpoint
export interface KorastatsMatchPossessionTimeline {
  _type: "MATCH";
  id: number;
  tournament: string;
  season: string;
  round: number;
  dateTime: string;
  lastUpdateDateTime: string;
  stadium: {
    _type: "STADIUM";
    id: number;
    name: string;
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
    dob: string;
    gender: string;
    nationality: {
      _type: "NATIONALITY";
      id: number;
      name: string;
    };
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
  score: {
    home: number;
    away: number;
  };
  home: {
    _type: "TEAM";
    team: {
      _type: "TEAM";
      id: number;
      name: string;
    };
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
    possession: KorastatsPossessionPeriod[];
  };
  away: {
    _type: "TEAM";
    team: {
      _type: "TEAM";
      id: number;
      name: string;
    };
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
    possession: KorastatsPossessionPeriod[];
  };
}

export interface KorastatsPossessionPeriod {
  _type: "POSSESSION";
  period: string; // "00-15", "15-30", etc.
  possession: number; // percentage
  score: {
    home: number;
    away: number;
  };
}

// ===== MATCH LOCATION ATTEMPTS =====
// Response from MatchLocationAttempts endpoint
export interface KorastatsMatchLocationAttempts {
  Data: Record<string, number>; // Grid position -> attempt count
  GridCenter: Record<string, { x: number; y: number }>; // Grid position -> coordinates
}

// ===== MATCH PLAYER HEATMAP =====
// Response from MatchPlayerHeatmap endpoint
export interface KorastatsMatchPlayerHeatmap {
  x: number;
  y: number;
  count: number;
}

// ===== MATCH VIDEO =====
// Response from MatchVideo endpoint
export interface KorastatsMatchVideo {
  _type: "MATCH_VIDEO";
  intMatchID: number;
  objMatch: {
    _type: "MATCH";
    strMatchName: string;
    dtKickoffDateTime: string;
    arrHalves: KorastatsMatchHalf[];
  };
}

export interface KorastatsMatchHalf {
  _type: "Half";
  intHalf: number;
  arrStreams: KorastatsMatchStream[];
}

export interface KorastatsMatchStream {
  _type: "STREAM";
  strName: string;
  intID: number;
  arrQualities: KorastatsMatchQuality[];
}

export interface KorastatsMatchQuality {
  _type: "QUALITY";
  strName: string;
  intID: number;
  intWidth: number;
  intHeight: number;
  strLink: string;
}

// ===== RESPONSE TYPE WRAPPERS =====
export type KorastatsMatchListResponse = KorastatsBaseResponse<KorastatsMatchListItem[]>;
export type KorastatsMatchSquadResponse = KorastatsBaseResponse<KorastatsMatchSquad[]>;
export type KorastatsMatchTimelineResponse =
  KorastatsBaseResponse<KorastatsMatchTimeline>;
export type KorastatsMatchSummaryResponse = KorastatsBaseResponse<KorastatsMatchSummary>;
export type KorastatsMatchFormationResponse =
  KorastatsBaseResponse<KorastatsMatchFormation>;
export type KorastatsMatchPlayersStatsResponse =
  KorastatsBaseResponse<KorastatsMatchPlayersStats>;
export type KorastatsMatchPlayerStatsResponse =
  KorastatsBaseResponse<KorastatsMatchPlayerStats>;
export type KorastatsMatchPossessionTimelineResponse =
  KorastatsBaseResponse<KorastatsMatchPossessionTimeline>;
export type KorastatsMatchLocationAttemptsResponse =
  KorastatsBaseResponse<KorastatsMatchLocationAttempts>;
export type KorastatsMatchPlayerHeatmapResponse = KorastatsBaseResponse<
  KorastatsMatchPlayerHeatmap[]
>;
export type KorastatsMatchVideoResponse = KorastatsBaseResponse<KorastatsMatchVideo>;

// ===== FILTER AND SEARCH PARAMETERS =====
// Parameters for filtering fixtures
export interface FixtureFilters {
  tournament_id?: number;
  season?: string;
  team_id?: number;
  date_from?: string; // "YYYY-MM-DD"
  date_to?: string; // "YYYY-MM-DD"
  round?: number;
  matchday?: number;
  status?: string;
  venue_id?: number;
}

// Parameters for match details
export interface MatchDetailsParams {
  match_id: number;
  include_events?: boolean;
  include_stats?: boolean;
  include_lineups?: boolean;
  include_player_stats?: boolean;
  since?: string; // "YYYY-MM-DD HH:MM:SS" for incremental updates
}

