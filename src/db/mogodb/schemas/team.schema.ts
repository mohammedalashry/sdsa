import { Schema } from "mongoose";
import {
  TeamLineup,
  GoalsOverTime,
  FormOverTime,
  TransferData,
  TeamStats,
} from "@/legacy-types/teams.types";

// Interface for TypeScript
export interface TeamInterface {
  // Korastats identifiers
  korastats_id: number;

  // Team info
  name: string;

  code?: string;
  logo: string;
  founded?: number;
  national: boolean;
  clubMarketValue?: string;
  totalPlayers: number;
  foreignPlayers: number;
  averagePlayerAge: number;
  // Location
  country: string;

  // Stadium
  venue: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    surface: string;
    city?: string;
    image?: string;
  };

  // Coaches (all coaches, not just current)
  coaches: Array<{
    id: number;
    name: string;
    current: boolean;
    photo: string;
  }>;

  // Team stats summary (denormalized)
  stats_summary: {
    gamesPlayed: { home: number; away: number };
    wins: { home: number; away: number };
    draws: { home: number; away: number };
    loses: { home: number; away: number };
    goalsScored: { home: number; away: number };
    goalsConceded: { home: number; away: number };
    goalDifference: number;
    cleanSheetGames: number;
  };
  lineup: TeamLineup;
  tournaments: {
    id: number;
    name: string;
    logo: string;
    season: number;
    current: boolean;
  }[];
  // Tournament-specific stats (array to support multiple tournaments/seasons)
  tournament_stats: TeamStats[];
  players: {
    id: number;
    name: string;
    photo: string;
    number: number;
    pos: string;
  }[];
  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const TeamSchema = new Schema<TeamInterface>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },

    code: {
      type: String,
    },
    logo: {
      type: String,
      required: true,
    },
    founded: {
      type: Number,
    },
    national: {
      type: Boolean,
      required: true,
      default: false,
    },
    country: {
      type: String,
      required: true,
    },

    stats_summary: {
      gamesPlayed: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      wins: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      draws: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      loses: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalsScored: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalsConceded: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalDifference: { type: Number, default: 0 },
      cleanSheetGames: { type: Number, default: 0 },
    },
    // Tournament-specific stats (array to support multiple tournaments/seasons)
    tournament_stats: [
      {
        league: {
          id: { type: Number, default: null },
          name: { type: String, default: null },
          logo: { type: String, default: null },
          flag: { type: String, default: null },
          season: { type: Number, default: null },
          country: { type: String, default: null },
        },
        rank: { type: Number, default: 0 },
        average_team_rating: { type: Number, default: 0 },
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        form: { type: String, default: "" },
        // Comprehensive stats from Korastats
        korastats_stats: {
          // Basic match stats
          matches_played: { type: Number, default: 0 },
          wins: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          losses: { type: Number, default: 0 },
          goals_scored: { type: Number, default: 0 },
          goals_conceded: { type: Number, default: 0 },
          assists: { type: Number, default: 0 },

          // Possession stats
          possession: { type: Number, default: 0 },
          possession_time: { type: Number, default: 0 },
          possession_time_percent: { type: Number, default: 0 },

          // Passing stats
          total_passes: { type: Number, default: 0 },
          success_passes: { type: Number, default: 0 },
          total_short_pass: { type: Number, default: 0 },
          success_short_pass: { type: Number, default: 0 },
          total_long_pass: { type: Number, default: 0 },
          success_long_pass: { type: Number, default: 0 },
          total_crosses: { type: Number, default: 0 },
          success_crosses: { type: Number, default: 0 },
          failed_crosses: { type: Number, default: 0 },

          // Attacking stats
          total_attempts: { type: Number, default: 0 },
          success_attempts: { type: Number, default: 0 },
          attempts_off_target: { type: Number, default: 0 },
          attempts_blocked: { type: Number, default: 0 },
          attempts_saved: { type: Number, default: 0 },
          attempts_on_bars: { type: Number, default: 0 },
          one_on_one_missed: { type: Number, default: 0 },

          // Goal scoring breakdown
          goals_scored_by_right_foot: { type: Number, default: 0 },
          goals_scored_by_left_foot: { type: Number, default: 0 },
          goals_scored_by_head: { type: Number, default: 0 },

          // Penalty stats
          penalty_committed: { type: Number, default: 0 },
          penalty_awarded: { type: Number, default: 0 },
          penalty_missed: { type: Number, default: 0 },
          penalty_scored: { type: Number, default: 0 },
          goals_saved: { type: Number, default: 0 },

          // Defensive stats
          tackle_won: { type: Number, default: 0 },
          tackle_fail: { type: Number, default: 0 },
          tackle_clear: { type: Number, default: 0 },
          intercept_won: { type: Number, default: 0 },
          intercept_clear: { type: Number, default: 0 },
          aerial_won: { type: Number, default: 0 },
          aerial_lost: { type: Number, default: 0 },
          ball_recover: { type: Number, default: 0 },
          clear: { type: Number, default: 0 },
          blocks: { type: Number, default: 0 },
          opportunity_save: { type: Number, default: 0 },

          // Dribbling stats
          dribble_success: { type: Number, default: 0 },
          dribble_fail: { type: Number, default: 0 },

          // Ball control stats
          total_ball_lost: { type: Number, default: 0 },
          total_ball_won: { type: Number, default: 0 },
          ball_lost_under_pressure: { type: Number, default: 0 },
          ball_received_success: { type: Number, default: 0 },
          ball_received_fail: { type: Number, default: 0 },

          // Discipline stats
          yellow_card: { type: Number, default: 0 },
          second_yellow_card: { type: Number, default: 0 },
          red_card: { type: Number, default: 0 },
          red_card_total: { type: Number, default: 0 },
          fouls_committed: { type: Number, default: 0 },
          fouls_awarded: { type: Number, default: 0 },
          fouls_committed_in_defensive_third: { type: Number, default: 0 },
          fouls_awarded_in_offensive_third: { type: Number, default: 0 },

          // Set pieces
          corners: { type: Number, default: 0 },
          offsides: { type: Number, default: 0 },
          success_open_play_crosses: { type: Number, default: 0 },
          total_open_play_crosses: { type: Number, default: 0 },
          success_set_piece_crosses: { type: Number, default: 0 },
          total_set_piece_crosses: { type: Number, default: 0 },
          direct_set_piece_goal_scored: { type: Number, default: 0 },

          // Throw-ins
          throw_in_total: { type: Number, default: 0 },
          throw_in_success: { type: Number, default: 0 },
          throw_in_cross_total: { type: Number, default: 0 },
          throw_in_cross_success: { type: Number, default: 0 },
          throw_in_long_pass_total: { type: Number, default: 0 },
          throw_in_long_pass_success: { type: Number, default: 0 },
          throw_in_short_pass_total: { type: Number, default: 0 },
          throw_in_short_pass_success: { type: Number, default: 0 },

          // Advanced analytics
          xg: { type: Number, default: 0 },
          xga: { type: Number, default: 0 },
          expected_threat: { type: Number, default: 0 },
          expected_threat_pass_success: { type: Number, default: 0 },
          expected_threat_pass_fail: { type: Number, default: 0 },
          expected_threat_sd: { type: Number, default: 0 },
          expected_threat_mean: { type: Number, default: 0 },
          expected_threat_rsd: { type: Number, default: 0 },
          expected_threat_positive_success: { type: Number, default: 0 },
          expected_threat_positive_fail: { type: Number, default: 0 },
          expected_threat_positive_total: { type: Number, default: 0 },
          expected_threat_negative_success: { type: Number, default: 0 },
          expected_threat_negative_fail: { type: Number, default: 0 },
          expected_threat_negative_total: { type: Number, default: 0 },

          // Chances and key passes
          chance_created: { type: Number, default: 0 },
          chances_created_open_play: { type: Number, default: 0 },
          chances_created_set_pieces: { type: Number, default: 0 },
          key_passes: { type: Number, default: 0 },

          // Time-based stats
          minutes_played: { type: Number, default: 0 },
          suspicious_time: { type: Number, default: 0 },

          // Possession by time periods
          possession_0_15: { type: Number, default: 0 },
          possession_15_30: { type: Number, default: 0 },
          possession_30_45: { type: Number, default: 0 },
          possession_45_60: { type: Number, default: 0 },
          possession_60_75: { type: Number, default: 0 },
          possession_75_90: { type: Number, default: 0 },

          // Goals by time periods
          goals_scored_0_15: { type: Number, default: 0 },
          goals_scored_15_30: { type: Number, default: 0 },
          goals_scored_30_45: { type: Number, default: 0 },
          goals_scored_45_60: { type: Number, default: 0 },
          goals_scored_60_75: { type: Number, default: 0 },
          goals_scored_75_90: { type: Number, default: 0 },

          // Possession time by periods
          possession_time_0_15: { type: Number, default: 0 },
          possession_time_15_30: { type: Number, default: 0 },
          possession_time_30_45: { type: Number, default: 0 },
          possession_time_45_60: { type: Number, default: 0 },
          possession_time_60_75: { type: Number, default: 0 },
          possession_time_75_90: { type: Number, default: 0 },
          possession_time_90_105: { type: Number, default: 0 },
          possession_time_105_120: { type: Number, default: 0 },

          // Possession time percent by periods
          possession_time_percent_0_15: { type: Number, default: 0 },
          possession_time_percent_15_30: { type: Number, default: 0 },
          possession_time_percent_30_45: { type: Number, default: 0 },
          possession_time_percent_45_60: { type: Number, default: 0 },
          possession_time_percent_60_75: { type: Number, default: 0 },
          possession_time_percent_75_90: { type: Number, default: 0 },
          possession_time_percent_90_105: { type: Number, default: 0 },
          possession_time_percent_105_120: { type: Number, default: 0 },

          // Advanced metrics
          pass_per_defensive_action: { type: Number, default: 0 },
          clean_sheet: { type: Number, default: 0 },
          matches_played_as_lineup: { type: Number, default: 0 },
        },

        // Legacy stats structure (for backward compatibility)
        team_attacking: {
          penalty_goals: { type: String, default: "0" },
          goals_per_game: { type: Number, default: 0 },
          free_kick_goals: { type: String, default: "0" },
          left_foot_goals: { type: Number, default: 0 },
          right_foot_goals: { type: Number, default: 0 },
          headed_goals: { type: Number, default: 0 },
          big_chances_per_game: { type: Number, default: 0 },
          big_chances_missed_per_game: { type: Number, default: 0 },
          total_shots_per_game: { type: Number, default: 0 },
          shots_on_target_per_game: { type: Number, default: 0 },
          shots_off_target_per_game: { type: Number, default: 0 },
          blocked_shots_per_game: { type: Number, default: 0 },
          successful_dribbles_per_game: { type: Number, default: 0 },
          corners_per_game: { type: Number, default: 0 },
          free_kicks_per_game: { type: Number, default: 0 },
          hit_woodwork: { type: Number, default: 0 },
          counter_attacks: { type: Number, default: 0 },
        },
        team_defending: {
          clean_sheets: { type: Number, default: 0 },
          goals_conceded_per_game: { type: Number, default: 0 },
          tackles_per_game: { type: Number, default: 0 },
          interceptions_per_game: { type: Number, default: 0 },
          clearances_per_game: { type: Number, default: 0 },
          saves_per_game: { type: Number, default: 0 },
          balls_recovered_per_game: { type: Number, default: 0 },
          errors_leading_to_shot: { type: Number, default: 0 },
          errors_leading_to_goal: { type: Number, default: 0 },
          penalties_committed: { type: Number, default: 0 },
          penalty_goals_conceded: { type: Number, default: 0 },
          clearance_off_line: { type: Number, default: 0 },
          last_man_tackle: { type: Number, default: 0 },
        },
        team_passing: {
          ball_possession: { type: String, default: "0%" },
          accurate_per_game: { type: String, default: "0" },
          acc_own_half: { type: String, default: "0%" },
          acc_opposition_half: { type: String, default: "0%" },
          acc_long_balls: { type: String, default: "0%" },
          acc_crosses: { type: String, default: "0%" },
        },
        team_others: {
          duels_won_per_game: { type: String, default: "0" },
          ground_duels_won: { type: String, default: "0%" },
          aerial_duels_won: { type: String, default: "0%" },
          possession_lost_per_game: { type: String, default: "0" },
          throw_ins_per_game: { type: String, default: "0" },
        },
        clean_sheet: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        goals: {
          for_: {
            total: {
              home: { type: Number, default: 0 },
              away: { type: Number, default: 0 },
              total: { type: Number, default: 0 },
            },
            average: {
              home: { type: Number, default: 0 },
              away: { type: Number, default: 0 },
              total: { type: Number, default: 0 },
            },
          },
          against: {
            total: {
              home: { type: Number, default: 0 },
              away: { type: Number, default: 0 },
              total: { type: Number, default: 0 },
            },
            average: {
              home: { type: Number, default: 0 },
              away: { type: Number, default: 0 },
              total: { type: Number, default: 0 },
            },
          },
        },
        biggest: {
          streak: {
            wins: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            loses: { type: Number, default: 0 },
          },
        },
        fixtures: {
          played: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
          wins: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
          draws: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
          loses: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
        },
      },
    ],
    venue: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      address: { type: String, required: true },
      capacity: { type: Number, required: true },
      surface: { type: String, required: true },
      city: { type: String, required: false },
      image: { type: String, required: false },
    },

    // Lineup data
    lineup: {
      formation: { type: String, required: true },
      coach: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        photo: { type: String, required: true },
      },
      team: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      startXI: [
        {
          player: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            photo: { type: String, required: true },
            number: { type: Number, required: true },
            pos: { type: String, required: true },
            grid: { type: String, required: true },
            rating: { type: String, required: true },
          },
        },
      ],
      substitutes: [
        {
          player: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            photo: { type: String, required: true },
            number: { type: Number, required: true },
            pos: { type: String, required: true },
            grid: { type: String, required: true },
            rating: { type: String, required: true },
          },
        },
      ],
    },

    tournaments: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        season: { type: Number, required: true },
        current: { type: Boolean, required: true },
      },
    ],
    coaches: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        current: { type: Boolean, required: true },
        photo: { type: String, required: true },
      },
    ],
    players: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        photo: { type: String, required: true },
        number: { type: Number, required: true },
        pos: { type: String, required: true },
      },
    ],
    totalPlayers: {
      type: Number,
      required: true,
      default: 0,
    },
    foreignPlayers: {
      type: Number,
      default: 0,
    },

    clubMarketValue: {
      type: String,
    },

    averagePlayerAge: {
      type: Number,
      required: true,
      default: 0,
    },
    last_synced: {
      type: Date,
      default: Date.now,
    },
    sync_version: {
      type: Number,
      default: 1,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "teams",
  },
);

// Indexes for performance
TeamSchema.index({ name: 1 });
TeamSchema.index({ country: 1 });
TeamSchema.index({ "coaches.id": 1 });
TeamSchema.index({ "stats.league.id": 1 });
TeamSchema.index({ "lineup.team.id": 1 });
TeamSchema.index({ "tournaments.id": 1 });
TeamSchema.index({ "tournaments.id": 1, "tournaments.season": 1 });
TeamSchema.index({ "players.id": 1 });
export default TeamSchema;

