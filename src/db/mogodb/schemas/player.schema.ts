import {
  PlayerStatistics,
  PlayerTraits,
  PlayerHeatMap,
  PlayerShotMap,
} from "@/legacy-types/players.types";
import { Transfer } from "@/legacy-types/teams.types";
import { Schema } from "mongoose";

// Interface for TypeScript
export interface PlayerInterface {
  // Korastats identifiers
  korastats_id: number;

  // Personal info
  name: string;
  firstname?: string;
  lastname?: string;
  birth: {
    date: string;
    place: string;
    country: string;
  };
  age: number;
  nationality: string;
  shirtNumber: number;
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
  // Injury status
  injured: boolean;

  // Career summary (denormalized for quick access)
  career_summary: {
    total_matches: number;
    careerData: Array<{
      team: {
        id: number;
        name: string;
        logo: string;
      };
      season: number;
    }>;
  };

  stats: Array<PlayerStatistics>;
  playerTraits: PlayerTraits;
  playerHeatMap: PlayerHeatMap;
  playerShotMap: PlayerShotMap;
  // Status
  status: "active" | "retired" | "inactive";
  topAssists: Array<{
    season: number;
    league: number;
  }>;
  topScorers: Array<{
    season: number;
    league: number;
  }>;
  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const PlayerSchema = new Schema<PlayerInterface>(
  {
    // Korastats identifiers
    korastats_id: { type: Number, required: true, unique: true },

    // Personal info
    name: { type: String, required: true },
    firstname: { type: String, required: false },
    lastname: { type: String, required: false },
    birth: {
      date: { type: String, required: true },
      place: { type: String, required: true },
      country: { type: String, required: true },
    },
    age: { type: Number, required: true },
    nationality: { type: String, required: true },
    shirtNumber: { type: Number, required: true },
    // Physical attributes
    height: { type: Number, required: false },
    weight: { type: Number, required: false },
    preferred_foot: {
      type: String,
      enum: ["left", "right", "both"],
      required: false,
    },
    photo: { type: String, required: true },

    // Position data
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

    // Current status
    current_team: {
      id: { type: Number, required: false },
      name: { type: String, required: false },
      position: { type: String, required: false },
    },

    // Injury status
    injured: { type: Boolean, default: false },

    // Career summary
    career_summary: {
      total_matches: { type: Number, default: 0 },
      careerData: [
        {
          team: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            logo: { type: String, required: true },
          },
          season: { type: Number, required: true },
        },
      ],
    },

    // Statistics
    stats: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        league: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          country: { type: String, required: true },
          logo: { type: String, required: true },
          flag: { type: String, required: true },
          season: { type: Number, required: true },
        },
        games: {
          appearences: { type: Number, default: 0 },
          lineups: { type: Number, default: 0 },
          minutes: { type: Number, default: 0 },
          number: { type: Number, default: 0 },
          position: { type: String, default: "" },
          rating: { type: String, default: "0.0" },
          captain: { type: Boolean, default: false },
        },
        substitutes: {
          in: { type: Number, default: 0 },
          out: { type: Number, default: 0 },
          bench: { type: Number, default: 0 },
        },
        shots: {
          total: { type: Number, default: 0 },
          on: { type: Number, default: 0 },
        },
        goals: {
          total: { type: Number, default: 0 },
          assists: { type: Number, default: 0 },
          conceded: { type: Number, default: 0 },
          saves: { type: Number, default: 0 },
        },
        passes: {
          total: { type: Number, default: 0 },
          key: { type: Number, default: 0 },
          accuracy: { type: Number, default: 0 },
        },
        tackles: {
          total: { type: Number, default: 0 },
          blocks: { type: Number, default: 0 },
          interceptions: { type: Number, default: 0 },
        },
        duels: {
          total: { type: Number, default: 0 },
          won: { type: Number, default: 0 },
        },
        dribbles: {
          attempts: { type: Number, default: 0 },
          success: { type: Number, default: 0 },
          past: { type: Number, default: 0 },
        },
        fouls: {
          drawn: { type: Number, default: 0 },
          committed: { type: Number, default: 0 },
        },
        cards: {
          yellow: { type: Number, default: 0 },
          yellowred: { type: Number, default: 0 },
          red: { type: Number, default: 0 },
        },
        penalty: {
          won: { type: Number, default: 0 },
          commited: { type: Number, default: 0 },
          scored: { type: Number, default: 0 },
          missed: { type: Number, default: 0 },
          saved: { type: Number, default: 0 },
        },
      },
    ],

    // Player traits
    playerTraits: {
      att: { type: Number, default: 0 },
      dri: { type: Number, default: 0 },
      phy: { type: Number, default: 0 },
      pas: { type: Number, default: 0 },
      sht: { type: Number, default: 0 },
      def_: { type: Number, default: 0 },
      tac: { type: Number, default: 0 },
      due: { type: Number, default: 0 },
    },

    // Player heat map
    playerHeatMap: {
      points: [[Number]],
    },

    // Player shot map
    playerShotMap: {
      shots: [
        {
          id: { type: Number, required: true },
          playerId: { type: Number, required: true },
          time: { type: String, required: true },
          zone: { type: String, required: true },
          outcome: { type: String, required: true },
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          isBlocked: { type: Boolean, default: false },
          isOnTarget: { type: Boolean, default: false },
          blockedX: { type: Number, default: null },
          blockedY: { type: Number, default: null },
          goalCrossedY: { type: Number, default: null },
          goalCrossedZ: { type: Number, default: null },
          shotType: { type: String, required: true },
          situation: { type: String, required: true },
          playerName: { type: String, required: true },
          PlayerLogo: { type: String, required: true },
        },
      ],
      accuracy: { type: Number, default: 0 },
    },

    // Status
    status: {
      type: String,
      enum: ["active", "retired", "inactive"],
      default: "active",
    },
    topAssists: [
      {
        season: { type: Number, required: true },
        league: { type: Number, required: true },
      },
    ],
    topScorers: [
      {
        season: { type: Number, required: true },
        league: { type: Number, required: true },
      },
    ],
    // Sync tracking
    last_synced: { type: Date, default: Date.now },
    sync_version: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "players",
  },
);

// Indexes for performance
PlayerSchema.index({ name: 1 });
PlayerSchema.index({ firstname: 1 });
PlayerSchema.index({ lastname: 1 });
PlayerSchema.index({ "current_team.id": 1 });
PlayerSchema.index({ nationality: 1 });
PlayerSchema.index({ "positions.primary.id": 1 });
PlayerSchema.index({ "positions.secondary.id": 1 });
PlayerSchema.index({ status: 1, "current_team.id": 1 });
PlayerSchema.index({ age: 1, status: 1 });
PlayerSchema.index({ injured: 1 });
PlayerSchema.index({ "birth.country": 1 });
PlayerSchema.index({ "stats.team.id": 1 });
PlayerSchema.index({ "stats.league.id": 1 });

export default PlayerSchema;

