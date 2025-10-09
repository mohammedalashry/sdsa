import { Schema } from "mongoose";
export interface LeagueInterface {
  korastats_id: number;
  name: string;
  seasons: {
    year: number;
    start: string;
    end: string;
    current: boolean;
    rounds: string[];
    rounds_count: number;
  }[];
  type: string;
  logo: string;

  // Tournament metadata
  country: {
    id: number;
    name: string;
    code: string;
    flag: string;
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

  rounds: string[]; // Array of round names like ["Round 1", "Round 2", etc.]
  rounds_count: number;

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const LeagueSchema = new Schema<LeagueInterface>(
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
    seasons: {
      type: [
        {
          year: { type: Number, required: true },
          start: { type: String, required: true },
          end: { type: String, required: true },
          current: { type: Boolean, required: true },
          rounds: { type: [String], required: false },
          rounds_count: { type: Number, required: false },
        },
      ],
      required: true,
    },
    logo: {
      type: String,
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
    rounds: {
      type: [String],
      required: true,
    },
    rounds_count: {
      type: Number,
      required: true,
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
    collection: "leagues",
  },
);

// Indexes for performance
LeagueSchema.index({ name: 1, seasons: 1 });
LeagueSchema.index({ country: 1, gender: 1 });
LeagueSchema.index({ seasons: 1 });

export default LeagueSchema;

