import {
  DEFAULT_VALUES,
  safeString,
  safeNumber,
  safeBoolean,
  safeArray,
  safeObject,
} from "./default-values";

type ApiSportsGames = {
  appearences: number;
  lineups: number;
  minutes: number;
  number: number;
  position: string;
  rating: string;
  captain: boolean;
};

type StatBlocks = {
  shots: { total: number; on: number };
  goals: {
    total: number;
    conceded: number;
    assists: number;
    saves: number;
  };
  passes: { total: number; key: number; accuracy: number };
  tackles: { total: number; blocks: number; interceptions: number };
  duels: { total: number; won: number };
  dribbles: { attempts: number; success: number; past: number };
  fouls: { drawn: number; committed: number };
  cards: { yellow: number; yellowred: number; red: number };
  penalty: {
    won: number;
    commited: number;
    scored: number;
    missed: number;
    saved: number;
  };
};

export const toNum = (v: any): number => {
  return safeNumber(v);
};

// helper near the top of mapper.ts
const positionIdToCode: Record<number, string> = {
  // adjust/expand as your backend defines them
  1: "GK",
  2: "LB",
  3: "CB",
  4: "RB",
  5: "DM",
  6: "CM",
  7: "RM",
  8: "AM",
  9: "RW",
  10: "ST",
  11: "LW",
  12: "ST", // example: your logs showed intPrimaryPositionID: 12 for a striker
};

export function pickBestPosition(
  p: any,
  infoPlayer: any,
  statsPayload: any,
): string | null {
  // base (if present in TournamentTeamPlayerList)
  const base = p?.position?.primary?.name ?? null;
  if (base) return base;

  // stats (TournamentPlayerStats -> primary_position)
  const statsPos = statsPayload?.data?.primary_position ?? null;
  if (statsPos) return statsPos;

  // info (PlayerInfo -> intPrimaryPositionID)
  const posId = Number(infoPlayer?.intPrimaryPositionID);
  if (Number.isFinite(posId) && positionIdToCode[posId]) return positionIdToCode[posId];

  return null;
}

function buildEmptyStatBlocks(): { games: ApiSportsGames } & StatBlocks {
  return {
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
  };
}

function val(n: any): number {
  return safeNumber(n);
}

// case-insensitive multi-alias getter
function getByAliases(map: Map<string, number>, aliases: string[]): number {
  for (const a of aliases) {
    const k = a.trim().toLowerCase();
    if (map.has(k)) return val(map.get(k));
  }
  return 0;
}

