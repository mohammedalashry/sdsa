// src/db/mogodb/schemas/tournament.schema.ts
// Tournament MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";

// Interface for TypeScript
export interface ITournament extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;
  name: string;
  season: string;

  // Tournament metadata
  country: {
    id: number;
    name: string;
  };
  organizer: {
    id: number;
    name: string;
    abbrev: string;
  };
  age_group: {
    id: number;
    name: string;
    min_age?: number;
    max_age?: number;
  };
  gender: string;

  // Tournament structure (embedded for fast access)
  structure: {
    stages: Array<{
      id: number;
      name: string;
      order: number;
      type: string;
      groups: Array<{
        id: number;
        name: string;
        teams: Array<{
          id: number;
          name: string;
          // Basic stats for quick access
          played: number;
          points: number;
          goals_for: number;
          goals_against: number;
        }>;
      }>;
    }>;
  };

  // Metadata
  start_date: Date;
  end_date: Date;
  status: "active" | "completed" | "upcoming";

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const TournamentSchema = new Schema<ITournament>(
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
    season: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
    },
    organizer: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      abbrev: { type: String, required: true },
    },
    age_group: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      min_age: { type: Number },
      max_age: { type: Number },
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "mixed"],
    },
    structure: {
      stages: [
        {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          order: { type: Number, required: true },
          type: { type: String, required: true },
          groups: [
            {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              teams: [
                {
                  id: { type: Number, required: true },
                  name: { type: String, required: true },
                  played: { type: Number, default: 0 },
                  points: { type: Number, default: 0 },
                  goals_for: { type: Number, default: 0 },
                  goals_against: { type: Number, default: 0 },
                },
              ],
            },
          ],
        },
      ],
    },
    start_date: {
      type: Date,
      required: true,
      index: true,
    },
    end_date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "completed", "upcoming"],
      default: "upcoming",
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
    collection: "tournaments",
  },
);

// Indexes for performance
TournamentSchema.index({ korastats_id: 1 });
TournamentSchema.index({ name: 1, season: 1 });
TournamentSchema.index({ country: 1, gender: 1 });
TournamentSchema.index({ start_date: 1, end_date: 1 });
TournamentSchema.index({ status: 1, start_date: 1 });

export default TournamentSchema;

