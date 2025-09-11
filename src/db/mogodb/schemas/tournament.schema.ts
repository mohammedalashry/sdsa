// src/db/mogodb/schemas/tournament.schema.ts
// Tournament MongoDB schema for SDSA

import { Schema, Document, Types } from "mongoose";
export interface TournamentInterface {
  korastats_id: number;
  name: string;
  season: string;
  logo: string;

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

  rounds: string[]; // Array of round names like ["Round 1", "Round 2", etc.]
  rounds_count: number;

  // Tournament winners

  top_scorers: [
    {
      player: {
        id: number;
        name: string;
      };
    },
  ];
  top_assisters: [
    {
      player: {
        id: number;
        name: string;
      };
    },
  ];
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
// Interface for TypeScript
export interface ITournament extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;
  name: string;
  season: string;
  logo: string;

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

  rounds: string[]; // Array of round names like ["Round 1", "Round 2", etc.]
  rounds_count: number;

  // Tournament winners
  winner: {
    id: number | null;
    name: string | null;
  };
  runner_up: {
    id: number | null;
    name: string | null;
  };
  top_scorers: [
    {
      player: {
        id: number;
        name: string;
      };
    },
  ];
  top_assisters: [
    {
      player: {
        id: number;
        name: string;
      };
    },
  ];
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
    },
    name: {
      type: String,
      required: true,
    },
    season: {
      type: String,
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

    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "completed", "upcoming"],
      default: "upcoming",
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

