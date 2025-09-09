import {
  calcAge,
  extractLeagueInfo,
  firstDefined,
  generateGridPosition,
  getMatchStatus,
  mapPlayerStatsToStatistics,
  mapPlayerToTarget,
  pickBestPosition,
  POSITION_MAPPING,
  roundTo,
  splitName,
  toInt,
  toNum,
  uniqBy,
} from "./team-helpers";

export function mapTournamentTeamsList(apiResponse: any) {
  const tournament = apiResponse.data;

  return tournament.teams.map((t: any) => ({
    team: {
      id: t.id,
      name: t.team,
      code: null, // not in source
      country: tournament.season.includes("Saudi") ? "Saudi-Arabia" : null, // crude check
      founded: null, // not in source
      national: false, // assumption
      logo: `https://media.api-sports.io/football/teams/${t.id}.png`, // convention
    },
    venue: {
      id: t.stadium?.id || null,
      name: t.stadium?.name || null,
      address: null, // not in source
      city: null, // not in source
      capacity: null, // not in source
      surface: null, // not in source
      image: t.stadium?.id
        ? `https://media.api-sports.io/football/venues/${t.stadium.id}.png`
        : null,
    },
  }));
}

export function mapTeamInfo(teamInfoResp: any, entityTeamResp?: any) {
  // TeamInfo (map2)
  const ti = teamInfoResp?.data ?? {};
  const tiTeam = ti?.team ?? null; // { team_id, name, country, stadium, is_national_team, ... }
  const tiMatches: any[] = Array.isArray(ti?.matches) ? ti.matches : [];
  const tiPlayers: any[] = Array.isArray(tiTeam?.players) ? tiTeam.players : [];
  const tiTransfersRaw: any = ti?.transfers;
  const tiLeagues: any[] = Array.isArray(ti?.currentLeagues) ? ti.currentLeagues : [];
  const tiTrophies: any[] = Array.isArray(ti?.trophies) ? ti.trophies : [];

  // EntityTeam (map1)
  const et = entityTeamResp?.root?.object ?? null; // TEAM { id, name, club:{logo}, country:{name}, stadium:{...}, coach:{...}, ... }
  const etPlayers: any[] = Array.isArray(et?.players) ? et.players : [];

  // ---- Core fields ----------------------------------------------------------
  const teamId = firstDefined<number>(toInt(tiTeam?.team_id), toInt(et?.id));
  const teamName = firstDefined<string>(tiTeam?.name, et?.name, et?.club?.name);
  const teamLogo = firstDefined<string>(et?.club?.logo, tiTeam?.logo);
  const countryName = firstDefined<string>(
    tiTeam?.country?.country_name,
    et?.country?.name,
  );
  const isNational = !!firstDefined<boolean>(
    tiTeam?.is_national_team,
    et?.is_national_team,
  );

  // founded year (rare in given payloads)
  const founded = firstDefined<number>(toInt(tiTeam?.founded), toInt(et?.founded));

  // Stadium source preference: TeamInfo -> EntityTeam -> first match fallback
  const primaryStadium = tiTeam?.stadium || et?.stadium || null;
  const firstMatchStadium = tiMatches.find(Boolean)?.objStadium ?? null;

  const venueId = firstDefined<number>(
    toInt(primaryStadium?.stadium_id),
    toInt(primaryStadium?.id),
    toInt(firstMatchStadium?.intID),
  );

  const venueName = firstDefined<string>(
    primaryStadium?.stadium_name,
    primaryStadium?.name,
    firstMatchStadium?.strStadiumNameEn,
    firstMatchStadium?.strStadiumNameAr,
  );

  const venueAddress = firstDefined<string>(primaryStadium?.address);
  const venueCity = firstDefined<string>(primaryStadium?.city);
  const venueCapacity = firstDefined<number>(
    toInt(primaryStadium?.capacity),
    toInt(firstMatchStadium?.intCapacity),
  );

  const venueSurface = firstDefined<string>(primaryStadium?.surface);
  const venueImage = firstDefined<string>(primaryStadium?.image);

  // ---- Coaches --------------------------------------------------------------
  const rawCoaches: any[] = [];

  // From matches, with home/away relative to our teamId
  for (const m of tiMatches) {
    const homeId = toInt(m?.objHomeTeam?.intID);
    const awayId = toInt(m?.objAwayTeam?.intID);
    if (homeId && teamId && homeId === teamId && m?.objHomeCoach)
      rawCoaches.push(m.objHomeCoach);
    if (awayId && teamId && awayId === teamId && m?.objAwayCoach)
      rawCoaches.push(m.objAwayCoach);
  }

  // Current coach fallback: EntityTeam -> TeamInfo
  if (et?.coach?.id || et?.coach?.name) {
    rawCoaches.push({
      intID: et?.coach?.id,
      strCoachNameEn: et?.coach?.name,
      dtDOB: et?.coach?.dob || null,
      nationality: et?.coach?.nationality || null,
      photo: et?.coach?.photo || null,
      height: et?.coach?.height || null,
      weight: et?.coach?.weight || null,
      birth: {
        date: et?.coach?.dob || "",
        place: et?.coach?.birthplace || "",
        country: et?.coach?.birthcountry || "",
      },
    });
  } else if (tiTeam?.coach?.coach_id || tiTeam?.coach?.coach_name) {
    rawCoaches.push({
      intID: tiTeam?.coach?.coach_id,
      strCoachNameEn: tiTeam?.coach?.coach_name,
      dtDOB: null,
    });
  }

  const dedupedCoaches = uniqBy(rawCoaches, (c: any) => {
    const id = toInt(c?.intID ?? c?.id);
    return id ?? (c?.strCoachNameEn || c?.strNickNameAr || c?.name || null);
  });

  const coach = dedupedCoaches.map((c: any) => {
    const name =
      c?.strCoachNameEn ??
      c?.strCoachNameAr ??
      c?.strNickNameEn ??
      c?.strNickNameAr ??
      c?.name ??
      "Unknown Coach";
    const parts = splitName(name);
    const age = calcAge(c?.dtDOB);
    return {
      id: toInt(c?.intID ?? c?.id),
      name,
      firstname: parts.firstname,
      lastname: parts.lastname,
      age,
      birth: {
        date: c?.birth?.date || c?.dtDOB || "",
        place: c?.birth?.place || "",
        country: c?.birth?.country || "",
      },
      nationality: c?.nationality ?? null,
      height: c?.height ?? null,
      weight: c?.weight ?? null,
      photo: c?.photo ?? null,
      team: {
        id: teamId,
        name: teamName,
        logo: teamLogo,
      },
    };
  });

  // ---- Transfers ------------------------------------------------------------
  // If TeamInfo already returns transfers in final shape, keep them.
  // Otherwise you can add mapping here when you know the raw shape.
  const transfers = Array.isArray(tiTransfersRaw) ? tiTransfersRaw : [];

  // ---- Player-based stats (if players are available) ------------------------
  const players = tiPlayers.length ? tiPlayers : etPlayers;

  const totalPlayers = players.length ? players.length : null;

  const foreignPlayers =
    totalPlayers && countryName
      ? players.reduce((acc: number, p: any) => {
          const nat = (p?.nationality || p?.country || "")
            .toString()
            .trim()
            .toLowerCase();
          return acc + (nat && nat !== countryName.toLowerCase() ? 1 : 0);
        }, 0)
      : null;

  const ages: number[] = players
    .map((p: any) => calcAge(p?.birth?.date || p?.dob || p?.dateOfBirth))
    .filter((a: number | null): a is number => a !== null);

  const averagePlayerAge = ages.length
    ? roundTo(ages.reduce((s, a) => s + a, 0) / ages.length, 1)
    : null;

  // ---- Club valuation / leagues / trophies ---------------------------------
  const clubMarketValue = ti?.clubMarketValue ?? et?.marketValue ?? null;

  // Leagues: prefer TeamInfo; fallback to EntityTeam tournaments if present
  const currentLeagues = tiLeagues.length
    ? tiLeagues
    : Array.isArray(et?.tournaments)
      ? et.tournaments.map((t: any) => ({
          league: t?.name ?? t?.tournament ?? null,
          season: t?.season ?? null,
          country: t?.country ?? null,
        }))
      : [];

  // Trophies: prefer TeamInfo; fallback to EntityTeam honours if present
  const trophies = tiTrophies.length
    ? tiTrophies
    : Array.isArray(et?.honours)
      ? et.honours.map((h: any) => ({
          league: h?.competition ?? h?.league ?? null,
          country: h?.country ?? countryName ?? null,
          season: (h?.season ?? h?.year ?? "")?.toString(),
        }))
      : [];

  const out = {
    team: {
      id: teamId,
      name: teamName,
      code: null,
      country: countryName,
      founded: founded,
      national: isNational,
      logo: teamLogo,
    },
    venue: {
      id: venueId,
      name: venueName,
      address: venueAddress,
      city: venueCity,
      capacity: venueCapacity,
      surface: venueSurface,
      image: venueImage,
    },
    coach,
    transfers,
    totalPlayers,
    foreignPlayers,
    averagePlayerAge,
    clubMarketValue,
    currentLeagues,
    trophies,
  };

  return out;
}

