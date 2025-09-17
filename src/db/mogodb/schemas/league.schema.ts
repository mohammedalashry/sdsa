import { Schema } from "mongoose";
export interface LeagueInterface {
  korastats_id: number;
  name: string;
  season: string;
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
    top_assisters: [
      {
        player: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
      },
    ],
    top_scorers: [
      {
        player: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
      },
    ],
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
    collection: "leagues",
  },
);

// Indexes for performance
LeagueSchema.index({ name: 1, season: 1 });
LeagueSchema.index({ country: 1, gender: 1 });
LeagueSchema.index({ start_date: 1, end_date: 1 });
LeagueSchema.index({ status: 1, start_date: 1 });

export default LeagueSchema;

