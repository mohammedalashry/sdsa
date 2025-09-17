import { Schema } from "mongoose";
import {
  TeamLineup,
  GoalsOverTime,
  FormOverTime,
  TransferData,
  TeamStats,
} from "@/legacy-types/teams.types";

// Interface for TypeScript
export interface TeamInterface {
  // Korastats identifiers
  korastats_id: number;

  // Team info
  name: string;

  code?: string;
  logo: string;
  founded?: number;
  national: boolean;
  clubMarketValue?: string;
  totalPlayers: number;
  foreignPlayers: number;
  averagePlayerAge: number;
  rank: number;
  // Location
  country: string;

  // Stadium
  venue: {
    id: number;
    name: string;
    address: string;
    capacity: number;
    surface: string;
    city?: string;
    image?: string;
  };

  // Coaches (all coaches, not just current)
  coaches: Array<{
    id: number;
    name: string;
    current: boolean;
  }>;

  // Trophies
  trophies?: Array<{
    league: string;
    country: string;
    season: string;
  }>;

  // Team stats summary (denormalized)
  stats_summary: {
    gamesPlayed: { home: number; away: number };
    wins: { home: number; away: number };
    draws: { home: number; away: number };
    loses: { home: number; away: number };
    goalsScored: { home: number; away: number };
    goalsConceded: { home: number; away: number };
    goalDifference: number;
    cleanSheetGames: number;
  };
  lineup: TeamLineup;
  transfers: TransferData;
  goalsOverTime: GoalsOverTime;
  formOverTime: FormOverTime;
  stats: TeamStats;
  // Sync tracking
  last_synced: Date;
  sync_version: number;
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const TeamSchema = new Schema<TeamInterface>(
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

    code: {
      type: String,
    },
    logo: {
      type: String,
      required: true,
    },
    founded: {
      type: Number,
    },
    national: {
      type: Boolean,
      required: true,
      default: false,
    },
    country: {
      type: String,
      required: true,
    },

    stats_summary: {
      gamesPlayed: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      wins: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      draws: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      loses: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalsScored: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalsConceded: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
      },
      goalDifference: { type: Number, default: 0 },
      cleanSheetGames: { type: Number, default: 0 },
    },
    stats: {
      league: {
        id: { type: Number, default: null },
        name: { type: String, default: null },
        logo: { type: String, default: null },
        flag: { type: String, default: null },
        season: { type: Number, default: null },
        country: { type: String, default: null },
      },
      rank: { type: Number, default: 0 },
      average_team_rating: { type: Number, default: 0 },
      team: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
      },
      form: { type: String, default: "" },
      team_attacking: {
        penalty_goals: { type: String, default: "0" },
        goals_per_game: { type: Number, default: 0 },
        free_kick_goals: { type: String, default: "0" },
        left_foot_goals: { type: Number, default: 0 },
        right_foot_goals: { type: Number, default: 0 },
        headed_goals: { type: Number, default: 0 },
        big_chances_per_game: { type: Number, default: 0 },
        big_chances_missed_per_game: { type: Number, default: 0 },
        total_shots_per_game: { type: Number, default: 0 },
        shots_on_target_per_game: { type: Number, default: 0 },
        shots_off_target_per_game: { type: Number, default: 0 },
        blocked_shots_per_game: { type: Number, default: 0 },
        successful_dribbles_per_game: { type: Number, default: 0 },
        corners_per_game: { type: Number, default: 0 },
        free_kicks_per_game: { type: Number, default: 0 },
        hit_woodwork: { type: Number, default: 0 },
        counter_attacks: { type: Number, default: 0 },
      },
      team_defending: {
        clean_sheets: { type: Number, default: 0 },
        goals_conceded_per_game: { type: Number, default: 0 },
        tackles_per_game: { type: Number, default: 0 },
        interceptions_per_game: { type: Number, default: 0 },
        clearances_per_game: { type: Number, default: 0 },
        saves_per_game: { type: Number, default: 0 },
        balls_recovered_per_game: { type: Number, default: 0 },
        errors_leading_to_shot: { type: Number, default: 0 },
        errors_leading_to_goal: { type: Number, default: 0 },
        penalties_committed: { type: Number, default: 0 },
        penalty_goals_conceded: { type: Number, default: 0 },
        clearance_off_line: { type: Number, default: 0 },
        last_man_tackle: { type: Number, default: 0 },
      },
      team_passing: {
        ball_possession: { type: String, default: "0%" },
        accurate_per_game: { type: String, default: "0" },
        acc_own_half: { type: String, default: "0%" },
        acc_opposition_half: { type: String, default: "0%" },
        acc_long_balls: { type: String, default: "0%" },
        acc_crosses: { type: String, default: "0%" },
      },
      team_others: {
        duels_won_per_game: { type: String, default: "0" },
        ground_duels_won: { type: String, default: "0%" },
        aerial_duels_won: { type: String, default: "0%" },
        possession_lost_per_game: { type: String, default: "0" },
        throw_ins_per_game: { type: String, default: "0" },
      },
      clean_sheet: {
        home: { type: Number, default: 0 },
        away: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      goals: {
        for_: {
          total: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
          average: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
        },
        against: {
          total: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
          average: {
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
          },
        },
      },
      biggest: {
        streak: {
          wins: { type: Number, default: 0 },
          draws: { type: Number, default: 0 },
          loses: { type: Number, default: 0 },
        },
      },
      fixtures: {
        played: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        wins: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        draws: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        loses: {
          home: { type: Number, default: 0 },
          away: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
      },
    },
    venue: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      address: { type: String, required: true },
      capacity: { type: Number, required: true },
      surface: { type: String, required: true },
      city: { type: String, required: false },
      image: { type: String, required: false },
    },

