import { League } from "./leagues.types";
import { Team } from "./teams.types";

interface TeamStatsData {
  league: League;
  team: Team;
  form: string | null;
  fixtures: {
    played: {
      home: number;
      away: number;
      total: number;
    };
    wins: {
      home: number;
      away: number;
      total: number;
    };
    draws: {
      home: number;
      away: number;
      total: number;
    };
    loses: {
      home: number;
      away: number;
      total: number;
    };
  };
  goals: {
    for: {
      total: {
        home: number | null;
        away: number | null;
        total: number | null;
      };
      average: {
        home: string | null;
        away: string | null;
        total: string | null;
      };
      minute: Record<
        string,
        {
          total: number | null;
          percentage: string | null;
        }
      >;
    };
    against: {
      total: {
        home: number | null;
        away: number | null;
        total: number | null;
      };
      average: {
        home: string | null;
        away: string | null;
        total: string | null;
      };
      minute: Record<
        string,
        {
          total: number | null;
          percentage: string | null;
        }
      >;
    };
  };
  biggest: {
    streak: {
      wins: number | null;
      draws: number | null;
      loses: number | null;
    };
    wins: {
      home: string | null;
      away: string | null;
    };
    loses: {
      home: string | null;
      away: string | null;
    };
    goals: {
      for: {
        home: number | null;
        away: number | null;
      };
      against: {
        home: number | null;
        away: number | null;
      };
    };
  };
  clean_sheet: {
    home: number | null;
    away: number | null;
    total: number | null;
  };
  failed_to_score: {
    home: number | null;
    away: number | null;
    total: number | null;
  };
  penalty: {
    scored: {
      total: number | null;
      percentage: string | null;
    };
    missed: {
      total: number | null;
      percentage: string | null;
    };
    total: number | null;
  };
  lineups: Array<{
    formation: string;
    played: number;
  }>;
  cards: {
    yellow: Record<
      string,
      {
        total: number | null;
        percentage: string | null;
      }
    >;
    red: Record<
      string,
      {
        total: number | null;
        percentage: string | null;
      }
    >;
  };
}

export interface TeamComparisonStats {
  team: Team;
  stats?: TeamStatsData;
}

export type TeamStatsDataResponse = TeamStatsData[];

