import { Models } from "@/db/mogodb/models";
import { SearchItem, SearchType, MAX_RESULTS } from "./search.types";
import { ApiError } from "@/core/middleware/error.middleware";

export class SearchRepository {
  /**
   * Search teams by keywords
   */
  async searchTeams(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { "team.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const teams = await Models.Team.find({
        $or: searchConditions,
      })
        .limit(MAX_RESULTS)
        .lean();

      return teams.map((team) => ({
        item: {
          id: team.korastats_id,
          name: team.name,
          image: team.logo,
        },
        metaData: {
          seasons: [], // TODO: Add seasons data if needed
        },
        type: "team",
      }));
    } catch (error) {
      console.error("Search teams error:", error);
      throw new ApiError(500, "Failed to search teams");
    }
  }

  /**
   * Search players by keywords
   */
  async searchPlayers(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { "player.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const players = await Models.Player.find({
        $or: searchConditions,
      })
        .limit(MAX_RESULTS)
        .lean();

      return players.map((player) => ({
        item: {
          id: player.korastats_id,
          name: player.name,
          photo: player.photo,
        },
        metaData: {
          seasons: [], // TODO: Add seasons data if needed
        },
        type: "player",
      }));
    } catch (error) {
      console.error("Search players error:", error);
      throw new ApiError(500, "Failed to search players");
    }
  }

  /**
   * Search leagues by keywords
   */
  async searchLeagues(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { "league.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const leagues = await Models.League.find({
        $and: [{ $or: searchConditions }, { type: "League" }],
      })
        .limit(MAX_RESULTS)
        .lean();

      return leagues.map((league) => ({
        item: {
          id: league.korastats_id,
          name: league.name,
          image: league.logo,
        },
        metaData: null,
        type: "league",
      }));
    } catch (error) {
      console.error("Search leagues error:", error);
      throw new ApiError(500, "Failed to search leagues");
    }
  }

  /**
   * Search cups by keywords
   */
  async searchCups(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { "league.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const cups = await Models.League.find({
        $and: [{ $or: searchConditions }, { type: "Cup" }],
      })
        .limit(MAX_RESULTS)
        .lean();

      return cups.map((cup) => ({
        item: {
          id: cup.korastats_id,
          name: cup.name,
          image: cup.logo,
        },
        metaData: null,
        type: "cup",
      }));
    } catch (error) {
      console.error("Search cups error:", error);
      throw new ApiError(500, "Failed to search cups");
    }
  }

  /**
   * Search fixtures by keywords
   */
  async searchFixtures(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { "teams.home.name": { $regex: keyword, $options: "i" } },
          { "teams.away.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const fixtures = await Models.Match.find({
        $and: [
          { $or: searchConditions },
          { "fixture.status.short": { $in: ["FT", "AET", "PEN"] } },
        ],
      })
        .sort({ "fixture.timestamp": -1 })
        .limit(MAX_RESULTS)
        .lean();

      return fixtures.map((fixture) => ({
        item: {
          id: fixture.korastats_id,
          name: `${fixture.teams?.home?.name || "Unknown"} vs ${fixture.teams?.away?.name || "Unknown"}`,
          homeTeam: fixture.teams?.home?.name || "Unknown",
          awayTeam: fixture.teams?.away?.name || "Unknown",
        },
        metaData: null,
        type: "fixture",
      }));
    } catch (error) {
      console.error("Search fixtures error:", error);
      throw new ApiError(500, "Failed to search fixtures");
    }
  }

  /**
   * Search referees by keywords
   */
  async searchReferees(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        "fixture.referee": { $regex: keyword, $options: "i" },
      }));

      const fixtures = await Models.Match.find({
        $and: [
          { $or: searchConditions },
          { "fixture.referee": { $exists: true, $ne: null } },
        ],
      })
        .limit(MAX_RESULTS)
        .lean();

      // Extract unique referees
      const refereeMap = new Map<string, SearchItem>();

      fixtures.forEach((fixture) => {
        const refereeName = fixture.fixture?.referee;
        if (refereeName && !refereeMap.has(refereeName)) {
          refereeMap.set(refereeName, {
            item: {
              id: fixture.korastats_id, // Using fixture ID as referee ID
              name: refereeName,
              image: `https://ui-avatars.com/api/?name=${encodeURIComponent(refereeName)}&size=256`,
            },
            metaData: null,
            type: "referee",
          });
        }
      });

      return Array.from(refereeMap.values()).slice(0, MAX_RESULTS);
    } catch (error) {
      console.error("Search referees error:", error);
      throw new ApiError(500, "Failed to search referees");
    }
  }

  /**
   * Search coaches by keywords
   */
  async searchCoaches(keywords: string[]): Promise<SearchItem[]> {
    try {
      const searchConditions = keywords.map((keyword) => ({
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { "coach.name": { $regex: keyword, $options: "i" } },
        ],
      }));

      const coaches = await Models.Coach.find({
        $or: searchConditions,
      })
        .limit(MAX_RESULTS)
        .lean();

      return coaches.map((coach) => ({
        item: {
          id: coach.korastats_id,
          name: coach.name,
          image: coach.photo,
        },
        metaData: null,
        type: "coach",
      }));
    } catch (error) {
      console.error("Search coaches error:", error);
      throw new ApiError(500, "Failed to search coaches");
    }
  }
}

