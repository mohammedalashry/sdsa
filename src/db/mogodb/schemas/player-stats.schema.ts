// src/db/mogodb/schemas/player-stats.schema.ts
// Player Stats MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface IPlayerStats extends Document {
  _id: Types.ObjectId;

  // Identifiers
  player_id: number;
  match_id: number;
  tournament_id: number;
  team_id: number;
  season: string;

  // Match context
  match_date: Date;
  opponent_team_id: number;
  is_home: boolean;

  // Performance stats (embedded for fast access)
  performance: {
    // Basic stats
    minutes_played: number;
    position_played: string;
    rating?: number;

    // Goals & Assists
    goals: number;
    assists: number;

    // Shots
    shots: {
      total: number;
      on_target: number;
      off_target: number;
      blocked: number;
    };

    // Passing
    passes: {
      total: number;
      accurate: number;
      accuracy_percentage: number;
      key_passes: number;
    };

    // Defensive
    defensive: {
      tackles: { attempted: number; successful: number };
      interceptions: number;
      clearances: number;
      blocks: number;
    };

    // Discipline
    cards: {
      yellow: number;
      red: number;
    };

    // Advanced metrics
    xG?: number;
    xA?: number;
    distance_covered?: number;
  };

  // Goalkeeper specific (if applicable)
  goalkeeper_stats?: {
    saves: number;
    goals_conceded: number;
    clean_sheet: boolean;
    penalties_saved?: number;
  };

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const PlayerStatsSchema = new Schema<IPlayerStats>(
  {
    player_id: {
      type: Number,
      required: true,
      index: true,
    },
    match_id: {
      type: Number,
      required: true,
      index: true,
    },
    tournament_id: {
      type: Number,
      required: true,
      index: true,
    },
    team_id: {
      type: Number,
      required: true,
      index: true,
    },
    season: {
      type: String,
      required: true,
      index: true,
    },
    match_date: {
      type: Date,
      required: true,
      index: true,
    },
    opponent_team_id: {
      type: Number,
      required: true,
      index: true,
    },
    is_home: {
      type: Boolean,
      required: true,
      index: true,
    },
    performance: {
      minutes_played: { type: Number, default: 0 },
      position_played: { type: String, required: true },
      rating: { type: Number },
      goals: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      shots: {
        total: { type: Number, default: 0 },
        on_target: { type: Number, default: 0 },
        off_target: { type: Number, default: 0 },
        blocked: { type: Number, default: 0 },
      },
      passes: {
        total: { type: Number, default: 0 },
        accurate: { type: Number, default: 0 },
        accuracy_percentage: { type: Number, default: 0 },
        key_passes: { type: Number, default: 0 },
      },
      defensive: {
        tackles: {
          attempted: { type: Number, default: 0 },
          successful: { type: Number, default: 0 },
        },
        interceptions: { type: Number, default: 0 },
        clearances: { type: Number, default: 0 },
        blocks: { type: Number, default: 0 },
      },
      cards: {
        yellow: { type: Number, default: 0 },
        red: { type: Number, default: 0 },
      },
      xG: { type: Number },
      xA: { type: Number },
      distance_covered: { type: Number },
    },
    goalkeeper_stats: {
      saves: { type: Number, default: 0 },
      goals_conceded: { type: Number, default: 0 },
      clean_sheet: { type: Boolean, default: false },
      penalties_saved: { type: Number, default: 0 },
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
    collection: "player_stats",
  },
);

// Indexes for performance
PlayerStatsSchema.index({ player_id: 1, match_date: -1 });
PlayerStatsSchema.index({ match_id: 1, player_id: 1 });
PlayerStatsSchema.index({ tournament_id: 1, season: 1, player_id: 1 });
PlayerStatsSchema.index({ team_id: 1, match_date: -1 });
PlayerStatsSchema.index({ opponent_team_id: 1, match_date: -1 });
PlayerStatsSchema.index({ season: 1, player_id: 1 });

export default PlayerStatsSchema;

