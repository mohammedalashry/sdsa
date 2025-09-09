type ApiSportsGames = {
  appearences: number | null;
  lineups: number | null;
  minutes: number | null;
  number: number | null;
  position: string | null;
  rating: number | null;
  captain: boolean | null;
};

type StatBlocks = {
  shots: { total: number | null; on: number | null };
  goals: {
    total: number | null;
    conceded: number | null;
    assists: number | null;
    saves: number | null;
  };
  passes: { total: number | null; key: number | null; accuracy: number | null };
  tackles: { total: number | null; blocks: number | null; interceptions: number | null };
  duels: { total: number | null; won: number | null };
  dribbles: { attempts: number | null; success: number | null; past: number | null };
  fouls: { drawn: number | null; committed: number | null };
  cards: { yellow: number | null; yellowred: number | null; red: number | null };
  penalty: {
    won: number | null;
    commited: number | null;
    scored: number | null;
    missed: number | null;
    saved: number | null;
  };
};

export const toNum = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
      appearences: null,
      lineups: null,
      minutes: null,
      number: null,
      position: null,
      rating: null,
      captain: null,
    },
    shots: { total: null, on: null },
    goals: { total: null, conceded: null, assists: null, saves: null },
    passes: { total: null, key: null, accuracy: null },
    tackles: { total: null, blocks: null, interceptions: null },
    duels: { total: null, won: null },
    dribbles: { attempts: null, success: null, past: null },
    fouls: { drawn: null, committed: null },
    cards: { yellow: null, yellowred: null, red: null },
    penalty: { won: null, commited: null, scored: null, missed: null, saved: null },
  };
}

function val(n: any): number | null {
  if (n === null || n === undefined) return null;
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
}

// case-insensitive multi-alias getter
function getByAliases(map: Map<string, number>, aliases: string[]): number | null {
  for (const a of aliases) {
    const k = a.trim().toLowerCase();
    if (map.has(k)) return val(map.get(k));
  }
  return null;
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
  const totalApps = (lineups || 0) + (subs || 0) || null;

  out.games.minutes = minutes;
  out.games.lineups = lineups;
  out.games.appearences = totalApps;
  out.games.number = val(data?.shirt_number);
  out.games.position = data?.primary_position || null;

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
    out.passes.accuracy = null;
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
    aerialWon != null || aerialLost != null ? (aerialWon || 0) + (aerialLost || 0) : null;

  // dribbles
  const dribSucc = getByAliases(statsBy, ["Dribble Success"]);
  const dribFail = getByAliases(statsBy, ["Dribble Fail"]);
  out.dribbles.success = dribSucc;
  out.dribbles.attempts =
    dribSucc != null || dribFail != null ? (dribSucc || 0) + (dribFail || 0) : null;

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

export const firstDefined = <T>(...vals: Array<T | null | undefined>): T | null => {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return null;
};

export function toInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toFloat(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function roundTo(n: number | null, digits = 1): number | null {
  if (n === null || !Number.isFinite(n)) return null;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

export function calcAge(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(+d)) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export function splitName(fullName?: string | null): {
  firstname: Maybe<string>;
  lastname: Maybe<string>;
} {
  if (!fullName) return { firstname: null, lastname: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0], lastname: null };
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