export function mapStatsToTeam(apiResponse: any, leagueInfo: any) {
  const statsById = Object.fromEntries(
    apiResponse.data.stats.map((s: any) => [s.stat.toLowerCase(), s.value]),
  );

  // Helper to find stats by keyword
  const getStat = (keywords: string[], defaultValue: any = 0) => {
    for (const key in statsById) {
      if (keywords.some((k) => key.includes(k.toLowerCase()))) {
        return statsById[key];
      }
    }
    return defaultValue;
  };

  return {
    league: {
      id: leagueInfo?.id || 0,
      name: leagueInfo?.name || "Unknown League",
      country: leagueInfo?.country || "Unknown",
      logo: leagueInfo?.logo || "",
      flag: leagueInfo?.flag || "",
      season: leagueInfo?.season || new Date().getFullYear(),
    },
    team: {
      id: apiResponse.data.id,
      name: apiResponse.data.name,
      logo: apiResponse.team?.logo || "",
    },
    fixtures: {
      played: {
        home: getStat(["home played"]),
        away: getStat(["away played"]),
        total: getStat(["matches played"]),
      },
      wins: {
        home: getStat(["home win"]),
        away: getStat(["away win"]),
        total: getStat(["win"]),
      },
      draws: {
        home: getStat(["home draw"]),
        away: getStat(["away draw"]),
        total: getStat(["draw"]),
      },
      loses: {
        home: getStat(["home lose", "home lost"]),
        away: getStat(["away lose", "away lost"]),
        total: getStat(["lost"]),
      },
    },
    goals: {
      for_: {
        total: {
          home: getStat(["goals scored home"]),
          away: getStat(["goals scored away"]),
          total: getStat(["goals scored"]),
        },
      },
      against: {
        total: {
          home: getStat(["goals conceded home"]),
          away: getStat(["goals conceded away"]),
          total: getStat(["goals conceded"]),
        },
      },
    },
    team_attacking: {
      assists: getStat(["assist"]),
      goals_scored_by_head: getStat(["head"]),
      goals_scored_by_left: getStat(["left foot"]),
      goals_scored_by_right: getStat(["right foot"]),
      total_attempts: getStat(["total attempts"]),
      success_attempts: getStat(["success attempts"]),
      penalty_scored: getStat(["penalty scored"]),
      penalty_missed: getStat(["penalty missed"]),
      chances_created: getStat(["chance created"]),
    },
    team_passing: {
      total_passes: getStat(["total passes"]),
      success_passes: getStat(["success passes"]),
      total_long_pass: getStat(["total long pass"]),
      success_long_pass: getStat(["success long pass"]),
      total_short_pass: getStat(["total short pass"]),
      success_short_pass: getStat(["success short pass"]),
      total_crosses: getStat(["total crosses"]),
      success_crosses: getStat(["success crosses"]),
      failed_crosses: getStat(["failed crosses"]),
    },
    team_defending: {
      tackles_won: getStat(["tacklewon"]),
      tackles_failed: getStat(["tacklefail"]),
      interceptions: getStat(["interceptwon"]),
      goals_saved: getStat(["goals saved"]),
      fouls_committed: getStat(["fouls commited"]),
      yellow_cards: getStat(["yellow card"]),
      red_cards: getStat(["red card"]),
      clean_sheet: getStat(["clean sheet"]),
    },
    team_others: {
      offsides: getStat(["offsides"]),
      corners: getStat(["corners"]),
      ball_won: getStat(["ball won"]),
      ball_lost: getStat(["ball lost"]),
      dribble_success: getStat(["dribble success"]),
      dribble_fail: getStat(["dribble fail"]),
      possession: getStat(["possession"]),
      minutes_played: getStat(["minutes played"]),
    },
    average_team_rating: getStat(["xg"], null),
    rank: getStat(["rank"], null),
    rank_total: getStat(["rank total"], null),
  };
}