    // Lineup data
    lineup: {
      formation: { type: String, required: true },
      coach: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        photo: { type: String, required: true },
      },
      team: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      startXI: [
        {
          player: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            photo: { type: String, required: true },
            number: { type: Number, required: true },
            pos: { type: String, required: true },
            grid: { type: String, required: true },
            rating: { type: String, required: true },
          },
        },
      ],
      substitutes: [
        {
          player: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            photo: { type: String, required: true },
            number: { type: Number, required: true },
            pos: { type: String, required: true },
            grid: { type: String, required: true },
            rating: { type: String, required: true },
          },
        },
      ],
    },

    // Transfers data
    transfers: {
      player: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
      },
      update: { type: String, required: true },
      transfers: [
        {
          date: { type: String, required: true },
          type: { type: String, default: null },
          teams: {
            in: {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              logo: { type: String, required: true },
            },
            out: {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              logo: { type: String, required: true },
            },
          },
        },
      ],
    },

    // Goals over time data
    goalsOverTime: [
      {
        date: { type: String, required: true },
        timestamp: { type: Number, required: true },
        goalsScored: {
          totalShots: { type: Number, required: true },
          totalGoals: { type: Number, required: true },
          team: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            logo: { type: String, required: true },
            winner: { type: Boolean, default: null },
          },
        },
        goalsConceded: {
          totalShots: { type: Number, required: true },
          totalGoals: { type: Number, required: true },
          team: {
            id: { type: Number, required: true },
            name: { type: String, required: true },
            logo: { type: String, required: true },
            winner: { type: Boolean, default: null },
          },
        },
        opponentTeam: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          winner: { type: Boolean, default: null },
        },
      },
    ],

    // Form over time data
    formOverTime: [
      {
        date: { type: String, required: true },
        timestamp: { type: Number, required: true },
        currentPossession: { type: Number, required: true },
        opponentPossession: { type: Number, required: true },
        opponentTeam: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          winner: { type: Boolean, default: null },
        },
        currentTeam: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          winner: { type: Boolean, default: null },
        },
      },
    ],
    coaches: [
      {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        current: { type: Boolean, required: true },
      },
    ],
    trophies: [
      {
        league: { type: String, required: true },
        country: { type: String, required: true },
        season: { type: String, required: true },
      },
    ],
    totalPlayers: {
      type: Number,
      required: true,
      default: 0,
    },
    foreignPlayers: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: 0,
    },

    clubMarketValue: {
      type: String,
    },

    averagePlayerAge: {
      type: Number,
      required: true,
      default: 0,
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
    collection: "teams",
  },
);

// Indexes for performance
TeamSchema.index({ korastats_id: 1 });
TeamSchema.index({ name: 1 });
TeamSchema.index({ country: 1 });
TeamSchema.index({ "venue.id": 1 });
TeamSchema.index({ "coaches.id": 1 });
TeamSchema.index({ national: 1 });
TeamSchema.index({ rank: 1 });
TeamSchema.index({ "stats.league.id": 1 });
TeamSchema.index({ "stats.rank": 1 });
TeamSchema.index({ "lineup.team.id": 1 });
TeamSchema.index({ "transfers.player.id": 1 });

export default TeamSchema;

