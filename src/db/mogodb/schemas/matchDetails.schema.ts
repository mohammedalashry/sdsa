import {
  FixtureDetailed,
  PredictionsData,
  MomentumResponse,
  MatchHighlights,
  FixtureTeamHeatmap,
  FixtureTopPerformers,
  TeamShotmapData,
} from "@/legacy-types";

import { Schema, Document, Types } from "mongoose";

export interface MatchDetailsInterface {
  // Korastats identifiers
  korastats_id: number;
  tournament_id: number;

  // Additional match data
  timelineData: FixtureDetailed["timelineData"];
  lineupsData: FixtureDetailed["lineupsData"];
  injuriesData: FixtureDetailed["injuriesData"];
  playerStatsData: FixtureDetailed["playerStatsData"];
  statisticsData: FixtureDetailed["statisticsData"];
  predictionsData: PredictionsData;
  momentumData: MomentumResponse;
  highlightsData: MatchHighlights;
  heatmapsData: FixtureTeamHeatmap[];
  shotmapsData: TeamShotmapData[];
  topPerformersData: FixtureTopPerformers;

  // Metadata
  lastSynced: Date;
  syncVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Schema
const MatchDetailsSchema = new Schema<MatchDetailsInterface>(
  {
    korastats_id: {
      type: Number,
      required: true,
      unique: true,
    },
    tournament_id: {
      type: Number,
      required: true,
    },

    // ==================== DETAILED MATCH DATA ====================
    // Timeline data (events)
    timelineData: [
      {
        time: {
          elapsed: { type: Number, required: true },
          extra: { type: Number, default: null },
        },
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        player: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
        assist: {
          id: { type: Number, default: null },
          name: { type: String, default: null },
        },
        type: { type: String, required: true },
        detail: { type: String, required: true },
        comments: { type: String, default: null },
      },
    ],

    // Lineups data
    lineupsData: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          colors: {
            player: {
              primary: { type: String },
              number: { type: String },
              border: { type: String },
            },
            goalkeeper: {
              primary: { type: String },
              number: { type: String },
              border: { type: String },
            },
          },
        },
        formation: { type: String, required: true },
        startXI: [
          {
            player: {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              number: { type: Number, required: true },
              photo: { type: String, required: true },
              rating: { type: String, default: null },
              pos: { type: String, required: true },
              grid: { type: String, required: true },
            },
          },
        ],
        substitutes: [
          {
            player: {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              number: { type: Number, required: true },
              photo: { type: String, required: true },
              rating: { type: String, default: null },
              pos: { type: String, required: true },
              grid: { type: String, default: null },
            },
          },
        ],
        coach: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
      },
    ],

    // Injuries data
    injuriesData: [
      {
        player: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
          type: { type: String, required: true },
          reason: { type: String, required: true },
        },
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        fixture: {
          id: { type: Number, required: true },
          timezone: { type: String, required: true },
          date: { type: String, required: true },
          timestamp: { type: Number, required: true },
        },
        league: {
          id: { type: Number, required: true },
          season: { type: Number, required: true },
          name: { type: String, required: true },
          country: { type: String, required: true },
          logo: { type: String, required: true },
          flag: { type: String, required: true },
        },
      },
    ],

    // Player stats data
    playerStatsData: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        players: [
          {
            player: {
              id: { type: Number, required: true },
              name: { type: String, required: true },
              photo: { type: String, required: true },
            },
            statistics: [
              {
                games: {
                  minutes: { type: Number, default: null },
                  number: { type: Number, required: true },
                  position: { type: String, required: true },
                  rating: { type: String, default: null },
                  captain: { type: Boolean, default: false },
                  substitute: { type: Boolean, default: false },
                },
                offsides: { type: Number, default: null },
                shots: {
                  total: { type: Number, default: null },
                  on: { type: Number, default: null },
                },
                goals: {
                  total: { type: Number, default: null },
                  conceded: { type: Number, default: null },
                  assists: { type: Number, default: null },
                  saves: { type: Number, default: null },
                },
                passes: {
                  total: { type: Number, default: null },
                  key: { type: Number, default: null },
                  accuracy: { type: String, default: null },
                },
                tackles: {
                  total: { type: Number, default: null },
                  blocks: { type: Number, default: null },
                  interceptions: { type: Number, default: null },
                },
                duels: {
                  total: { type: Number, default: null },
                  won: { type: Number, default: null },
                },
                dribbles: {
                  attempts: { type: Number, default: null },
                  success: { type: Number, default: null },
                  past: { type: Number, default: null },
                },
                fouls: {
                  drawn: { type: Number, default: null },
                  committed: { type: Number, default: null },
                },
                cards: {
                  yellow: { type: Number, default: null },
                  red: { type: Number, default: null },
                  yellowred: { type: Number, default: null },
                },
                penalty: {
                  won: { type: Number, default: null },
                  committed: { type: Number, default: null },
                  scored: { type: Number, default: null },
                  missed: { type: Number, default: null },
                  saved: { type: Number, default: null },
                },
              },
            ],
          },
        ],
      },
    ],

    // Statistics data
    statisticsData: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
        },
        statistics: [
          {
            type: { type: String, required: true },
            value: { type: Schema.Types.Mixed, default: null },
          },
        ],
      },
    ],

    // Predictions data
    predictionsData: {
      winner: {
        id: { type: Number, default: null },
        name: { type: String, required: true },
        comment: { type: String, required: true },
      },
      win_or_draw: { type: Boolean, default: false },
      under_over: { type: String, default: null },
      goals: {
        home: { type: String, required: true },
        away: { type: String, required: true },
      },
      advice: { type: String, required: true },
      percent: {
        home: { type: String, required: true },
        draw: { type: String, required: true },
        away: { type: String, required: true },
      },
    },

    // Momentum data
    momentumData: {
      data: [
        {
          time: { type: String, required: true },
          homeEvent: { type: String, default: null },
          awayEvent: { type: String, default: null },
          homeMomentum: { type: String, required: true },
          awayMomentum: { type: String, required: true },
        },
      ],
      home: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      away: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
    },

    // Highlights data
    highlightsData: {
      host: { type: String, required: true },
      url: { type: String, required: true },
    },

    // Heatmaps data
    heatmapsData: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          winner: { type: Boolean, default: null },
        },
        heatmap: {
          points: [[Number]],
        },
      },
    ],

    // Shotmaps data
    shotmapsData: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          logo: { type: String, required: true },
          winner: { type: Boolean, default: null },
        },
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
          },
        ],
      },
    ],

    // Top performers data
    topPerformersData: {
      league: {
        name: { type: String, required: true },
        logo: { type: String, required: true },
        season: { type: Number, required: true },
      },
      homeTeam: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      awayTeam: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        logo: { type: String, required: true },
        winner: { type: Boolean, default: null },
      },
      topScorer: {
        homePlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        awayPlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        stats: [
          {
            name: { type: String, required: true },
            home: { type: Schema.Types.Mixed, required: true },
            away: { type: Schema.Types.Mixed, required: true },
          },
        ],
      },
      topAssister: {
        homePlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        awayPlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        stats: [
          {
            name: { type: String, required: true },
            home: { type: Schema.Types.Mixed, required: true },
            away: { type: Schema.Types.Mixed, required: true },
          },
        ],
      },
      topKeeper: {
        homePlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        awayPlayer: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          photo: { type: String, required: true },
        },
        stats: [
          {
            name: { type: String, required: true },
            home: { type: Schema.Types.Mixed, required: true },
            away: { type: Schema.Types.Mixed, required: true },
          },
        ],
      },
    },

    // ==================== ADDITIONAL DATA ====================

    lastSynced: {
      type: Date,
      default: Date.now,
    },
    syncVersion: {
      type: Number,
      default: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    collection: "matchesDetails",
  },
);

// Indexes for performance
MatchDetailsSchema.index({ tournament_id: 1 });
MatchDetailsSchema.index({ "momentumData.home.id": 1 });
MatchDetailsSchema.index({ "momentumData.away.id": 1 });
MatchDetailsSchema.index({ "topPerformersData.homeTeam.id": 1 });
MatchDetailsSchema.index({ "topPerformersData.awayTeam.id": 1 });

export default MatchDetailsSchema;

