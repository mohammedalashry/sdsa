import { Schema } from "mongoose";

// Interface for TypeScript
export interface RefereeInterface {
  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  country: {
    name: string;
    code: string;
    flag: string;
  };
  birthDate: string;
  age?: number;
  photo?: string;
  matches: number;

  // Career stats (denormalized)
  career_stats: Array<{
    league: string;
    appearances: number;
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
const RefereeSchema = new Schema<RefereeInterface>(
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
    country: {
      name: { type: String, required: true },
      code: { type: String, required: true },
      flag: { type: String, required: true },
    },
    birthDate: {
      type: String,
    },
    age: {
      type: Number,
    },
    photo: {
      type: String,
      required: true,
    },
    matches: {
      type: Number,
    },

    career_stats: [
      {
        league: { type: String, required: true },
        appearances: { type: Number, default: 0 },
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