export function mapTeamFixtures(apiResponse: any, leagueData: any) {
  const response = apiResponse.data;
  const leagueRoot = leagueData?.data;

  function dateToTimestamp(dateString: string) {
    if (!dateString) return null;
    return Math.floor(new Date(dateString).getTime() / 1000);
  }

  function calculatePeriods(timestamp: number | null) {
    if (!timestamp) return { first: null, second: null };
    return {
      first: timestamp,
      second: timestamp + 45 * 60, // 45 minutes later
    };
  }

  const league = extractLeagueInfo(leagueRoot);

  const venue = response?.team?.stadium;
  const fixtures: any[] = [];

  if (!response?.matches || !Array.isArray(response.matches)) {
    return fixtures;
  }

  response.matches.forEach((match: any) => {
    const timestamp = dateToTimestamp(match.dtDateTime);
    const periods = calculatePeriods(timestamp);
    const matchStatus = getMatchStatus(match.objStatus);

    const homeWinner = (match.intHomeTeamScore ?? -1) > (match.intAwayTeamScore ?? -1);
    const awayWinner = (match.intAwayTeamScore ?? -1) > (match.intHomeTeamScore ?? -1);

    const mappedFixture = {
      fixture: {
        id: match.intID,
        referee:
          match.objReferee?.strRefereeNameEn ||
          match.objReferee?.strRefereeNameAr ||
          "Unknown Referee",
        timezone: "UTC",
        date: match.dtDateTime,
        timestamp,
        periods,
        venue: {
          id: match.objStadium?.intID || venue?.stadium_id || null,
          name:
            match.objStadium?.strStadiumNameEn ||
            match.objStadium?.strStadiumNameAr ||
            venue?.stadium_name ||
            null,
          city: match.objStadium?.strCity || null,
        },
        status: matchStatus,
      },

      // >>> filled dynamically from leagueData
      league: {
        id: league.id,
        name: league.name,
        country: league.country,
        logo: league.logo, // null unless present in leagueData
        flag: league.flag, // null unless present in leagueData
        season: league.season,
        round: league.round, // e.g., "Main - Main" if present
      },

      teams: {
        home: {
          id: match.objHomeTeam?.intID || null,
          name:
            match.objHomeTeam?.strTeamNameEn ||
            match.objHomeTeam?.strTeamNameAr ||
            "Home Team",
          logo: null,
          winner: homeWinner,
        },
        away: {
          id: match.objAwayTeam?.intID || null,
          name:
            match.objAwayTeam?.strTeamNameEn ||
            match.objAwayTeam?.strTeamNameAr ||
            "Away Team",
          logo: null,
          winner: awayWinner,
        },
      },
      goals: {
        home: match.intHomeTeamScore ?? 0,
        away: match.intAwayTeamScore ?? 0,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: {
          home: match.intHomeTeamScore ?? null,
          away: match.intAwayTeamScore ?? null,
        },
        extratime: {
          home: match.boolExtraTime ? match.intHomeTeamScore : null,
          away: match.boolExtraTime ? match.intAwayTeamScore : null,
        },
        penalty: {
          home: match.intPenaltyShootoutHomeScore ?? null,
          away: match.intPenaltyShootoutAwayScore ?? null,
        },
      },
      tablePosition: { home: null, away: null },
      averageTeamRating: { home: null, away: null },
    };

    fixtures.push(mappedFixture);
  });

  return fixtures;
}

