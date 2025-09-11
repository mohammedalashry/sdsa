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
  firstname?: string;
  lastname?: string;
  birth: {
    date: Date;
    place: string;
    country: string;
  };
  age: number;
  nationality: string;

  // Physical attributes
  height?: number;
  weight?: number;
  preferred_foot?: "left" | "right" | "both";
  photo: string;
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
    position: string;
  };
  // Trophies
  trophies: {
    id: number;
    name: string;
    season: number;
    team_id: number;
    team_name: string;
    league: string;
  };
  // Injury status
  injured: boolean;

  // Career summary (denormalized for quick access)
  career_summary: {
    total_matches: number;
    careerData: [
      {
        team: {
          id: number;
          name: string;
          logo: string;
        };
        season: number;
      },
    ];
    goals: {
      total: number;
      assists: number;
      conceded: number;
      saves: number;
    };
  };

  stats: [
    {
      team: {
        id: number;
        name: string;
        logo: string;
      };
      season: number;
      attempts: number;
      success: number;
      past: number;
      games: {
        appearences: number;
        lineups: number;
        minutes: number;
        number: number;
        position: string;
        rating: string;
        captain: boolean;
      };
      substitutes: {
        in: number;
        out: number;
        bench: number;
      };
      shots: {
        total: number;
        on: number;
      };
      goals: {
        total: number;
        conceded: number;
        assists: number;
        saves: number;
      };
      passes: {
        total: number;
        key: number;
        accuracy: number;
      };
      tackles: {
        total: number;
        blocks: number;
        interceptions: number;
      };
      duels: {
        total: number;
        won: number;
      };
      dribbles: {
        attempts: number;
        success: number;
        past: number;
      };
      fouls: {
        drawn: number;
        committed: number;
      };
      cards: {
        yellow: number;
        yellowred: number;
        red: number;
      };
      penalty: {
        won: number;
        commited: number;
        scored: number;
        missed: number;
        saved: number;
      };
    },
  ];
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
    birth: {
      date: { type: Date, required: true },
      place: { type: String, required: true },
      country: { type: String, required: true },
    },
    age: {
      type: Number,
      required: true,
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
    injured: {
      type: Boolean,
      required: true,
      default: false,
    },
    career_summary: {
      total_matches: { type: Number, default: 0 },
      total_goals: { type: Number, default: 0 },
      total_assists: { type: Number, default: 0 },
      total_cards: { type: Number, default: 0 },
      current_market_value: { type: Number },
    },
    trophies: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      season: { type: Number, required: true },
      team_id: { type: Number, required: true },
      team_name: { type: String, required: true },
      league: { type: String, required: true },
    },
    image_url: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "retired", "inactive"],
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
    collection: "players",
  },
);

// Indexes for performance
PlayerSchema.index({ korastats_id: 1 });
PlayerSchema.index({ name: 1 });
PlayerSchema.index({ firstname: 1 });
PlayerSchema.index({ lastname: 1 });
PlayerSchema.index({ "current_team.id": 1 });
PlayerSchema.index({ "nationality.id": 1 });
PlayerSchema.index({ "positions.primary.id": 1 });
PlayerSchema.index({ status: 1, "current_team.id": 1 });
PlayerSchema.index({ age: 1, status: 1 });
PlayerSchema.index({ injured: 1 });

export default PlayerSchema;

