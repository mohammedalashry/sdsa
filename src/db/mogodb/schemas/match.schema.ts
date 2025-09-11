// src/db/mogodb/schemas/match-comprehensive.schema.ts
// Comprehensive Match MongoDB schema that includes all fixture-related data
// Based on legacy-types from fixtures.types.ts

import { Schema, Document, Types } from "mongoose";
interface player {
  id: number;
  name: string;
}
interface TopPerformerPlayer {
  homePlayer: player;
  awayPlayer: player;
  stats: {
    name: string;
    home: number;
    away: number;
  }[];
}

export interface MatchInterface {
  // Korastats identifiers
  korastats_id: number;
  tournament_id: number;
  season: string;
  round: number;

  // ==================== FIXTURE DATA ====================
  // Base fixture information (from Fixture interface)
  id: number;
  date: string; // ISO string
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: {
    long: string; // "Match Finished", "Not Started", etc.
    short: string; // "FT", "NS", "LIVE", etc.
    elapsed: number | null; // Minutes elapsed
  };

  referee: {
    id: number;
    name: string;
    redCards: number;
    yellowCards: number;
  };

  // League information within fixture (from FixtureLeague interface)
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round: string;
  };

  // Team information within fixture (from FixtureTeams interface)
  teams: {
    home: {
      id: number;
      name: string;
      winner: boolean | null; // null for draws or unfinished matches
      coach: {
        id: number;
        name: string;
        redCards: number;
        yellowCards: number;
      };
    };
    away: {
      id: number;
      name: string;
      winner: boolean | null;
      coach: {
        id: number;
        name: string;
        redCards: number;
        yellowCards: number;
      };
    };
  };

  // Goals structure (from FixtureGoals interface)
  goals: {
    home: number | null;
    away: number | null;
  };

  // Score structure (from FixtureScore interface)
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
  // ========== Highlights Data ====================
  highlights: {
    host: string; // "youtube", "youtube-channel", etc.
    url: string;
  };
  // ========== Possession Data ====================
  possession: {
    home: number;
    away: number;
  };
  // ==================== Match Heatmap ====================
  heatmaps: Array<{
    team: { id: number; name: string };
    heatmap: { points: number[][] };
  }>;
  // ==================== MOMENTUM DATA ====================
  momentum: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
    data: [
      {
        time: string;
        homeEvent: string | null;
        awayEvent: string | null;
        homeMomentum: string;
        awayMomentum: string;
      },
    ];
  };

  // ==================== PREDICTIONS DATA ====================
  predictions: {
    winner: {
      id: number | null;
      name: string | null;
      comment: string | null;
    };
    winOrDraw: boolean;
    underOver: string | null;
    goals: {
      home: string | null;
      away: string | null;
    };
    percent: {
      home: string;
      draw: string;
      away: string;
    };
  };

  // ==================== EVENT DATA ====================
  events: Array<{
    time: {
      elapsed: number;
      extra: number | null;
    };
    team: {
      id: number;
      name: string;
    };
    player: {
      id: number;
      name: string;
    };
    assist: {
      id: number | null;
      name: string | null;
    };
    type: string; // "Goal", "Card", "Substitution", etc.
    detail: string; // "Normal Goal", "Yellow Card", etc.
    comments: string | null;
  }>;

  // ==================== LINEUP DATA ====================
  lineups: Array<{
    team: {
      id: number;
      name: string;
      colors: {
        player: {
          primary: string;
          number: string;
          border: string;
        };
        goalkeeper: {
          primary: string;
          number: string;
          border: string;
        };
      };
    };
    formation: string;
    startXI: Array<{
      player: {
        id: number;
        name: string;
        number: number;
        pos: string;
        grid: string;
      };
    }>;
    substitutes: Array<{
      player: {
        id: number;
        name: string;
        number: number;
        pos: string;
        grid: string | null;
      };
    }>;
    coach: {
      id: number;
      name: string;
      photo: string;
    };
  }>;

  // ==================== STATISTICS DATA ====================
  statistics: Array<{
    team: {
      id: number;
      name: string;
    };
    statistics: Array<{
      type: string;
      value: number | string | null;
    }>;
  }>;
  // ==================== All players Stats====================

  playersStats: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      statistics: {
        games: {
          appearences: number;
          lineups: number;
          minutes: number;
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
      };
    };
  }>;
  // ====================== top performer data ==================
  topPerformers: {
    topScorer: TopPerformerPlayer;
    topAssister: TopPerformerPlayer;
    topKeeper: TopPerformerPlayer;
  };
  // ==================== ADDITIONAL DATA ====================
  // Table position data

  // Average team rating
  averageTeamRating: {
    home: number;
    away: number;
  };

  // Data availability flags
  dataAvailable: {
    events: boolean;
    stats: boolean;
    formations: boolean;
    playerStats: boolean;
    video: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  lastSynced: Date;
  syncVersion: number;
}
// Interface for TypeScript - includes all fixture-related data
export interface IMatch extends Document {
  _id: Types.ObjectId;

