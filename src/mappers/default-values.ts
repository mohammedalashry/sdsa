// ============================================================================
// src/integrations/korastats/mappers/default-values.ts
// Default values utility to ensure no null/undefined values in API responses

export const DEFAULT_VALUES = {
  // String defaults
  STRING: "-",
  EMPTY_STRING: "",

  // Number defaults
  NUMBER: 0,
  RATING: "0.0",

  // Boolean defaults
  BOOLEAN: false,

  // Array defaults
  ARRAY: [],

  // Object defaults
  TEAM: {
    id: 0,
    name: "Unknown Team",
    code: "-",
    country: "Unknown",
    founded: 0,
    national: false,
    logo: "",
  },

  VENUE: {
    id: 0,
    name: "Unknown Venue",
    address: "-",
    city: "-",
    capacity: 0,
    surface: "-",
    image: "",
  },

  LEAGUE: {
    id: 0,
    name: "Unknown League",
    country: "Unknown",
    logo: "",
    flag: "",
    season: new Date().getFullYear(),
  },

  PLAYER: {
    id: 0,
    name: "Unknown Player",
    firstname: "-",
    lastname: "-",
    age: 0,
    birth: {
      date: "-",
      place: "-",
      country: "-",
    },
    nationality: "-",
    height: "-",
    weight: "-",
    photo: "",
    team: {
      id: 0,
      name: "Unknown Team",
      code: "-",
      country: "Unknown",
      founded: 0,
      national: false,
      logo: "",
    },
    career: [],
  },

  COACH: {
    id: 0,
    name: "Unknown Coach",
    firstname: "-",
    lastname: "-",
    age: 0,
    birth: {
      date: "-",
      place: "-",
      country: "-",
    },
    nationality: "-",
    height: "-",
    weight: "-",
    photo: "",
    team: {
      id: 0,
      name: "Unknown Team",
      code: "-",
      country: "Unknown",
      founded: 0,
      national: false,
      logo: "",
    },
    career: [],
  },

  FIXTURE: {
    id: 0,
    referee: "Unknown Referee",
    timezone: "UTC",
    date: "-",
    timestamp: 0,
    periods: { first: 0, second: 0 },
    venue: {
      id: 0,
      name: "Unknown Venue",
      city: "-",
    },
    league: {
      id: 0,
      name: "Unknown League",
      country: "Unknown",
      logo: "",
      flag: "",
      season: new Date().getFullYear(),
      round: "-",
    },
    teams: {
      home: {
        id: 0,
        name: "Unknown Team",
        logo: "",
      },
      away: {
        id: 0,
        name: "Unknown Team",
        logo: "",
      },
    },
    goals: {
      home: 0,
      away: 0,
    },
    score: {
      halftime: { home: 0, away: 0 },
      fulltime: { home: 0, away: 0 },
      extratime: { home: 0, away: 0 },
      penalty: { home: 0, away: 0 },
    },
    events: [],
    lineups: {
      home: {
        team: {
          id: 0,
          name: "Unknown Team",
          logo: "",
        },
        formation: "4-4-2",
        startXI: [],
        substitutes: [],
        coach: {
          id: 0,
          name: "Unknown Coach",
          photo: "",
        },
      },
      away: {
        team: {
          id: 0,
          name: "Unknown Team",
          logo: "",
        },
        formation: "4-4-2",
        startXI: [],
        substitutes: [],
        coach: {
          id: 0,
          name: "Unknown Coach",
          photo: "",
        },
      },
    },
    statistics: [],
  },

  STATISTICS: {
    games: {
      appearences: 0,
      lineups: 0,
      minutes: 0,
      number: 0,
      position: "-",
      rating: "0.0",
      captain: false,
    },
    shots: { total: 0, on: 0 },
    goals: { total: 0, conceded: 0, assists: 0, saves: 0 },
    passes: { total: 0, key: 0, accuracy: 0 },
    tackles: { total: 0, blocks: 0, interceptions: 0 },
    duels: { total: 0, won: 0 },
    dribbles: { attempts: 0, success: 0, past: 0 },
    fouls: { drawn: 0, committed: 0 },
    cards: { yellow: 0, yellowred: 0, red: 0 },
    penalty: { won: 0, commited: 0, scored: 0, missed: 0, saved: 0 },
  },
};

// Utility functions for safe value extraction
export function safeString(
  value: any,
  defaultValue: string = DEFAULT_VALUES.STRING,
): string {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  return String(value);
}

export function safeNumber(
  value: any,
  defaultValue: number = DEFAULT_VALUES.NUMBER,
): number {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

export function safeBoolean(
  value: any,
  defaultValue: boolean = DEFAULT_VALUES.BOOLEAN,
): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  return Boolean(value);
}

export function safeArray(value: any, defaultValue: any[] = DEFAULT_VALUES.ARRAY): any[] {
  if (value === null || value === undefined || !Array.isArray(value)) {
    return defaultValue;
  }
  return value;
}

export function safeObject(value: any, defaultValue: any = {}): any {
  if (value === null || value === undefined || typeof value !== "object") {
    return defaultValue;
  }
  return value;
}

// Helper function to ensure no null/undefined in nested objects
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return {};
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        // Skip null/undefined values or replace with appropriate defaults
        continue;
      }
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