export function mapTeamSquads(
  apiResponse: any,
  tournamentInfo: any,
  teamId?: number,
  perPlayerPayloads?: Array<{
    playerId: number;
    info: any;
    entity: any;
    stats: any; // can be either the full wrapper or already the raw array in your current logs
  } | null>,
) {
  const tournament = apiResponse?.data;
  if (!tournament?.teams || !Array.isArray(tournament.teams)) return [];

  const team = tournament.teams.find((t: any) => String(t.id) === String(teamId)) || null;
  if (!team || !Array.isArray(team.players)) return [];

  const basePlayers: any[] = team.players;

  // lookups for per-player payloads
  const infoById = new Map<number, any>();
  const statsById = new Map<number, any>();
  const entityById = new Map<number, any>();

  for (const entry of perPlayerPayloads || []) {
    if (!entry?.playerId) continue;
    const pid = toNum(entry.playerId);
    if (pid == null) continue;

    // In your service you did .then(r => r.data), so info/stats are already the .data payload.
    // Your logs show 'info' is a flat player object (not {data:{player}}), so we store as-is.
    if (entry.info) infoById.set(pid, entry.info);

    // IMPORTANT: stats may be either {result, message, data:{...}} OR already an array (your logs).
    // We keep whatever we got; we'll normalize later per player.
    if (entry.stats) statsById.set(pid, entry.stats);

    if (entry.entity) entityById.set(pid, entry.entity);
  }

  const tournamentMeta = tournamentInfo?.data || null;

  return [
    {
      team: {
        id: team?.id ?? null,
        name: team?.team ?? null,
        logo: team?.logo ?? null,
      },
      players: basePlayers.map((p: any) => {
        const baseId = toNum(p?.id);
        const info = baseId ? infoById.get(baseId) : undefined;
        let statsRaw = baseId ? statsById.get(baseId) : undefined;

        // ---- NORMALIZE STATS SHAPE ----
        // If statsRaw is already an array of STATs (like in your console.log), wrap it.
        // Else if it's a {data:{stats:[...]}} wrapper, keep as-is.
        const statsPayload = Array.isArray(statsRaw)
          ? { data: { stats: statsRaw } }
          : statsRaw && statsRaw.data && Array.isArray(statsRaw.data.stats)
            ? statsRaw
            : null;

        // info is already a flat player object in your logs (no need for .data.player)
        const infoPlayer = info;

        // Names — base → PlayerInfo → Stats
        const baseFull = p?.nickname || p?.name || null;
        const infoFull =
          infoPlayer?.strNickNameEn ||
          infoPlayer?.strPlayerNameEn ||
          infoPlayer?.strNickNameAr ||
          infoPlayer?.strPlayerNameAr ||
          null;
        const statsFull =
          statsPayload?.data?.nick_name || statsPayload?.data?.name || null;
        const fullName = baseFull || infoFull || statsFull;

        const [fn, ...lnRest] = (fullName || "").split(" ").filter(Boolean);
        const finalFirst = p?.name ? p.name.split(" ")[0] : fn || null;
        const finalLast = p?.name
          ? p.name.split(" ").slice(1).join(" ") || null
          : lnRest.length
            ? lnRest.join(" ")
            : null;

        // DOB — PlayerInfo → base → PlayerStats
        const dob = infoPlayer?.dtDOB || p?.dob || statsPayload?.data?.dob || null;
        const birthDate = dob ? new Date(dob) : null;
        const age =
          birthDate && !isNaN(birthDate.getTime())
            ? new Date().getFullYear() - birthDate.getFullYear()
            : null;

        // Number — base → PlayerInfo → PlayerStats
        const number =
          p?.number ??
          infoPlayer?.intShirtNumber ??
          statsPayload?.data?.shirt_number ??
          null;

        // Position — base(primary) → PlayerStats
        const position =
          p?.position?.primary?.name ?? statsPayload?.data?.primary_position ?? null;

        const nationalityName = p?.nationality?.name ?? null;

        const out = {
          player: {
            id: baseId ?? null,
            name: fullName,
            firstname: finalFirst,
            lastname: finalLast,
            age,
            birth: {
              date: dob,
              place: p?.birthplace ?? null,
              country: nationalityName,
            },
            nationality: nationalityName,
            height: p?.height ?? null,
            weight: p?.weight ?? null,
            injured: p?.injured ?? false,
            photo: p?.photo ?? infoPlayer?.photo ?? null,
          },
          statistics: [
            {
              team: {
                id: team?.id ?? null,
                name: team?.team ?? null,
                logo: team?.logo ?? null,
              },
              league: {
                id: tournament?.id ?? null,
                name: tournament?.tournament ?? null,
                country: tournamentMeta?.organizer?.country?.name ?? null,
                logo: tournamentMeta?.logo ?? null,
                flag: tournamentMeta?.flag ?? null,
                season: tournament?.season ?? null,
              },
              // Start empty; we'll fill from stats mapper below
              games: {
                appearences: null,
                lineups: null,
                minutes: null,
                number,
                position,
                rating: null,
                captain: false,
              },
              substitutes: { in_: null, out: null, bench: null },
              shots: { total: null, on: null },
              goals: { total: null, conceded: null, assists: null, saves: null },
              passes: { total: null, key: null, accuracy: null },
              tackles: { total: null, blocks: null, interceptions: null },
              duels: { total: null, won: null },
              dribbles: { attempts: null, success: null, past: null },
              fouls: { drawn: null, committed: null },
              cards: { yellow: null, yellowred: null, red: null },
              penalty: {
                won: null,
                commited: null,
                scored: null,
                missed: null,
                saved: null,
              },
            },
          ],
        };

        // ---- MERGE TournamentPlayerStats (highest priority) ----
        if (statsPayload) {
          console.log(
            "STATS LEN:",
            statsPayload?.data?.stats?.length,
            "PLAYER:",
            baseId,
            "NAME:",
            fullName,
          );

          const hasStats =
            Array.isArray(statsPayload?.data?.stats) &&
            statsPayload.data.stats.length > 0;

          if (hasStats) {
            const s = mapPlayerStatsToStatistics(statsPayload);
            const st0 = out.statistics[0];

            Object.assign(st0.games, {
              appearences: st0.games.appearences ?? s.games.appearences,
              lineups: st0.games.lineups ?? s.games.lineups,
              minutes: st0.games.minutes ?? s.games.minutes,
              number: st0.games.number ?? s.games.number,
              position: st0.games.position ?? s.games.position,
            });
            Object.assign(st0.shots, s.shots);
            Object.assign(st0.goals, s.goals);
            Object.assign(st0.passes, s.passes);
            Object.assign(st0.tackles, s.tackles);
            Object.assign(st0.duels, s.duels);
            Object.assign(st0.dribbles, s.dribbles);
            Object.assign(st0.fouls, s.fouls);
            Object.assign(st0.cards, s.cards);
            Object.assign(st0.penalty, s.penalty);
          } else {
            // Fallback: enrich from PlayerInfo (shirt number, position id, DOB/age)
            const st0 = out.statistics[0];

            // shirt number
            st0.games.number = st0.games.number ?? infoPlayer?.intShirtNumber ?? null;

            // position via mapping
            st0.games.position =
              st0.games.position ?? pickBestPosition(p, infoPlayer, statsPayload);

            // dob/age (in case base didn't have it)
            const dob = out.player.birth.date ?? infoPlayer?.dtDOB ?? null;
            out.player.birth.date = dob;
            if (dob && !out.player.age) {
              const d = new Date(dob);
              if (!isNaN(d.getTime()))
                out.player.age = new Date().getFullYear() - d.getFullYear();
            }
          }
        }

        return out;
      }),
    },
  ];
}