  // Korastats identifiers
  korastats_id: number;
  tournament_id: number;
  season: string;
  round: number;

  // ==================== FIXTURE DATA ====================
  // Base fixture information (from Fixture interface)
  id: number;
  date: string; // ISO string
  timestamp: number;
  periods: {
    first: number | null;
    second: number | null;
  };
  venue: {
    id: number | null;
    name: string | null;
    city: string | null;
  };
  status: {
    long: string; // "Match Finished", "Not Started", etc.
    short: string; // "FT", "NS", "LIVE", etc.
    elapsed: number | null; // Minutes elapsed
  };

  referee: {
    id: number;
    name: string;
    redCards: number;
    yellowCards: number;
  };

  // League information within fixture (from FixtureLeague interface)
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
    round: string;
  };
  // ========== Highlights Data ====================

  // Team information within fixture (from FixtureTeams interface)
  teams: {
    home: {
      id: number;
      name: string;
      winner: boolean | null; // null for draws or unfinished matches
      coach: {
        id: number;
        name: string;
        redCards: number;
        yellowCards: number;
      };
    };
    away: {
      id: number;
      name: string;
      winner: boolean | null;
      coach: {
        id: number;
        name: string;
        redCards: number;
        yellowCards: number;
      };
    };
  };

  // Goals structure (from FixtureGoals interface)
  goals: {
    home: number | null;
    away: number | null;
  };

  // Score structure (from FixtureScore interface)
  score: {
    halftime: {
      home: number | null;
      away: number | null;
    };
    fulltime: {
      home: number | null;
      away: number | null;
    };
    extratime: {
      home: number | null;
      away: number | null;
    };
    penalty: {
      home: number | null;
      away: number | null;
    };
  };
  highlights: {
    host: string; // "youtube", "youtube-channel", etc.
    url: string;
  };
  // ========== Possession Data ====================
  possession: {
    home: number;
    away: number;
  };
  // ==================== Match Heatmap ====================
  heatmaps: Array<{
    team: { id: number; name: string };
    heatmap: { points: number[][] };
  }>;
  // ==================== MOMENTUM DATA ====================
  momentum: {
    home: {
      id: number;
      name: string;
    };
    away: {
      id: number;
      name: string;
    };
    data: [
      {
        time: string;
        homeEvent: string | null;
        awayEvent: string | null;
        homeMomentum: string;
        awayMomentum: string;
      },
    ];
  };

  // ==================== PREDICTIONS DATA ====================
  predictions: {
    winner: {
      id: number | null;
      name: string | null;
      comment: string | null;
    };
    winOrDraw: boolean;
    underOver: string | null;
    goals: {
      home: string | null;
      away: string | null;
    };
    percent: {
      home: string;
      draw: string;
      away: string;
    };
  };

  // ==================== EVENT DATA ====================
  events: Array<{
    time: {
      elapsed: number;
      extra: number | null;
    };
    team: {
      id: number;
      name: string;
    };
    player: {
      id: number;
      name: string;
    };
    assist: {
      id: number | null;
      name: string | null;
    };
    type: string; // "Goal", "Card", "Substitution", etc.
    detail: string; // "Normal Goal", "Yellow Card", etc.
    comments: string | null;
  }>;

  // ==================== LINEUP DATA ====================
  lineups: Array<{
    team: {
      id: number;
      name: string;
      colors: {
        player: {
          primary: string;
          number: string;
          border: string;
        };
        goalkeeper: {
          primary: string;
          number: string;
          border: string;
        };
      };
    };
    formation: string;
    startXI: Array<{
      player: {
        id: number;
        name: string;
        number: number;
        pos: string;
        grid: string;
      };
    }>;
    substitutes: Array<{
      player: {
        id: number;
        name: string;
        number: number;
        pos: string;
        grid: string | null;
      };
    }>;
    coach: {
      id: number;
      name: string;
      photo: string;
    };
  }>;

  // ==================== STATISTICS DATA ====================
  statistics: Array<{
    team: {
      id: number;
      name: string;
    };
    statistics: Array<{
      type: string;
      value: number | string | null;
    }>;
  }>;
  // ==================== All players Stats====================

  playersStats: Array<{
    player: {
      id: number;
      name: string;
      number: number;
      statistics: {
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
      };
    };
  }>;
  // ====================== top performer data ==================
  topPerformers: {
    topScorer: TopPerformerPlayer;
    topAssister: TopPerformerPlayer;
    topKeeper: TopPerformerPlayer;
  };
  // ==================== ADDITIONAL DATA ====================
  // Table position data

  // Average team rating
  averageTeamRating: {
    home: number;
    away: number;
  };

  // Data availability flags
  dataAvailable: {
    events: boolean;
    stats: boolean;
    formations: boolean;
    playerStats: boolean;
    video: boolean;
  };

  // Sync tracking
  lastSynced: Date;
  syncVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB Schema