export function mapPlayerStatsToStatistics(playerStatsResp: any) {
  const data = playerStatsResp?.data;
  if (!data) return buildEmptyStatBlocks();

  const statsBy = new Map<string, number>();
  for (const s of data?.stats || []) {
    const key = String(s?.stat || "")
      .trim()
      .toLowerCase();
    if (key) statsBy.set(key, Number(s?.value));
  }

  const out = buildEmptyStatBlocks();

  // games
  const minutes = getByAliases(statsBy, ["Minutes Played"]);
  const lineups = getByAliases(statsBy, ["Matches Played as Lineup"]);
  const subs = getByAliases(statsBy, ["Matches Played as Sub"]);
  const totalApps = (lineups || 0) + (subs || 0);

  out.games.minutes = minutes;
  out.games.lineups = lineups;
  out.games.appearences = totalApps;
  out.games.number = val(data?.shirt_number);
  out.games.position = safeString(data?.primary_position, "-");

  // shots & goals
  out.shots.total = getByAliases(statsBy, ["Total Attempts"]);
  out.shots.on = getByAliases(statsBy, ["Attempts On Target", "Shots On Target"]);
  out.goals.total = getByAliases(statsBy, ["Goals Scored"]);
  out.goals.assists = getByAliases(statsBy, ["Assists"]);
  out.goals.conceded = getByAliases(statsBy, ["Goals Conceded"]);
  out.goals.saves = getByAliases(statsBy, ["Attempts Saved", "Opportunity Save"]);

  // passes (fallback via short/long)
  const totalPasses = getByAliases(statsBy, ["Total Passes"]);
  const successPasses = getByAliases(statsBy, ["Success Passes"]);
  const totalShort = getByAliases(statsBy, ["Total Short Pass"]);
  const succShort = getByAliases(statsBy, ["Success Short Pass"]);
  const totalLong = getByAliases(statsBy, ["Total Long Pass"]);
  const succLong = getByAliases(statsBy, ["Success Long Pass"]);

  out.passes.total = totalPasses ?? ((totalShort || 0) + (totalLong || 0) || null);
  out.passes.key = getByAliases(statsBy, ["KeyPasses", "Key Passes"]);

  if (totalPasses != null && successPasses != null && totalPasses > 0) {
    out.passes.accuracy = Math.round((successPasses / totalPasses) * 100);
  } else if (
    succShort != null &&
    totalShort != null &&
    succLong != null &&
    totalLong != null &&
    totalShort + totalLong > 0
  ) {
    out.passes.accuracy = Math.round(
      ((succShort + succLong) / (totalShort + totalLong)) * 100,
    );
  } else {
    out.passes.accuracy = 0;
  }

  // defense
  out.tackles.total = getByAliases(statsBy, ["TackleWon", "Tackle Won"]);
  out.tackles.blocks = getByAliases(statsBy, ["Blocks"]);
  out.tackles.interceptions = getByAliases(statsBy, [
    "InterceptWon",
    "Interceptions",
    "Intercept Won",
  ]);

  // duels via aerials
  const aerialWon = getByAliases(statsBy, ["Aerial Won"]);
  const aerialLost = getByAliases(statsBy, ["Aerial Lost"]);
  out.duels.won = aerialWon;
  out.duels.total =
    aerialWon != null || aerialLost != null ? (aerialWon || 0) + (aerialLost || 0) : 0;

  // dribbles
  const dribSucc = getByAliases(statsBy, ["Dribble Success"]);
  const dribFail = getByAliases(statsBy, ["Dribble Fail"]);
  out.dribbles.success = dribSucc;
  out.dribbles.attempts =
    dribSucc != null || dribFail != null ? (dribSucc || 0) + (dribFail || 0) : 0;

  // fouls
  out.fouls.committed = getByAliases(statsBy, ["Fouls Commited", "Fouls Committed"]);
  out.fouls.drawn = getByAliases(statsBy, ["Fouls Awarded", "Fouls Won"]);

  // cards
  out.cards.yellow = getByAliases(statsBy, ["Yellow Card", "Yellow Cards"]);
  out.cards.yellowred = getByAliases(statsBy, ["Second Yellow Card", "Second Yellow"]);
  out.cards.red = getByAliases(statsBy, [
    "Red Card",
    "Red Cards",
    "Red Card Total (2nd Yellow Card + Red Card)",
  ]);

  // penalty
  out.penalty.commited = getByAliases(statsBy, ["Penalty Committed"]);
  out.penalty.won = getByAliases(statsBy, ["Penalty Won"]);
  out.penalty.scored = getByAliases(statsBy, ["Penalty Scored"]);
  out.penalty.missed = getByAliases(statsBy, ["Penalty Missed"]);
  out.penalty.saved = getByAliases(statsBy, ["Penalty Saved"]);

  return out;
}

export function extractLeagueInfo(ld: any) {
  if (!ld) {
    return {
      id: null,
      name: null,
      country: null,
      logo: null,
      flag: null,
      season: null,
      round: null,
    };
  }

  // Try to compose a human-readable "round" from first stage/group if present
  const firstStage = ld.stages?.[0];
  const firstGroup = firstStage?.groups?.[0];
  const roundText =
    firstStage?.stage && firstGroup?.group
      ? `${firstStage.stage} - ${firstGroup.group}`
      : firstStage?.stage || null;

  return {
    id: ld.id ?? null, // tournament id
    name: ld.tournament ?? null, // tournament name
    country: ld.organizer?.country?.name ?? null, // organizer -> country
    logo: ld.logo ?? null, // keep null unless provided
    flag: ld.flag ?? null, // keep null unless provided
    season: ld.season ?? null, // e.g., "2019/2020"
    round: roundText, // best-effort from stage/group
  };
}

