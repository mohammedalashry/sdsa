// src/db/mogodb/schemas/team.schema.ts
// Team MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ITeam extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Team info
  name: string;
  short_name?: string;
  nickname?: string;

  // Location
  country: {
    id: number;
    name: string;
  };
  city?: string;

  // Club info
  club?: {
    id: number;
    name: string;
    logo_url?: string;
    founded_year?: number;
    is_national_team: boolean;
  };

  // Stadium
  stadium?: {
    id: number;
    name: string;
    capacity?: number;
    surface?: string;
    city?: string;
  };

  // Current squad (embedded for quick access)
  current_squad?: Array<{
    player_id: number;
    player_name: string;
    jersey_number: number;
    position: string;
    joined_date?: Date;
  }>;

  // Current coach
  current_coach?: {
    id: number;
    name: string;
    nationality: string;
    appointed_date?: Date;
  };

  // Team stats summary (denormalized)
  stats_summary: {
    total_matches: number;
    total_wins: number;
    total_draws: number;
    total_losses: number;
    total_goals_for: number;
    total_goals_against: number;
  };

  // Status
  status: "active" | "inactive";

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
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    short_name: {
      type: String,
    },
    nickname: {
      type: String,
    },
    country: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
    },
    city: {
      type: String,
    },
    club: {
      id: { type: Number },
      name: { type: String },
      logo_url: { type: String },
      founded_year: { type: Number },
      is_national_team: { type: Boolean, default: false },
    },
    stadium: {
      id: { type: Number },
      name: { type: String },
      capacity: { type: Number },
      surface: { type: String },
      city: { type: String },
    },
    current_squad: [
      {
        player_id: { type: Number, required: true },
        player_name: { type: String, required: true },
        jersey_number: { type: Number, required: true },
        position: { type: String, required: true },
        joined_date: { type: Date },
      },
    ],
    current_coach: {
      id: { type: Number },
      name: { type: String },
      nationality: { type: String },
      appointed_date: { type: Date },
    },
    stats_summary: {
      total_matches: { type: Number, default: 0 },
      total_wins: { type: Number, default: 0 },
      total_draws: { type: Number, default: 0 },
      total_losses: { type: Number, default: 0 },
      total_goals_for: { type: Number, default: 0 },
      total_goals_against: { type: Number, default: 0 },
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "inactive"],
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
    collection: "teams",
  },
);

// Indexes for performance
TeamSchema.index({ korastats_id: 1 });
TeamSchema.index({ name: 1 });
TeamSchema.index({ "country.id": 1 });
TeamSchema.index({ "club.id": 1 });
TeamSchema.index({ "stadium.id": 1 });
TeamSchema.index({ status: 1, "country.id": 1 });
TeamSchema.index({ "current_coach.id": 1 });

export default TeamSchema;

