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
  country: string;
  birthDate: Date;
  age?: number;
  photo?: string;
  matches: number;
  // Referee info

  // Career stats (denormalized)
  career_stats: [
    {
      league: string;
      total_matches: number;
      total_yellow_cards: number;
      total_red_cards: number;
      total_penalties: number;
    },
  ];

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
    },
    name: {
      type: String,
      required: true,
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    country: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
    },
    photo: {
      type: String,
    },

    career_stats: [
      {
        total_matches: { type: Number, default: 0 },
        total_yellow_cards: { type: Number, default: 0 },
        total_red_cards: { type: Number, default: 0 },
        total_penalties: { type: Number, default: 0 },
      },
    ],

    status: {
      type: String,
      required: true,
      enum: ["active", "inactive", "retired"],
      default: "active",
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
RefereeSchema.index({ country: 1 });
RefereeSchema.index({ "career_stats.league": 1 });

export default RefereeSchema;

