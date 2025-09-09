// src/db/mogodb/schemas/team-stats.schema.ts
// Team Stats MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ITeamStats extends Document {
  _id: Types.ObjectId;

  // Identifiers
  team_id: number;
  match_id?: number; // Optional for aggregated stats
  tournament_id?: number; // Optional for aggregated stats
  season: string;

  // Team info (for quick access)
  team_name?: string;

  // Match context (optional for aggregated stats)
  match_date?: Date;
  opponent_team_id?: number;
  is_home?: boolean;

  // Detailed stats from KoraStats (array of stat objects)
  detailed_stats: Array<{
    id: number;
    stat: string;
    value: number;
  }>;

  // Aggregated stats for team endpoints (calculated from detailed_stats)
  stats?: {
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
    position: number;
  };

  // Form data (last 5 matches)
  form?: {
    recent_results: string[]; // ["W", "L", "D", "W", "W"]
    form_string: string; // "WLDWW"
    points_from_last_5: number;
  };

  // Goals breakdown
  goals?: {
    total_for: number;
    total_against: number;
    home_for: number;
    home_against: number;
    away_for: number;
    away_against: number;
  };

  // Cards breakdown
  cards?: {
    total_yellow: number;
    total_red: number;
    home_yellow: number;
    home_red: number;
    away_yellow: number;
    away_red: number;
  };

  // Recent matches (last 5)
  recent_matches?: Array<{
    match_id: number;
    date: Date;
    opponent: string;
    result: string; // "W", "L", "D"
    score: string; // "2-1"
    is_home: boolean;
  }>;

  // Team performance (embedded) - for individual match stats
  performance?: {
    // Possession
    possession: number;

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
    };

    // Attacks
    attacks: {
      total: number;
      dangerous: number;
    };

    // Set pieces
    corners: number;
    free_kicks: number;
    penalties: number;

    // Discipline
    cards: {
      yellow: number;
      red: number;
    };

    // Fouls
    fouls: {
      committed: number;
      awarded: number;
    };
  };

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const TeamStatsSchema = new Schema<ITeamStats>(
  {
    team_id: {
      type: Number,
      required: true,
      index: true,
    },
    match_id: {
      type: Number,
      index: true,
    },
    tournament_id: {
      type: Number,
      index: true,
    },
    season: {
      type: String,
      required: true,
      index: true,
    },
    team_name: {
      type: String,
    },
    match_date: {
      type: Date,
      index: true,
    },
    opponent_team_id: {
      type: Number,
      index: true,
    },
    is_home: {
      type: Boolean,
      index: true,
    },
    detailed_stats: [
      {
        id: { type: Number, required: true },
        stat: { type: String, required: true },
        value: { type: Number, required: true },
      },
    ],
    stats: {
      matches_played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      goals_for: { type: Number, default: 0 },
      goals_against: { type: Number, default: 0 },
      goal_difference: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
      position: { type: Number, default: 0 },
    },
    form: {
      recent_results: [{ type: String }],
      form_string: { type: String, default: "" },
      points_from_last_5: { type: Number, default: 0 },
    },
    goals: {
      total_for: { type: Number, default: 0 },
      total_against: { type: Number, default: 0 },
      home_for: { type: Number, default: 0 },
      home_against: { type: Number, default: 0 },
      away_for: { type: Number, default: 0 },
      away_against: { type: Number, default: 0 },
    },
    cards: {
      total_yellow: { type: Number, default: 0 },
      total_red: { type: Number, default: 0 },
      home_yellow: { type: Number, default: 0 },
      home_red: { type: Number, default: 0 },
      away_yellow: { type: Number, default: 0 },
      away_red: { type: Number, default: 0 },
    },
    recent_matches: [
      {
        match_id: { type: Number },
        date: { type: Date },
        opponent: { type: String },
        result: { type: String },
        score: { type: String },
        is_home: { type: Boolean },
      },
    ],
    performance: {
      possession: { type: Number, default: 50 },
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
      },
      attacks: {
        total: { type: Number, default: 0 },
        dangerous: { type: Number, default: 0 },
      },
      corners: { type: Number, default: 0 },
      free_kicks: { type: Number, default: 0 },
      penalties: { type: Number, default: 0 },
      cards: {
        yellow: { type: Number, default: 0 },
        red: { type: Number, default: 0 },
      },
      fouls: {
        committed: { type: Number, default: 0 },
        awarded: { type: Number, default: 0 },
      },
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
    timestamps: { createdAt: "created_at", updatedAt: "updatedAt" },
    collection: "team_stats",
  },
);

// Indexes for performance
TeamStatsSchema.index({ team_id: 1, match_date: -1 });
TeamStatsSchema.index({ match_id: 1, team_id: 1 });
TeamStatsSchema.index({ tournament_id: 1, season: 1, team_id: 1 });
TeamStatsSchema.index({ opponent_team_id: 1, match_date: -1 });
TeamStatsSchema.index({ season: 1, team_id: 1 });

export default TeamStatsSchema;