export function getMatchStatus(objStatus: any) {
  if (!objStatus?.objStatus) {
    return { long: "Match Finished", short: "FT", elapsed: 90 };
  }
  const status = objStatus.objStatus.strMatchStatus;
  switch (status) {
    case "Approved":
      return { long: "Match Finished", short: "FT", elapsed: 90 };
    case "Scheduled":
      return { long: "Match Scheduled", short: "NS", elapsed: null };
    default:
      return { long: "Match Finished", short: "FT", elapsed: 90 };
  }
}

export type Maybe<T> = T | null;

export const firstDefined = <T>(...vals: Array<T | null | undefined>): T => {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return "" as T; // Return empty string as default for any type
};

export function toInt(v: unknown): number {
  return safeNumber(v);
}

export function toFloat(v: unknown): number {
  return safeNumber(v);
}

export function roundTo(n: number | null, digits = 1): number {
  if (n === null || !Number.isFinite(n)) return 0;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function calcAge(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (Number.isNaN(+d)) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function splitName(fullName?: string | null): {
  firstname: string;
  lastname: string;
} {
  if (!fullName) return { firstname: "-", lastname: "-" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0], lastname: "-" };
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") };
}

export function uniqBy<T>(
  arr: T[],
  getKey: (x: T) => string | number | null | undefined,
): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const item of arr) {
    const k = getKey(item);
    if (k === null || k === undefined) {
      // allow one null-key item
      const NULL_KEY = "__NULL__";
      if (!seen.has(NULL_KEY)) {
        seen.add(NULL_KEY);
        out.push(item);
      }
      continue;
    }
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

// Position mapping for different formats
export const POSITION_MAPPING: Record<string, string> = {
  GK: "G",
  CB: "D",
  LB: "D",
  RB: "D",
  DF: "D",
  DM: "M",
  CM: "M",
  AM: "M",
  LW: "M",
  RW: "M",
  MF: "M",
  CF: "F",
  FW: "F",
};

// Generate grid position based on formation and position
export function generateGridPosition(
  formation: string,
  position: string,
  playerIndex: number,
): string {
  const positionType = POSITION_MAPPING[position] || "M";

  if (positionType === "G") {
    return "1:1";
  }

  // Parse formation to understand structure
  const formationStr = formation?.replace("1-", "") || "433";
  const lines = formationStr.split("").map(Number);

  let line = 1;
  let positionInLine = 1;

  switch (positionType) {
    case "D":
      line = 2;
      positionInLine = Math.min(playerIndex + 1, lines[0] || 4);
      break;
    case "M":
      if (position === "DM") {
        line = 3;
        positionInLine = 1;
      } else if (["AM", "LW", "RW"].includes(position)) {
        line = 4;
        positionInLine = Math.min(playerIndex + 1, lines[2] || 3);
      } else {
        line = 3;
        positionInLine = Math.min(playerIndex + 1, lines[1] || 3);
      }
      break;
    case "F":
      line = 5;
      positionInLine = 1;
      break;
  }

  return `${line}:${positionInLine}`;
}

// Map individual player data
export function mapPlayerToTarget(player: any, location?: any) {
  const position = POSITION_MAPPING[player.strPositionEn] || "M";

  return {
    id: player.intPlayerID || 0,
    name: player.strNickNameEn || player.strFullNameEn || "Unknown Player",
    number: player.intShirtNumber || 0,
    photo: null,
    rating: "0",
    pos: position,
    grid: generateGridPosition(
      "433", // Default formation for grid calculation
      player.strPositionEn,
      0, // Will be adjusted in the main function
    ),
  };
}

