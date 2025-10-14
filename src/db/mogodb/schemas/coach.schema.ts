import { Schema } from "mongoose";

// Interface for TypeScript
export interface CoachInterface {
  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  birth: {
    date: Date;
    place: string;
    country: string;
  };
  nationality: {
    name: string;
    flag: string;
    code: string;
  };
  height: number;
  weight: number;
  photo: string;
  prefferedFormation: string | null;
  // Career history (embedded for quick access)
  career_history: Array<{
    team_id: number;
    team_name: string;
    team_logo: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
  }>;

  // Coaching stats summary (denormalized)
  stats: Array<{
    league: {
      id: number;
      name: string;
      logo: string;
      season: number;
    };
    matches: number;
    wins: number;
    draws: number;
    loses: number;
    points: number;
    points_per_game: number;
  }>;

  coachPerformance: {
    winPercentage: number;
    drawPercentage: number;
    losePercentage: number;
  };

  // Status
  status: "active" | "inactive" | "retired";

  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const CoachSchema = new Schema<CoachInterface>(
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
    age: {
      type: Number,
    },
    birth: {
      date: { type: Date },
      place: { type: String },
      country: { type: String },
    },
    nationality: {
      name: { type: String, required: true },
      flag: { type: String, required: true },
      code: { type: String, required: true },
    },
    height: {
      type: Number,
    },
    weight: {
      type: Number,
    },
    photo: {
      type: String,
    },
    prefferedFormation: {
      type: String,
      default: null,
    },
    career_history: [
      {
        team_id: { type: Number, required: true },
        team_name: { type: String, required: true },
        team_logo: { type: String, required: true },
        start_date: { type: Date, required: true },
        end_date: { type: Date },
        is_current: { type: Boolean, default: false },
      },
    ],
    stats: [
      {
        league: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          season: { type: Number, required: true },
        },
        matches: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        loses: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        points_per_game: { type: Number, default: 0 },
      },
    ],

    coachPerformance: {
      winPercentage: { type: Number, default: 0 },
      drawPercentage: { type: Number, default: 0 },
      losePercentage: { type: Number, default: 0 },
    },
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
    collection: "coaches",
  },
);

// Indexes for performance
CoachSchema.index({ name: 1 });
CoachSchema.index({ "nationality.id": 1 });
CoachSchema.index({ "career_history.team_id": 1 });
CoachSchema.index({ "trophies.league": 1 });

export default CoachSchema;

