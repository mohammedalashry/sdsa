// src/db/mogodb/schemas/referee.schema.ts
// Referee MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface IReferee extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  firstname?: string;
  lastname?: string;
  nationality: {
    id: number;
    name: string;
  };
  age?: number;

  // Referee info
  referee_type: "referee" | "assistant" | "fourth_official" | "var";
  experience_years?: number;
  fifa_badge?: boolean;
  confederation?: string;

  // Career stats (denormalized)
  career_stats: {
    total_matches: number;
    total_yellow_cards: number;
    total_red_cards: number;
    total_penalties: number;
    average_cards_per_match: number;
    current_season_matches: number;
    current_season_yellow_cards: number;
    current_season_red_cards: number;
    current_season_penalties: number;
  };

  // Recent matches (embedded for quick access)
  recent_matches: Array<{
    match_id: number;
    date: Date;
    home_team: string;
    away_team: string;
    competition: string;
    yellow_cards: number;
    red_cards: number;
    penalties: number;
  }>;

  // Status
  status: "active" | "inactive" | "retired";

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const RefereeSchema = new Schema<IReferee>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    nationality: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
    },
    age: {
      type: Number,
    },
    referee_type: {
      type: String,
      required: true,
      enum: ["referee", "assistant", "fourth_official", "var"],
      default: "referee",
      index: true,
    },
    experience_years: {
      type: Number,
    },
    fifa_badge: {
      type: Boolean,
      default: false,
    },
    confederation: {
      type: String,
    },
    career_stats: {
      total_matches: { type: Number, default: 0 },
      total_yellow_cards: { type: Number, default: 0 },
      total_red_cards: { type: Number, default: 0 },
      total_penalties: { type: Number, default: 0 },
      average_cards_per_match: { type: Number, default: 0 },
      current_season_matches: { type: Number, default: 0 },
      current_season_yellow_cards: { type: Number, default: 0 },
      current_season_red_cards: { type: Number, default: 0 },
      current_season_penalties: { type: Number, default: 0 },
    },
    recent_matches: [
      {
        match_id: { type: Number, required: true },
        date: { type: Date, required: true },
        home_team: { type: String, required: true },
        away_team: { type: String, required: true },
        competition: { type: String, required: true },
        yellow_cards: { type: Number, default: 0 },
        red_cards: { type: Number, default: 0 },
        penalties: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "retired"],
      default: "active",
      index: true,
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
    collection: "referees",
  },
);

// Indexes for performance
RefereeSchema.index({ korastats_id: 1 });
RefereeSchema.index({ name: 1 });
RefereeSchema.index({ "nationality.id": 1 });
RefereeSchema.index({ referee_type: 1 });
RefereeSchema.index({ status: 1 });
RefereeSchema.index({ "recent_matches.match_id": 1 });
RefereeSchema.index({ "recent_matches.date": -1 });

export default RefereeSchema;