export function mapTeamFormOverview(apiResponse: any) {
  const matches = Array.isArray(apiResponse?.data) ? apiResponse.data : [];
  if (!matches.length) return [];

  const toUnix = (dt?: string | null) => {
    if (!dt) return null;
    const iso = dt.replace(" ", "T") + "Z";
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : Math.floor(t / 1000);
  };

  const toIso = (dt?: string | null) => {
    if (!dt) return null;
    const d = new Date(dt.replace(" ", "T") + "Z");
    return isNaN(+d) ? null : d.toISOString();
  };

  const seasonYear = (season: unknown): number | null => {
    if (typeof season === "number") return season;
    if (typeof season === "string") {
      const m = season.match(/\b(19|20)\d{2}\b/g);
      return m ? Number(m[m.length - 1]) : null;
    }
    return null;
  };

  const roundLabel = (r: unknown) =>
    typeof r === "number" ? `Round - ${r}` : typeof r === "string" && r.trim() ? r : null;

  const mapStatus = (s?: string, home?: number, away?: number) => {
    const v = (s || "").toLowerCase();
    if (v === "scheduled") return { long: "Match Scheduled", short: "NS", elapsed: null };
    if (v === "approved" || v === "analyzed")
      return { long: "Match Finished", short: "FT", elapsed: 90 };
    if (typeof home === "number" && typeof away === "number")
      return { long: "Match Finished", short: "FT", elapsed: 90 };
    return { long: "Match Scheduled", short: "NS", elapsed: null };
  };

  return matches.map((m: any) => {
    const ts = toUnix(m?.dateTime);
    const status = mapStatus(m?.status?.status, m?.score?.home, m?.score?.away);

    const homeGoals = Number.isFinite(m?.score?.home) ? m.score.home : null;
    const awayGoals = Number.isFinite(m?.score?.away) ? m.score.away : null;

    const homeWinner =
      homeGoals !== null && awayGoals !== null
        ? homeGoals > awayGoals
          ? true
          : homeGoals < awayGoals
            ? false
            : null
        : null;

    return {
      fixture: {
        id: m?.matchId ?? null,
        referee: m?.referee?.name || "Unknown Referee",
        timezone: "UTC",
        date: toIso(m?.dateTime),
        timestamp: ts,
        periods: ts ? { first: ts, second: ts + 45 * 60 } : { first: null, second: null },
        venue: {
          id: m?.stadium?.id ?? null,
          name: m?.stadium?.name ?? null,
          city: null,
        },
        status,
      },
      // league === tournament (by name); IDs/logos not present in map1, so null
      league: {
        id: null,
        name: m?.tournament ?? null, // ← tournament → league.name
        country: null,
        logo: null,
        flag: null,
        season: seasonYear(m?.season),
        round: roundLabel(m?.round),
      },
      teams: {
        home: {
          id: m?.home?.id ?? null,
          name: m?.home?.name ?? "Home Team",
          logo: null,
          winner: homeWinner,
        },
        away: {
          id: m?.away?.id ?? null,
          name: m?.away?.name ?? "Away Team",
          logo: null,
          winner: homeWinner === null ? null : !homeWinner,
        },
      },
      goals: {
        home: homeGoals ?? 0,
        away: awayGoals ?? 0,
      },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home: homeGoals, away: awayGoals },
        extratime: { home: null, away: null },
        penalty: { home: null, away: null },
      },
      tablePosition: { home: null, away: null },
      averageTeamRating: { home: null, away: null },
    };
  });
}

