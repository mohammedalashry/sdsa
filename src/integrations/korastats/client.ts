import axios, { AxiosInstance } from "axios";
import { ApiError } from "../../core/middleware/error.middleware";
import {
  mapStatsToTeam,
  mapTeamFixtures,
  mapTeamFormOverview,
  mapTeamInfo,
  mapTeamLineup,
  mapTeamSquads,
  mapTournamentTeamsList,
} from "@/mappers/team-comprehensive.mapper";

function createLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    active--;
    if (queue.length) queue.shift()!();
  };
  return async function <T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await task();
    } finally {
      next();
    }
  };
}

export class KorastatsClient {
  public readonly http: AxiosInstance;
  private readonly KORASTATS_API_ENDPOINT: string;
  private readonly KORASTATS_API_KEY: string;

  constructor() {
    this.KORASTATS_API_ENDPOINT =
      process.env.KORASTATS_API_ENDPOINT || "https://korastats.pro/pro/api.php";
    this.KORASTATS_API_KEY = process.env.KORASTATS_API_KEY || "c2RzYTpTZFNAU0A=";

    // Debug logging for deployment - using multiple methods to ensure visibility
    console.log("🔑 Korastats API Configuration:");
    console.log("   Endpoint:", this.KORASTATS_API_ENDPOINT);
    console.log("   Key from env:", process.env.KORASTATS_API_KEY ? "SET" : "NOT SET");
    console.log("   Key value:", this.KORASTATS_API_KEY);
    console.error("🔑 KORASTATS CLIENT INITIALIZED - Key:", this.KORASTATS_API_KEY);
    process.stdout.write(`🔑 KORASTATS CLIENT INIT - Key: ${this.KORASTATS_API_KEY}\n`);

    this.http = axios.create({
      baseURL: this.KORASTATS_API_ENDPOINT,
      timeout: 50000,
      params: {
        key: this.KORASTATS_API_KEY,
        module: "api",
        version: "V2",
        response: "json",
        lang: "en",
      },
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log("error", this.http.defaults.params);
        console.error("Korastats API Error:", error.response?.data || error.message);
        throw new ApiError(
          error.response?.status || 500,
          `Korastats API Error: ${error.response?.data?.message || error.message}`,
        );
      },
    );
  }

  async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    try {
      console.log(`🔍 Making Korastats API request to: ${endpoint}`);
      console.log(`🔑 Using API Key: ${this.KORASTATS_API_KEY}`);
      console.log(`📡 Request params:`, { api: endpoint, ...params });

      const { data } = await this.http.get("", {
        params: {
          api: endpoint,
          ...params,
        },
      });
      //console.log("data", data, "params", data.params);
      return data;
    } catch (error) {
      console.error(`Korastats ${endpoint} request failed:`, error);
      throw error;
    }
  }

  // ========== OLD INTEGRATION METHODS (from docs) ==========
  async getTeamList(leagueId: number, season: string) {
    try {
      const { data } = await this.http.get("", {
        params: {
          api: "TournamentTeamList",
          tournament_id: leagueId,
          season,
        },
      });

      const mapped = mapTournamentTeamsList(data);
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamInfo(team: number) {
    try {
      const { data: teamInfo } = await this.http.get("", {
        params: {
          api: "TeamInfo",
          team_id: team,
        },
      });

      const { data: entityTeam } = await this.http.get("", {
        params: {
          api: "EntityTeam",
          team_id: team,
        },
      });

      const mapped = mapTeamInfo(teamInfo, entityTeam);
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamStats(leagueId: number, teamId: number) {
    try {
      const { data } = await this.http.get("", {
        params: {
          api: "TournamentTeamStats",
          tournament_id: leagueId,
          team_id: teamId,
        },
      });

      const mapped = mapStatsToTeam(data, {});
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamFixtures(teamId: number, leagueId: number) {
    try {
      // 1) Get league structure
      const { data: leagueResponse } = await this.http.get("", {
        params: { api: "TournamentStructure", tournament_id: leagueId },
      });

      const groups = leagueResponse?.data?.stages?.[0]?.groups ?? [];
      const teamsInGroups = groups.flatMap((g: any) => g?.teams ?? []);
      const teamExists = teamsInGroups.some((t: any) => Number(t?.id) === Number(teamId));
      const leagueData = teamExists ? leagueResponse : null;

      // 2) Get team info / fixtures
      const { data: fixtureData } = await this.http.get("", {
        params: { api: "TeamInfo", team_id: teamId },
      });

      // 3) Map
      const mapped = mapTeamFixtures(fixtureData, leagueData);
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamSquad(league: number, teamId: number) {
    try {
      // 1) Base squad list (teams + players) for the tournament
      const { data: teamListResp } = await this.http.get("", {
        params: { api: "TournamentTeamPlayerList", tournament_id: league },
      });

      // 2) Tournament meta (for league block)
      const { data: tournamentInfo } = await this.http.get("", {
        params: { api: "TournamentStructure", tournament_id: league },
      });

      // Pick the desired team early to avoid unnecessary calls
      const tournament = teamListResp?.data;
      const team =
        tournament?.teams?.find((t: any) => String(t.id) === String(teamId)) || null;

      if (!team || !Array.isArray(team.players)) {
        return mapTeamSquads(teamListResp, tournamentInfo, teamId, []);
      }

      const basePlayers: any[] = team.players;

      // 3) Per-player enrichment
      const limit = createLimiter(5);
      const perPlayerPayloads = await Promise.all(
        basePlayers.map((p: any) =>
          limit(async () => {
            const playerId = p?.id;
            if (!playerId)
              return { playerId: null, info: null, entity: null, stats: null };

            const [statsResp, infoResp, entityResp] = await Promise.all([
              this.http
                .get("", {
                  params: {
                    api: "TournamentPlayerStats",
                    tournament_id: league,
                    player_id: playerId,
                  },
                })
                .then((r) => r.data)
                .catch(() => null),
              this.http
                .get("", { params: { api: "PlayerInfo", player_id: playerId } })
                .then((r) => r.data)
                .catch(() => null),
              this.http
                .get("", { params: { api: "EntityPlayer", player_id: playerId } })
                .then((r) => r.data)
                .catch(() => null),
            ]);

            return {
              playerId,
              info: infoResp,
              entity: entityResp,
              stats: statsResp,
            };
          }),
        ),
      );

      // 4) Map + merge
      const mapped = mapTeamSquads(
        teamListResp,
        tournamentInfo,
        teamId,
        perPlayerPayloads,
      );

      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamFormOverview(league: number) {
    try {
      const { data } = await this.http.get("", {
        params: {
          api: "TournamentMatchList",
          tournament_id: league,
        },
      });

      const mapped = await mapTeamFormOverview(data);
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }

  async getTeamLineup(league: number) {
    try {
      const { data } = await this.http.get("", {
        params: {
          api: "MatchSummary",
          match_id: 8200,
        },
      });

      const mapped = await mapTeamLineup(data);
      return mapped;
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
  }
}

