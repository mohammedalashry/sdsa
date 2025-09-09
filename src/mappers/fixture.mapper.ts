// ============================================================================
// src/integrations/korastats/mappers/fixture.mapper.ts
import {
  FixtureData,
  FixtureDetailed,
  Fixture,
  FixtureLeague,
  FixtureTeams,
  FixtureGoals,
  FixtureScore,
} from "@/legacy-types/fixtures.types";
import { FixtureDetailMapper } from "./fixture-detail.mapper";

export class FixtureMapper {
  /**
   * Map KoraStats match data to Django FixtureData format
   */
  async mapToFixtureData(
    rawMatch: any,
    teamLogosMap?: Map<number, string>,
  ): Promise<FixtureData | "-"> {
    try {
      if (!rawMatch || !rawMatch.matchDetails) {
        console.warn("⚠️ Invalid raw match data for mapping");
        return "-";
      }

      const matchData = rawMatch.matchDetails;
      const matchSummary = rawMatch.matchSummary;

      // Debug: Log the structure we're working with
      console.log(`🔍 Mapping match ${rawMatch.matchId}:`);
      console.log(`  - Home team: ${matchData.home?.name || "N/A"}`);
      console.log(`  - Away team: ${matchData.away?.name || "N/A"}`);
      console.log(
        `  - Score: ${matchData.score?.home || 0} - ${matchData.score?.away || 0}`,
      );
      console.log(`  - Tournament: ${matchData.tournament || "N/A"}`);
      console.log(`  - Season ID: ${matchData.seasonId || "N/A"}`);

      // Build fixture object matching Django format exactly
      const fixture: Fixture = {
        id: rawMatch.matchId,
        referee: matchData.referee?.name || "-",
        timezone: "Asia/Riyadh", // Default for Saudi Arabia
        date: this.formatDate(matchData.dateTime),
        timestamp: this.convertToTimestamp(matchData.dateTime),
        periods: {
          first: 0, // TODO: Extract from match data if available
          second: 0,
        },
        venue: {
          id: matchData.stadium?.id || "-",
          name: matchData.stadium?.name || "-",
          city: matchData.stadium?.city || "-", // TODO: Extract from stadium data
        },
        status: this.mapMatchStatus(matchData, matchSummary),
      };

      const league: FixtureLeague = {
        id: matchData.seasonId || 0,
        name: matchData.tournament || "Unknown Tournament",
        country: "Saudi Arabia", // Default
        logo: "", // TODO: Add tournament logo mapping
        flag: "https://media.api-sports.io/flags/sa.svg", // Saudi Arabia flag
        season: 2024, // Current season
        round: matchData.round || "Regular Season",
      };

      const teams: FixtureTeams = {
        home: {
          id: matchData.home?.id || 0,
          name: matchData.home?.name || "Unknown Home Team",
          logo: teamLogosMap?.get(matchData.home?.id) || "",
          winner: this.determineWinner(matchData, "home") as boolean,
        },
        away: {
          id: matchData.away?.id || 0,
          name: matchData.away?.name || "Unknown Away Team",
          logo: teamLogosMap?.get(matchData.away?.id) || "",
          winner: this.determineWinner(matchData, "away") as boolean,
        },
      };

      const goals: FixtureGoals = {
        home: matchData.score?.home || "-",
        away: matchData.score?.away || "-",
      };

      // Calculate score breakdown from match summary if available
      const score: FixtureScore = this.calculateScoreBreakdown(matchSummary);

      // Build final FixtureData object
      const fixtureData: FixtureData = {
        fixture,
        league,
        teams,
        goals,
        score,
        tablePosition: { home: 0, away: 0 }, // TODO: Implement standings lookup
        averageTeamRating: {
          home: 7.5, // Default rating
          away: 7.5,
        },
      };

      return fixtureData;
    } catch (error) {
      console.error("❌ Failed to map fixture data:", error);
      return "-";
    }
  }

  /**
   * Map to detailed fixture format using comprehensive mappers
   */
  async mapToFixtureDetailed(rawMatch: any): Promise<FixtureDetailed | "-"> {
    try {
      console.log("🔄 Mapping detailed fixture data...");

      // Get basic fixture data
      const fixtureData = await this.mapToFixtureData(rawMatch);
      if (!fixtureData) {
        return "-";
      }

      // Use detailed mappers for each component
      const timelineData = FixtureDetailMapper.mapTimelineData(rawMatch.matchDetails);
      const lineupsData = FixtureDetailMapper.mapLineupData(
        rawMatch.matchLineup,
        rawMatch.matchSummary,
      );
      const playerStatsData = FixtureDetailMapper.mapPlayerStatsData(
        rawMatch.matchPlayerStats,
      );
      const statisticsData = FixtureDetailMapper.mapStatisticsData(rawMatch.matchSummary);

      // Head-to-head requires team IDs and tournament match list
      const headToHeadData = FixtureDetailMapper.mapHeadToHeadData(
        rawMatch.tournamentMatchList,
        (fixtureData as FixtureData).teams.home.id,
        (fixtureData as FixtureData).teams.away.id,
      );

      const teamStatsData = FixtureDetailMapper.mapTeamStatsData(rawMatch.matchSummary);

      // Build comprehensive detailed fixture
      const detailedFixture: FixtureDetailed = {
        fixtureData: fixtureData as FixtureData,
        timelineData,
        lineupsData,
        injuriesData: [], // TODO: Map injuries if available in Korastats
        playerStatsData,
        statisticsData,
        headToHeadData,
        teamStatsData,
      };

      console.log("✅ Detailed fixture mapping completed");
      return detailedFixture;
    } catch (error) {
      console.error("❌ Failed to map detailed fixture:", error);
      return "-";
    }
  }