// Main mapping function
export function mapTeamLineup(apiResponse: any) {
  const data = apiResponse.data;
  console.log(data);

  if (!data) return [];

  // Sort players by position for proper grid assignment
  const sortedLineup = [...(data.lineUpFormation || [])].sort((a, b) => {
    const posOrder: Record<string, number> = { GK: 1, DF: 2, MF: 3, FW: 4 };
    return (
      (posOrder[a.player.strPositionClass] || 5) -
      (posOrder[b.player.strPositionClass] || 5)
    );
  });

  // Group players by position class for grid assignment
  const positionGroups: Record<string, any[]> = {
    GK: [],
    DF: [],
    MF: [],
    FW: [],
  };

  sortedLineup.forEach((p) => {
    const posClass = p.player.strPositionClass || "MF";
    if (positionGroups[posClass]) {
      positionGroups[posClass].push(p);
    }
  });

  // Map starting XI with proper grid positions
  const startXI = sortedLineup.map((p: any, globalIndex: number) => {
    const player = p.player;
    const posClass = player.strPositionClass || "MF";
    const positionIndex = positionGroups[posClass].findIndex(
      (gp: any) => gp.player.intPlayerID === player.intPlayerID,
    );

    const position = POSITION_MAPPING[player.strPositionEn] || "M";
    const grid = generateGridPosition(
      data.lineupFormationName || "1-433",
      player.strPositionEn,
      positionIndex,
    );

    return {
      player: {
        id: player.intPlayerID || 0,
        name: player.strNickNameEn || player.strFullNameEn || "Unknown Player",
        number: player.intShirtNumber || 0,
        photo: null,
        rating: "0",
        pos: position,
        grid: grid,
      },
    };
  });

  // Handle substitutes
  const substitutes = (data.endOfMatchFormation || [])
    .filter((p: any) => p.player.status === "substitute")
    .map((p: any) => ({
      player: {
        id: p.player.intPlayerID || 0,
        name: p.player.strNickNameEn || p.player.strFullNameEn || "Unknown Player",
        number: p.player.intShirtNumber || 0,
        photo: null,
        rating: "0",
        pos: POSITION_MAPPING[p.player.strPositionEn] || "M",
        grid: null, // Substitutes don't need grid positions
      },
    }));

  return [
    {
      team: {
        id: data.teamId || 0,
        name: data.teamName || "Unknown Team",
        logo: null,
        colors: {
          player: { primary: null, number: null, border: null },
          goalkeeper: { primary: null, number: null, border: null },
        },
      },
      formation: data.lineupFormationName?.replace("1-", "") || "433",
      startXI: startXI,
      substitutes: substitutes,
      coach: {
        id: data.coach?.id,
        name: data.coach?.name,
        photo: null,
      },
    },
  ];
}