const MatchSchema = new Schema<IMatch>(
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
    season: {
      type: String,
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },

    // ==================== FIXTURE DATA ====================
    id: { type: Number, required: true },
    referee: { type: Object, required: true },
    date: { type: String, required: true },
    timestamp: { type: Number, required: true },
    periods: {
      first: { type: Number, default: null },
      second: { type: Number, default: null },
    },
    venue: {
      id: { type: Number, default: null },
      name: { type: String, default: null },
      city: { type: String, default: null },
    },
    status: {
      long: { type: String, required: true },
      short: { type: String, required: true },
      elapsed: { type: Number, default: null },
    },

    // League information
    league: {
      id: { type: Number, required: true },
      name: { type: String, required: true },
      country: { type: String, required: true },
      season: { type: Number, required: true },
      round: { type: String, required: true },
    },

    // Teams information
    teams: {
      home: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        winner: { type: Boolean, default: null },
        coach: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "Unknown Coach" },
          redCards: { type: Number, default: 0 },
          yellowCards: { type: Number, default: 0 },
        },
      },
      away: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        winner: { type: Boolean, default: null },
        coach: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "Unknown Coach" },
          redCards: { type: Number, default: 0 },
          yellowCards: { type: Number, default: 0 },
        },
      },
    },

    // Goals
    goals: {
      home: { type: Number, default: null },
      away: { type: Number, default: null },
    },

    // Score
    score: {
      halftime: {
        home: { type: Number, default: null },
        away: { type: Number, default: null },
      },
      fulltime: {
        home: { type: Number, default: null },
        away: { type: Number, default: null },
      },
      extratime: {
        home: { type: Number, default: null },
        away: { type: Number, default: null },
      },
      penalty: {
        home: { type: Number, default: null },
        away: { type: Number, default: null },
      },
    },
    // ========== Highlights Data ====================
    highlights: {
      host: { type: String, required: true },
      url: { type: String, required: true },
    },
    // ========== Possession Data ====================
    possession: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },
    // ==================== Match Heatmap ====================
    heatmaps: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
        heatmap: { points: [[Number]] },
      },
    ],
    // ==================== MOMENTUM DATA ====================
    momentum: {
      home: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
      },
      away: {
        id: { type: Number, required: true },
        name: { type: String, required: true },
      },
      data: [
        {
          time: { type: String, required: true },
          homeEvent: { type: String, default: null },
          awayEvent: { type: String, default: null },
          homeMomentum: { type: String, required: true },
          awayMomentum: { type: String, required: true },
        },
      ],
    },

    // ==================== PREDICTIONS DATA ====================
    predictions: {
      winner: {
        id: { type: Number, default: null },
        name: { type: String, default: null },
        comment: { type: String, default: null },
      },
      winOrDraw: { type: Boolean, default: false },
      underOver: { type: String, default: null },
      goals: {
        home: { type: String, default: null },
        away: { type: String, default: null },
      },
      percent: {
        home: { type: String, required: true },
        draw: { type: String, required: true },
        away: { type: String, required: true },
      },
    },

    // ==================== EVENT DATA ====================
    events: [
      {
        time: {
          elapsed: { type: Number, required: true },
          extra: { type: Number, default: null },
        },
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
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

    // ==================== LINEUP DATA ====================
    lineups: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
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

    // ==================== STATISTICS DATA ====================
    statistics: [
      {
        team: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
        statistics: [
          {
            type: { type: String, required: true },
            value: { type: Schema.Types.Mixed, default: null },
          },
        ],
      },
    ],

    // ==================== PLAYER STATS DATA ====================
    playersStats: [
      {
        player: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          number: { type: Number, required: true },
          statistics: {
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
              conceded: { type: Number, default: 0 },
              assists: { type: Number, default: 0 },
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
          },
        },
      },
    ],

    // ==================== TOP PERFORMERS DATA ====================
    topPerformers: {
      topScorer: {
        homePlayer: {
          id: { type: Number, required: true },
          name: { type: String, default: "" },
        },
        awayPlayer: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "" },
        },
        stats: [
          {
            name: { type: String, default: "" },
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
          },
        ],
      },
      topAssister: {
        homePlayer: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "" },
        },
        awayPlayer: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "" },
        },
        stats: [
          {
            name: { type: String, default: "" },
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
          },
        ],
      },
      topKeeper: {
        homePlayer: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "" },
        },
        awayPlayer: {
          id: { type: Number, default: 0 },
          name: { type: String, default: "" },
        },
        stats: [
          {
            name: { type: String, default: "" },
            home: { type: Number, default: 0 },
            away: { type: Number, default: 0 },
          },
        ],
      },
    },

    // ==================== ADDITIONAL DATA ====================

    averageTeamRating: {
      home: { type: Number, default: 0 },
      away: { type: Number, default: 0 },
    },

    dataAvailable: {
      events: { type: Boolean, default: false },
      stats: { type: Boolean, default: false },
      formations: { type: Boolean, default: false },
      playerStats: { type: Boolean, default: false },
      video: { type: Boolean, default: false },
    },

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
    collection: "matches",
  },
);

// Indexes for performance
MatchSchema.index({ tournament_id: 1, season: 1, round: 1 });
MatchSchema.index({ date: 1, tournament_id: 1 });
MatchSchema.index({ "teams.home.id": 1, date: 1 });
MatchSchema.index({ "teams.away.id": 1, date: 1 });
MatchSchema.index({ "teams.home.id": 1, "teams.away.id": 1 });
MatchSchema.index({ "status.short": 1, date: 1 });

export default MatchSchema;

