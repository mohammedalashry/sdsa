// src/integrations/korastats/types/coach.types.ts
// Korastats API response types for coach-related endpoints

// Base response wrapper for Korastats API
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}

// ===== TOURNAMENT COACH LIST =====
// Response from TournamentCoachList endpoint
export interface KorastatsTournamentCoachList {
  _type: "COACH";
  id: number;
  name: string;
  dob: string;
  nationality: {
    _type: "NATIONALITY";
    id: number;
    name: string;
  };
  gender: string;
  retired: boolean;
  stats: KorastatsCoachStats;
}

export interface KorastatsCoachStats {
  Admin: {
    Corners: number;
    Offside: number;
    MatchesPlayed: number;
    Win: number;
    Draw: number;
    Lost: number;
  };
  Cards: {
    Yellow: number;
    SecondYellow: number;
    Red: number;
  };
  Fouls: {
    Awarded: number;
    CommittedInDefensiveThird: number;
    AwardedInOffensiveThird: number;
    Committed: number;
  };
  GoalsConceded: {
    OwnGoals: number;
    Total: number;
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
  };
  Penalty: {
    Committed: number;
    Awarded: number;
  };
  GoalsScored: {
    Total: number;
    OwnGoals: number;
    T_0_15: number;
    T_15_30: number;
    T_30_45: number;
    T_45_60: number;
    T_60_75: number;
    T_75_90: number;
    T_90_105: number;
    T_105_120: number;
    Head: number;
    RightFoot: number;
    LeftFoot: number;
    Other: number;
    XG: number;
    SetPiece: number;
    PenaltyScored: number;
  };
  Defensive: {
    Blocks: number;
    OpportunitySaved: number;
    Cleansheet: number;
    TackleFail: number;
    TackleClear: number;
    InterceptionClear: number;
    Clear: number;
    GoalsSaved: number;
  };
  BallWon: {
    TackleWon: number;
    InterceptionWon: number;
    Aerial: number;
    BallRecover: number;
    Total: number;
  };
  BallLost: {
    Total: number;
    Aerial: number;
    UnderPressure: number;
  };
  BallReceive: {
    Fail: number;
    Success: number;
  };
  Dribble: {
    Success: number;
    Fail: number;
  };
  Chances: {
    KeyPasses: number;
    Assists: number;
    ChancesCreated: number;
  };
  Attempts: {
    Total: number;
    PenaltyMissed: number;
    Success: number;
    Bars: number;
    OneOnOneMissed: number;
    AttemptToScore: number;
    SuccessAttemptToScore: number;
    Accuracy: number;
  };
  Cross: {
    Success: number;
    Total: number;
    Accuracy: number;
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
  };
  ShortPass: {
    Total: number;
    Success: number;
    Accuracy: number;
  };
  Pass: {
    Accuracy: number;
    Success: number;
    Total: number;
  };
  LongPass: {
    Success: number;
    Total: number;
    Accuracy: number;
  };
}

// ===== ENTITY COACH =====
// Response from EntityCoach endpoint
export interface KorastatsEntityCoach {
  _type: "COACH";
  id: number;
  fullname: string;
  nationality: {
    id: number;
    name: string;
  };
  dob: string;
  age: string; //"no. Y"
  retired: boolean;
  gender: string;
  image: string;
  last_updated: string;
}

// ===== RESPONSE TYPE WRAPPERS =====
export type KorastatsTournamentCoachListResponse = KorastatsBaseResponse<
  KorastatsTournamentCoachList[]
>;
export type KorastatsEntityCoachResponse = KorastatsBaseResponse<KorastatsEntityCoach>;

