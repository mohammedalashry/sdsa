// src/db/mogodb/schemas/player.schema.ts
// Player MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface IPlayer extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  nickname: string;
  date_of_birth: Date;
  age: number;
  nationality: {
    id: number;
    name: string;
  };

  // Physical attributes
  height?: number;
  weight?: number;
  preferred_foot?: "left" | "right" | "both";

  // Position data
  positions: {
    primary: {
      id: number;
      name: string;
      category: string;
    };
    secondary: {
      id: number;
      name: string;
      category: string;
    };
  };

  // Current status
  current_team?: {
    id: number;
    name: string;
    jersey_number?: number;
    position: string;
    joined_date?: Date;
  };

  // Career summary (denormalized for quick access)
  career_summary: {
    total_matches: number;
    total_goals: number;
    total_assists: number;
    total_cards: number;
    current_market_value?: number;
  };

  // Image/Media
  image_url?: string;

  // Status
  status: "active" | "retired" | "inactive";

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const PlayerSchema = new Schema<IPlayer>(
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
    nickname: {
      type: String,
      required: true,
    },
    date_of_birth: {
      type: Date,
      required: true,
      index: true,
    },
    age: {
      type: Number,
      required: true,
      index: true,
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
    preferred_foot: {
      type: String,
      enum: ["left", "right", "both"],
    },
    positions: {
      primary: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        category: { type: String, required: true },
      },
      secondary: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        category: { type: String, required: true },
      },
    },
    current_team: {
      id: { type: Number },
      name: { type: String },
      jersey_number: { type: Number },
      position: { type: String },
      joined_date: { type: Date },
    },
    career_summary: {
      total_matches: { type: Number, default: 0 },
      total_goals: { type: Number, default: 0 },
      total_assists: { type: Number, default: 0 },
      total_cards: { type: Number, default: 0 },
      current_market_value: { type: Number },
    },
    image_url: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "retired", "inactive"],
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
    collection: "players",
  },
);

// Indexes for performance
PlayerSchema.index({ korastats_id: 1 });
PlayerSchema.index({ name: 1 });
PlayerSchema.index({ "current_team.id": 1 });
PlayerSchema.index({ "nationality.id": 1 });
PlayerSchema.index({ "positions.primary.id": 1 });
PlayerSchema.index({ status: 1, "current_team.id": 1 });
PlayerSchema.index({ age: 1, status: 1 });

export default PlayerSchema;