  // ============================================================================
  // HELPER METHODS FOR BASIC FIXTURE MAPPING
  // ============================================================================

  private formatDate(dateTime: string): string {
    try {
      return new Date(dateTime).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private convertToTimestamp(dateTime: string): number {
    try {
      return Math.floor(new Date(dateTime).getTime() / 1000);
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }

  private mapMatchStatus(
    matchData: any,
    matchSummary: any,
  ): {
    long: string;
    short: string;
    elapsed: number;
  } {
    // Check status from both matchData and matchSummary
    const status =
      matchData.status?.status?.toLowerCase() ||
      matchSummary?.status?.status?.toLowerCase() ||
      "unknown";

    if (status.includes("approved") || status.includes("finished") || status === "ft") {
      return {
        long: "Match Finished",
        short: "FT",
        elapsed: 90,
      };
    } else if (status.includes("live") || status.includes("playing")) {
      return {
        long: "Match Live",
        short: "LIVE",
        elapsed: matchData.elapsed || 0,
      };
    } else if (status.includes("not started") || status === "ns") {
      return {
        long: "Not Started",
        short: "NS",
        elapsed: 0,
      };
    } else {
      // Default to finished if we have a score
      if (matchData.score?.home !== 0 && matchData.score?.away !== 0) {
        return {
          long: "Match Finished",
          short: "FT",
          elapsed: 90,
        };
      }

      return {
        long: "Not Started",
        short: "NS",
        elapsed: 0,
      };
    }
  }

  private determineWinner(matchData: any, side: "home" | "away"): boolean | "-" {
    const homeScore = matchData.score?.home || 0;
    const awayScore = matchData.score?.away || 0;

    if (homeScore === awayScore) return "-"; // Draw

    if (side === "home") {
      return homeScore > awayScore;
    } else {
      return awayScore > homeScore;
    }
  }

  private;
  calculateScoreBreakdown(matchSummary: any): FixtureScore {
    if (!matchSummary?.data) {
      return {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 0, away: 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      };
    }

    try {
      const homeGoals = matchSummary.data.home?.stats?.GoalsScored;
      const awayGoals = matchSummary.data.away?.stats?.GoalsScored;

      if (!homeGoals || !awayGoals) {
        return {
          halftime: { home: 0, away: 0 },
          fulltime: { home: 0, away: 0 },
          extratime: { home: 0, away: 0 },
          penalty: { home: 0, away: 0 },
        };
      }

      // Calculate goals by time periods
      const homeHalfTime =
        (homeGoals.T_0_15 || 0) + (homeGoals.T_15_30 || 0) + (homeGoals.T_30_45 || 0);
      const awayHalfTime =
        (awayGoals.T_0_15 || 0) + (awayGoals.T_15_30 || 0) + (awayGoals.T_30_45 || 0);

      const homeFullTime =
        (homeGoals.T_45_60 || 0) + (homeGoals.T_60_75 || 0) + (homeGoals.T_75_90 || 0);
      const awayFullTime =
        (awayGoals.T_45_60 || 0) + (awayGoals.T_60_75 || 0) + (awayGoals.T_75_90 || 0);

      const homeExtraTime = (homeGoals.T_90_105 || 0) + (homeGoals.T_105_120 || 0);
      const awayExtraTime = (awayGoals.T_90_105 || 0) + (awayGoals.T_105_120 || 0);

      const homePenalty = homeGoals.PenaltyScored || 0;
      const awayPenalty = awayGoals.PenaltyScored || 0;

      return {
        halftime: { home: homeHalfTime, away: awayHalfTime },
        fulltime: { home: homeFullTime, away: awayFullTime },
        extratime: { home: homeExtraTime, away: awayExtraTime },
        penalty: { home: homePenalty, away: awayPenalty },
      };
    } catch (error) {
      console.error("⚠️ Error calculating score breakdown:", error);
      return {
        halftime: { home: 0, away: 0 },
        fulltime: { home: 0, away: 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      };
    }
  }
}

