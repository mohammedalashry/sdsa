import { TournamentData } from "@/db/mogodb/schemas/tournament-data.schema";
import { FixtureData } from "@/legacy-types/fixtures.types";
import { KorastatsMongoService } from "@/db/mogodb/connection";

export class KorastatsMongoStorage {
  private mongoService: KorastatsMongoService;

  constructor() {
    this.mongoService = new KorastatsMongoService();
  }

  async connect(): Promise<void> {
    await this.mongoService.connect();
  }

  async disconnect(): Promise<void> {
    await this.mongoService.disconnect();
  }
  /**
   * Search matches by various criteria
   */
  async searchMatches(criteria: {
    tournamentId?: number;
    teamId?: number;
    date?: string;
    status?: "upcoming" | "finished";
    limit?: number;
  }): Promise<any[]> {
    try {
      // Use the original TournamentData model directly
      const query: any = {};
      if (criteria.tournamentId) {
        query.tournamentId = criteria.tournamentId;
      }

      console.log(`🔍 MongoDB Query:`, query);
      console.log(`🔍 TournamentData model ready state:`, TournamentData.db?.readyState);

      const tournament = await TournamentData.findOne(query);
      if (!tournament) {
        return [];
      }

      let matches = tournament.matches;

      // Filter by team
      if (criteria.teamId) {
        const teamMatchIds =
          tournament.searchIndex.teamMatches.get(criteria.teamId.toString() as any) || [];
        matches = matches.filter((m) => teamMatchIds.includes(m.matchId));
      }

      // Filter by date
      if (criteria.date) {
        const dateMatchIds =
          tournament.searchIndex.matchesByDate.get(criteria.date) || [];
        matches = matches.filter((m) => dateMatchIds.includes(m.matchId));
      }

      // Filter by status
      if (criteria.status === "upcoming") {
        matches = matches.filter((m) =>
          tournament.searchIndex.upcomingMatches.includes(m.matchId),
        );
      } else if (criteria.status === "finished") {
        matches = matches.filter((m) =>
          tournament.searchIndex.finishedMatches.includes(m.matchId),
        );
      }

      // Apply limit
      if (criteria.limit && criteria.limit > 0) {
        matches = matches.slice(0, criteria.limit);
      }

      return matches;
    } catch (error) {
      console.error("❌ Failed to search matches:", error);
      return [];
    }
  }

  /**
   * Get single match by ID
   */
  async getMatchById(matchId: number): Promise<any | null> {
    try {
      const tournament = await TournamentData.findOne({
        "matches.matchId": matchId,
      });

      if (!tournament) {
        return null;
      }

      const match = tournament.matches.find((m) => m.matchId === matchId);
      return match || null;
    } catch (error) {
      console.error(`❌ Failed to get match ${matchId}:`, error);
      return null;
    }
  }

  /**
   * Get all tournaments summary
   */
  async getTournamentsInfo(): Promise<any[]> {
    try {
      const tournaments = await TournamentData.find(
        {},
        {
          tournamentId: 1,
          tournamentName: 1,
          country: 1,
          season: 1,
          lastUpdated: 1,
          "matches.matchId": 1,
        },
      );

      return tournaments.map((t) => ({
        id: t.tournamentId,
        name: t.tournamentName,
        country: t.country,
        season: t.season,
        lastUpdated: t.lastUpdated,
        totalMatches: t.matches?.length || 0,
      }));
    } catch (error) {
      console.error("❌ Failed to get tournaments info:", error);
      return [];
    }
  }
}

export default KorastatsMongoStorage;

