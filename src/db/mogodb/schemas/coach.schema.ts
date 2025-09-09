// src/db/mogodb/schemas/coach.schema.ts
// Coach MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ICoach extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  nationality: {
    id: number;
    name: string;
  };
  height?: number;
  weight?: number;

  // Career info
  current_team?: {
    id: number;
    name: string;
    logo?: string;
    appointed_date?: Date;
  };

  // Career history (embedded for quick access)
  career_history: Array<{
    team_id: number;
    team_name: string;
    position: string;
    start_date: Date;
    end_date?: Date;
    is_current: boolean;
  }>;

  // Coaching stats summary (denormalized)
  coaching_stats: {
    total_matches: number;
    total_wins: number;
    total_draws: number;
    total_losses: number;
    win_percentage: number;
    current_team_matches: number;
    current_team_wins: number;
    current_team_draws: number;
    current_team_losses: number;
  };

  // Trophies and achievements
  trophies: Array<{
    id: number;
    name: string;
    season: string;
    team_id: number;
    team_name: string;
    competition: string;
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
const CoachSchema = new Schema<ICoach>(
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
    age: {
      type: Number,
    },
    nationality: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
    },
    height: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    current_team: {
      id: { type: Number },
      name: { type: String },
      logo: { type: String },
      appointed_date: { type: Date },
    },
    career_history: [
      {
        team_id: { type: Number, required: true },
        team_name: { type: String, required: true },
        position: { type: String, required: true },
        start_date: { type: Date, required: true },
        end_date: { type: Date },
        is_current: { type: Boolean, default: false },
      },
    ],
    coaching_stats: {
      total_matches: { type: Number, default: 0 },
      total_wins: { type: Number, default: 0 },
      total_draws: { type: Number, default: 0 },
      total_losses: { type: Number, default: 0 },
      win_percentage: { type: Number, default: 0 },
      current_team_matches: { type: Number, default: 0 },
      current_team_wins: { type: Number, default: 0 },
      current_team_draws: { type: Number, default: 0 },
      current_team_losses: { type: Number, default: 0 },
    },
    trophies: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        season: { type: String, required: true },
        team_id: { type: Number, required: true },
        team_name: { type: String, required: true },
        competition: { type: String, required: true },
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
    collection: "coaches",
  },
);

// Indexes for performance
CoachSchema.index({ korastats_id: 1 });
CoachSchema.index({ name: 1 });
CoachSchema.index({ "nationality.id": 1 });
CoachSchema.index({ "current_team.id": 1 });
CoachSchema.index({ status: 1 });
CoachSchema.index({ "career_history.team_id": 1 });
CoachSchema.index({ "trophies.competition": 1 });

export default CoachSchema;

