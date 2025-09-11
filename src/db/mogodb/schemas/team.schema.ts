// src/db/mogodb/schemas/team.schema.ts
// Team MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string;
}
// Interface for TypeScript
export interface ITeam extends Document {
  _id: Types.ObjectId;

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
  rank: number;
  // Location
  country: string;

  // Stadium
  venue: {
    id: number;
    name: string;
    capacity: number;
    surface: string;
    city?: string;
    image?: string;
    address?: string;
  };

  // Current squad (embedded for quick access)
  lineup: {
    formation: string;
    startXI: LineupPlayer[];
    substitutes: LineupPlayer[];
  };

  // Coaches (all coaches, not just current)
  coaches: Array<{
    id: number;
    name: string;
    current: boolean;
  }>;

  // Trophies
  trophies?: Array<{
    league: string;
    country: string;
    season: string;
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
  stats: {
    team_attacking: {
      penalty_goals: string;
      goals_per_game: number;
      free_kick_goals: string;
      left_foot_goals: number;
      right_foot_goals: number;
      headed_goals: number;
      big_chances_per_game: number;
      big_chances_missed_per_game: number;
      total_shots_per_game: number;
      shots_on_target_per_game: number;
      shots_off_target_per_game: number;
      blocked_shots_per_game: number;
      successful_dribbles_per_game: number;
      corners_per_game: number;
      free_kicks_per_game: number;
      hit_woodwork: number;
      counter_attacks: number;
    };
    team_defending: {
      clean_sheets: number;
      goals_conceded_per_game: number;
      tackles_per_game: number;
      interceptions_per_game: number;
      clearances_per_game: number;
      saves_per_game: number;
      balls_recovered_per_game: number;
      errors_leading_to_shot: number;
      errors_leading_to_goal: number;
      penalties_committed: number;
      penalty_goals_conceded: number;
      clearance_off_line: number;
      last_man_tackle: number;
    };
    team_passing: {
      ball_possession: string;
      accurate_per_game: string;
      acc_own_half: string;
      acc_opposition_half: string;
      acc_long_balls: string;
      acc_crosses: string;
    };
    team_others: {
      duels_won_per_game: string;
      ground_duels_won: string;
      aerial_duels_won: string;
      possession_lost_per_game: string;
      throw_ins_per_game: string;
      goal_kicks_per_game: string;
      offsides_per_game: string;
      fouls_per_game: string;
      yellow_cards_per_game: string;
      red_cards: string;
    };
  };
  //
  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const TeamSchema = new Schema<ITeam>(
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
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      loses: { type: Number, default: 0 },
      goalsScored: { type: Number, default: 0 },
      goalsConceded: { type: Number, default: 0 },
      goalDifference: { type: Number, default: 0 },
      cleanSheetGames: { type: Number, default: 0 },
    },
    stats: {
      team_attacking: {
        penalty_goals: { type: String },
        goals_per_game: { type: Number },
        free_kick_goals: { type: String },
        left_foot_goals: { type: Number },
        right_foot_goals: { type: Number },
        headed_goals: { type: Number },
        big_chances_per_game: { type: Number },
        big_chances_missed_per_game: { type: Number },
        total_shots_per_game: { type: Number },
        shots_on_target_per_game: { type: Number },
        shots_off_target_per_game: { type: Number },
        blocked_shots_per_game: { type: Number },
        successful_dribbles_per_game: { type: Number },
        corners_per_game: { type: Number },
        free_kicks_per_game: { type: Number },
        hit_woodwork: { type: Number },
        counter_attacks: { type: Number },
      },
      team_defending: {
        clean_sheets: { type: Number },
        goals_conceded_per_game: { type: Number },
        tackles_per_game: { type: Number },
        interceptions_per_game: { type: Number },
        clearances_per_game: { type: Number },
        saves_per_game: { type: Number },
        balls_recovered_per_game: { type: Number },
        errors_leading_to_shot: { type: Number },
        errors_leading_to_goal: { type: Number },
        penalties_committed: { type: Number },
        penalty_goals_conceded: { type: Number },
        clearance_off_line: { type: Number },
        last_man_tackle: { type: Number },
      },
      team_passing: {
        ball_possession: { type: String },
        accurate_per_game: { type: String },
        acc_own_half: { type: String },
        acc_opposition_half: { type: String },
        acc_long_balls: { type: String },
        acc_crosses: { type: String },
      },
      team_others: {
        duels_won_per_game: { type: String },
        ground_duels_won: { type: String },
        aerial_duels_won: { type: String },
        possession_lost_per_game: { type: String },
        throw_ins_per_game: { type: String },
      },
    },
    venue: {
      id: { type: Number },
      name: { type: String },
      capacity: { type: Number },
      surface: { type: String },
      city: { type: String },
      image: { type: String },
      address: { type: String },
    },
    lineup: {
      formation: { type: String },
      startXI: { type: Array<LineupPlayer> },
      substitutes: { type: Array<LineupPlayer> },
    },
    coaches: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        current: { type: Boolean, required: true },
      },
    ],
    trophies: [
      {
        league: { type: String, required: true },
        country: { type: String, required: true },
        season: { type: String, required: true },
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
    rank: {
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
TeamSchema.index({ korastats_id: 1 });
TeamSchema.index({ name: 1 });
TeamSchema.index({ country: 1 });
TeamSchema.index({ "venue.id": 1 });
TeamSchema.index({ "coaches.id": 1 });
TeamSchema.index({ national: 1 });

export default TeamSchema;

