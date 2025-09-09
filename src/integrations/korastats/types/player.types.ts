// src/integrations/korastats/types/player.types.ts
// Korastats API response types for player-related endpoints

// Base response wrapper for Korastats API
export interface KorastatsBaseResponse<T> {
  result: string; // "Success" or "Error"
  message: string;
  data: T;
}

// ===== PLAYER INFO =====
// Response from PlayerInfo endpoint
export interface KorastatsPlayerInfo {
  _type: "PLAYER INFO";
  matches: KorastatsPlayerMatchInfo[];
}

export interface KorastatsPlayerMatchInfo {
  intID: number;
  strMatchName: string;
  intStadiumID: number;
  intHomeTeamID: number;
  intHomeCoachID: number;
  intAwayTeamID: number;
  intAwayCoachID: number;
  intHomeTeamScore: number | null;
  intAwayTeamScore: number | null;
  intPenaltyShootoutHomeScore: number | null;
  intPenaltyShootoutAwayScore: number | null;
  strHomeTeamColor: string;
  strAwayTeamColor: string;
  intRefereeID: number;
  intFourthOfficialID: number;
  intAssistant1ID: number;
  intAssistant2ID: number;
  dtDateTime: string;
  strNotes: string;
  dtTimestamp: string;
  intUserID: number;
  boolExtraTime: boolean;
  objHomeTeam: KorastatsTeamInPlayerInfo;
  objAwayTeam: KorastatsTeamInPlayerInfo;
  objStadium: KorastatsStadiumInPlayerInfo;
  objReferee: KorastatsRefereeInPlayerInfo;
  objFourthOfficial: KorastatsRefereeInPlayerInfo;
  objAssistant1: KorastatsAssistantInPlayerInfo;
  objAssistant2: KorastatsAssistantInPlayerInfo;
  objHomeCoach: KorastatsCoachInPlayerInfo;
  objAwayCoach: KorastatsCoachInPlayerInfo;
  objStatus: KorastatsMatchStatusInPlayerInfo;
}

export interface KorastatsTeamInPlayerInfo {
  intID: number;
  intCountryID: number;
  intClubID: number;
  intStadiumID: number;
  intCoachID: number;
  strTeamNameAr: string;
  strTeamNameEn: string;
  strGender: string;
  dtLastUpdated: string;
  intUserID: number;
  boolNationalTeam: boolean;
}

export interface KorastatsStadiumInPlayerInfo {
  intID: number;
  intCountryID: number;
  intCityID: number;
  strStadiumNameAr: string;
  strStadiumNameEn: string;
  intCapacity: string;
  intEstablishYear: string | null;
  intWidth: number | null;
  intHeight: number | null;
  dtLastUpdated: string | null;
  intUserID: number | null;
}

export interface KorastatsRefereeInPlayerInfo {
  intID: number;
  strRefereeNameAr: string;
  strRefereeNameEn: string;
  intNationalityID: number;
  dtDOB: string | null;
  strGender: string;
  boolRetired: boolean;
  dtLastUpdated: string | null;
  intUserID: number | null;
}

export interface KorastatsAssistantInPlayerInfo {
  intID: string;
  strAssistantNameAr: string;
  strAssistantNameEn: string;
  intNationalityID: string;
  strGender: string;
  dtDOB: string | null;
  boolRetired: boolean;
  dtLastUpdated: string | null;
  intUserID: number | null;
}

export interface KorastatsCoachInPlayerInfo {
  intID: number;
  strCoachNameAr: string;
  strCoachNameEn: string;
  strNickNameAr: string | null;
  strNickNameEn: string | null;
  intNationalityID: number;
  strGender: string;
  dtDOB: string;
  boolRetired: boolean;
  dtLastUpdated: string | null;
  intUserID: number | null;
}

export interface KorastatsMatchStatusInPlayerInfo {
  intMatchID: number;
  intStatusID: number;
  intUserID: string;
  dtTimestamp: string;
  objStatus: {
    intID: string;
    strMatchStatus: string;
    arrNextMatchStatus: string[];
    arrAllowedActivity: string[];
  };
}

// ===== ENTITY PLAYER =====
// Response from EntityPlayer endpoint
export interface KorastatsEntityPlayer {
  _type: "PLAYER";
  id: number;
  fullname: string;
  nickname: string;
  nationality: {
    id: number;
    name: string;
  };
  dob: string;
  age: string;
  positions: {
    primary: {
      id: number;
      name: string;
    };
    secondary: {
      id: number;
      name: string;
    };
  };
  retired: boolean;
  current_team: {
    id: number | null;
    name: string | null;
  };
  gender: string;
  image: string;
  last_updated: string;
}

// ===== TOURNAMENT PLAYER STATS =====
// Response from TournamentPlayerStats endpoint
export interface KorastatsTournamentPlayerStats {
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
  stats: KorastatsPlayerTournamentStats;
}

export interface KorastatsPlayerTournamentStats {
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

// ===== SEASON PLAYER TOP STATS =====
// Response from SeasonPlayerTopStats endpoint
export interface KorastatsSeasonPlayerTopStats {
  _type: "PLAYER";
  id: number;
  name: string;
  nickname: string;
  team: {
    _type: "TEAM";
    id: number;
    name: string;
  };
  stat_value: number;
  rank: number;
}

// ===== LIST STAT TYPES =====
// Response from ListStatTypes endpoint
export interface KorastatsStatType {
  _type: "STAT";
  id: number;
  stat: string;
  value: number;
}

// ===== RESPONSE TYPE WRAPPERS =====
export type KorastatsPlayerInfoResponse = KorastatsBaseResponse<KorastatsPlayerInfo>;
export type KorastatsEntityPlayerResponse = KorastatsBaseResponse<KorastatsEntityPlayer>;
export type KorastatsTournamentPlayerStatsResponse = KorastatsBaseResponse<
  KorastatsTournamentPlayerStats[]
>;
export type KorastatsSeasonPlayerTopStatsResponse = KorastatsBaseResponse<
  KorastatsSeasonPlayerTopStats[]
>;
export type KorastatsListStatTypesResponse = KorastatsBaseResponse<KorastatsStatType[]>;

