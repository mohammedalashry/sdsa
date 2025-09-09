// ============================================================================
// src/integrations/korastats/mappers/fixture-detail.mapper.ts
import {
  FixturePlayerStatsData,
  FixtureStatsData,
  FixtureData,
  LineupData,
  EventData,
  TeamStatsData,
} from "@/legacy-types/fixtures.types";

export class FixtureDetailMapper {
  /**
   * Map Korastats MatchPlayerStats to Django FixturePlayerStatsData format
   * Takes the raw MatchPlayerStats response with players array
   */
  static mapPlayerStatsData(matchPlayerStats: any): FixturePlayerStatsData[] {
    if (!matchPlayerStats?.players) {
      console.warn("⚠️ No player stats data found");
      return [];
    }

    console.log(
      `🔍 Mapping player stats data: ${matchPlayerStats.players.length} players`,
    );

    const result: FixturePlayerStatsData[] = [];

    // Group players by team
    const playersByTeam = new Map<number, any[]>();

    matchPlayerStats.players.forEach((player: any) => {
      const teamId = player.team?.id;
      if (!playersByTeam.has(teamId)) {
        playersByTeam.set(teamId, []);
      }
      playersByTeam.get(teamId)?.push(player);
    });

    // Convert each team's player stats to Django format
    playersByTeam.forEach((players, teamId) => {
      if (players.length === 0) return;

      const firstPlayer = players[0];
      const teamData = {
        id: teamId,
        name: firstPlayer.team?.name || "Unknown Team",
        logo: "", // TODO: Add team logo mapping
        update: new Date().toISOString(),
      };

      const mappedPlayers = players.map((player) => ({
        player: {
          id: player.id,
          name: player.name,
          photo: "", // TODO: Add player photo mapping
          rating: this.calculatePlayerRating(player.stats), // Calculate overall rating
        },
        statistics: [this.mapPlayerStatistics(player.stats)], // Convert to Django format
      }));

      result.push({
        team: teamData,
        players: mappedPlayers,
      });
    });

    return result;
  }

  /**
   * Convert individual player stats to Django statistics format
   */
  private static mapPlayerStatistics(stats: any): any {
    return {
      games: {
        minutes: stats.Admin?.MinutesPlayed || 0,
        number: stats.Admin?.MatchesPlayed || 0,
        position: this.mapPosition(stats),
        rating: this.calculatePlayerRating(stats),
        captain: false, // TODO: Determine captain status
        substitute: stats.Admin?.MatchesPlayedasSub > 0,
      },
      offsides: stats.Admin?.Offside || 0,
      shots: {
        total: stats.Attempts?.Total || 0,
        on: stats.Attempts?.Success || 0,
      },
      goals: {
        total: stats.GoalsScored?.Total || 0,
        conceded: stats.GoalsConceded?.Total || 0,
        assists: stats.Chances?.Assists || 0,
        saves: stats.GK?.Attempts?.Saved || 0,
      },
      passes: {
        total: stats.Pass?.Total || 0,
        key: stats.Chances?.KeyPasses || 0,
        accuracy: Math.round((stats.Pass?.Accuracy || 0) * 100),
      },
      tackles: {
        total: (stats.Defensive?.TackleClear || 0) + (stats.Defensive?.TackleFail || 0),
        blocks: stats.Defensive?.Blocks || 0,
        interceptions: stats.Defensive?.InterceptionClear || 0,
      },
      duels: {
        total: stats.Dribble?.Total || 0,
        won: stats.Dribble?.Success || 0,
      },
      dribbles: {
        attempts: stats.Dribble?.Total || 0,
        success: stats.Dribble?.Success || 0,
        past: "-", // Not available in Korastats
      },
      fouls: {
        drawn: stats.Fouls?.Awarded || 0,
        committed: stats.Fouls?.Committed || 0,
      },
      cards: {
        yellow: stats.Cards?.Yellow || 0,
        red: stats.Cards?.Red || 0,
      },
      penalty: {
        won: "-", // Not directly available
        committed: stats.Penalty?.Committed || 0,
        scored: stats.GoalsScored?.PenaltyScored || 0,
        missed: stats.Attempts?.PenaltyMissed || 0,
        saved: stats.GK?.Penalty?.Saved || 0,
      },
    };
  }

  /**
   * Map Korastats MatchSummary to Django FixtureStatsData format
   * Converts team stats to {type, value} format
   */
  static mapStatisticsData(matchSummary: any): FixtureStatsData[] {
    if (!matchSummary) {
      console.warn("⚠️ No match summary data found");
      return [];
    }

    console.log(`🔍 Mapping statistics data for match`);

    const result: FixtureStatsData[] = [];
    const teams = ["home", "away"];

    teams.forEach((side) => {
      const teamData = matchSummary[side];
      if (!teamData) return;

      const stats = teamData.stats;
      const teamInfo = {
        id: teamData.team?.id || 0,
        name: teamData.team?.name || "Unknown Team",
        logo: "", // TODO: Add team logo mapping
      };

      // Convert stats to Django {type, value} format
      const statistics = this.convertStatsToTypeValue(stats);

      result.push({
        team: teamInfo,
        statistics,
      });
    });

    return result;
  }

  /**
   * Convert Korastats stats object to Django {type, value} array format
   */
  private static convertStatsToTypeValue(
    stats: any,
  ): Array<{ type: string; value: number | string }> {
    const result = [];

    // Shots statistics
    result.push({ type: "Shots on Goal", value: stats.Attempts?.Success || 0 });
    result.push({
      type: "Shots off Goal",
      value: Math.max(
        0,
        (stats.Attempts?.Total || 0) -
          (stats.Attempts?.Success || 0) -
          (stats.Defensive?.Blocks || 0),
      ),
    });
    result.push({ type: "Total Shots", value: stats.Attempts?.Total || 0 });
    result.push({ type: "Blocked Shots", value: stats.Defensive?.Blocks || 0 });

    // Possession and passes
    result.push({
      type: "Ball Possession",
      value: `${Math.round((stats.TimePercent?.SuspeciousTime / stats.TimePercent?.ActualTime) * 100) || 0}%`,
    });
    result.push({ type: "Total passes", value: stats.Pass?.Total || 0 });
    result.push({ type: "Passes accurate", value: stats.Pass?.Success || 0 });
    result.push({
      type: "Passes %",
      value: `${Math.round((stats.Pass?.Accuracy || 0) * 100)}%`,
    });

    // Discipline and game events
    result.push({ type: "Fouls", value: stats.Fouls?.Committed || 0 });
    result.push({ type: "Corner Kicks", value: stats.Admin?.Corners || 0 });
    result.push({ type: "Offsides", value: stats.Admin?.Offside || 0 });
    result.push({ type: "Yellow Cards", value: stats.Cards?.Yellow || 0 });
    result.push({ type: "Red Cards", value: stats.Cards?.Red || 0 });

    // Goalkeeper and advanced stats
    result.push({
      type: "Goalkeeper Saves",
      value: stats.Defensive?.OpportunitySaved || 0,
    });
    result.push({ type: "expected_goals", value: stats.GoalsScored?.XG || "-" });
    result.push({ type: "goals_prevented", value: stats.Defensive?.GoalsSaved || "-" });

    return result;
  }

  /**
   * Map Korastats MatchSquad to Django LineupData format
   */
  static mapLineupData(matchSquad: any, matchSummary: any): LineupData[] {
    if (!matchSquad || !Array.isArray(matchSquad)) {
      console.warn("⚠️ No match squad data found");
      return [];
    }

    console.log(`🔍 Mapping lineup data: ${matchSquad.length} team squads`);

    const result: LineupData[] = [];
    const homeTeam = matchSquad[0].home;
    const awayTeam = matchSquad[0].away;
    const matchSquads = [homeTeam.squad, awayTeam.squad];
    console.log(matchSquad[0]);
    console.log(homeTeam);
    // Process each team squad (home and away)
    matchSquads.forEach((teamSquad: any) => {
      if (!teamSquad) return;

      const startXI = [];
      const substitutes = [];

      // Process home team
      if (teamSquad) {
        teamSquad.forEach((player: any) => {
          const playerData = {
            player: {
              id: player.id,
              name: player.name,
              number: player.shirt_number,
              pos: player.position?.name || "N/A",
              grid: "-", // TODO: Extract formation grid if available
            },
          };

          if (player.lineup) {
            startXI.push(playerData);
          } else if (player.bench) {
            substitutes.push(playerData);
          }
        });
      }

      // Process away team
      if (teamSquad) {
        teamSquad.forEach((player: any) => {
          const playerData = {
            player: {
              id: player.id,
              name: player.name,
              number: player.shirt_number,
              pos: player.position?.name || "N/A",
              grid: "-", // TODO: Extract formation grid if available
            },
          };

          if (player.lineup) {
            startXI.push(playerData);
          } else if (player.bench) {
            substitutes.push(playerData);
          }
        });
      }
      console.log("homeTeam", homeTeam);
      // Add home team lineup
      if (homeTeam?.team && matchSummary.home) {
        result.push({
          team: {
            id: homeTeam.team.id || 0,
            name: homeTeam.team.name || "Unknown Home Team",
            logo: "",
            colors: {
              player: { primary: "-", number: "-", border: "-" },
              goalkeeper: { primary: "-", number: "-", border: "-" },
            }, // TODO: Add team colors if available
          },
          coach: {
            id: matchSummary.home.coach?.id || 0,
            name: matchSummary.home.coach?.name || "Unknown Coach",
            photo: matchSummary.home.coach?.photo || "",
          },
          formation: "4-4-2",
          startXI: startXI.filter((_, index) => index < 11), // First 11 players
          substitutes: startXI.filter((_, index) => index >= 11), // Rest as substitutes
        });
      }
      console.log("awayTeam", awayTeam);
      // Add away team lineup
      if (awayTeam.team && matchSummary.away) {
        result.push({
          team: {
            id: awayTeam.team.id || 0,
            name: awayTeam.team.name || "Unknown Away Team",
            logo: "",
            colors: {
              player: { primary: "-", number: "-", border: "-" },
              goalkeeper: { primary: "-", number: "-", border: "-" },
            }, // TODO: Add team colors if available
          },
          coach: {
            id: matchSummary.away.coach?.id || 0,
            name: matchSummary.away.coach?.name || "Unknown Coach",
            photo: matchSummary.away.coach?.photo || "",
          },
          formation: "4-4-2", // TODO: Extract actual formation
          startXI: startXI.filter((_, index) => index < 11), // First 11 players
          substitutes: startXI.filter((_, index) => index >= 11), // Rest as substitutes
        });
      }
    });

    return result;
  }

  /**
   * Map Korastats MatchTimeline to Django EventData format
   */
  static mapTimelineData(matchTimeline: any): EventData[] {
    if (!matchTimeline?.timeline) {
      console.warn("⚠️ No timeline data found");
      return [];
    }

    console.log(`🔍 Mapping timeline data: ${matchTimeline.timeline.length} events`);

    // Map events and handle substitutions
    const mappedEvents = matchTimeline.timeline.map((event: any) => {
      const isSubstitution = event.event === "Substitution";

      return {
        time: {
          elapsed: this.parseTimeToMinutes(event.time, event.half) || 0,
          extra: "-", // KoraStats doesn't provide extra time in this format
        },
        team: {
          id: event.team?.id || 0,
          name: event.team?.name || "Unknown Team",
          logo: "",
        },
        player: {
          id: isSubstitution ? event.in?.id || 0 : event.player?.id || 0,
          name: isSubstitution
            ? event.in?.name || "Unknown Player"
            : event.player?.name || "Unknown Player",
        },
        assist: {
          id: isSubstitution ? event.out?.id || "-" : event.assist?.id || "-",
          name: isSubstitution ? event.out?.name || "-" : event.assist?.name || "-",
        },
        type: this.mapEventType(event.event),
        detail: event.event || "Unknown Event",
        comments: "-", // KoraStats doesn't provide comments
      };
    });

    // Sort events by elapsed minutes (ascending from 0 to up)
    const sortedEvents = mappedEvents.sort((a, b) => {
      return a.time.elapsed - b.time.elapsed;
    });

    console.log(
      `🔍 Timeline events sorted by elapsed time (${sortedEvents.length} events)`,
    );

    return sortedEvents;
  }

  /**
   * Find head-to-head matches by searching tournament match list
   */
  static mapHeadToHeadData(
    tournamentMatchList: any[],
    homeTeamId: number,
    awayTeamId: number,
  ): FixtureData[] {
    if (!tournamentMatchList) {
      console.warn("⚠️ No tournament match list for head-to-head");
      return [];
    }

    // Find matches where these two teams played against each other
    const h2hMatches = tournamentMatchList.filter((match) => {
      const homeId = match.teams?.home?.id;
      const awayId = match.teams?.away?.id;

      return (
        (homeId === homeTeamId && awayId === awayTeamId) ||
        (homeId === awayTeamId && awayId === homeTeamId)
      );
    });

    // Convert to FixtureData format (simplified)
    return h2hMatches.slice(0, 10).map((match) => ({
      fixture: {
        id: match.id,
        referee: match.referee?.name || "-",
        timezone: "Asia/Riyadh",
        date: new Date(match.dateTime).toISOString(),
        timestamp: Math.floor(new Date(match.dateTime).getTime() / 1000),
        periods: { first: 0, second: 0 },
        venue: {
          id: match.stadium?.id || "-",
          name: match.stadium?.name || "-",
          city: "-",
        },
        status: {
          long: "Match Finished",
          short: "FT",
          elapsed: 90,
        },
      },
      league: {
        id: 0, // TODO: Extract league info
        name: "Tournament",
        country: "Saudi Arabia",
        logo: "",
        flag: "https://media.api-sports.io/flags/sa.svg",
        season: 2024,
        round: tournamentMatchList[0]?.round || "Unknown Round",
      },
      teams: {
        home: {
          id: match.teams?.home?.id || 0,
          name: match.teams?.home?.team || "Home Team",
          logo: "",
          winner:
            match.score?.home > match.score?.away
              ? true
              : match.score?.home < match.score?.away
                ? false
                : false,
        },
        away: {
          id: match.teams?.away?.id || 0,
          name: match.teams?.away?.team || "Away Team",
          logo: "",
          winner:
            match.score?.away > match.score?.home
              ? true
              : match.score?.away < match.score?.home
                ? false
                : false,
        },
      },
      goals: {
        home: match.score?.home || 0,
        away: match.score?.away || 0,
      },
      score: {
        halftime: { home: 0, away: 0 },
        fulltime: { home: match.score?.home || 0, away: match.score?.away || 0 },
        extratime: { home: 0, away: 0 },
        penalty: { home: 0, away: 0 },
      },
      tablePosition: { home: 0, away: 0 },
      averageTeamRating: { home: 7.0, away: 7.0 },
    }));
  }

  /**
   * Map basic team stats data (placeholder for now)
   */
  static mapTeamStatsData(matchSummary: any): TeamStatsData[] {
    // TODO: Implement team stats mapping based on season data
    // This would require additional API calls to get season statistics
    return [];
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static calculatePlayerRating(stats: any): string | "-" {
    if (!stats) return "-";

    // Simple rating calculation based on key stats
    let rating = 6.0; // Base rating

    // Add for positive actions
    rating += (stats.GoalsScored?.Total || 0) * 0.5;
    rating += (stats.Chances?.Assists || 0) * 0.3;
    rating += (stats.Pass?.Accuracy || 0) * 2;
    rating += (stats.Dribble?.Accuracy || 0) * 1;

    // Subtract for negative actions
    rating -= (stats.Cards?.Yellow || 0) * 0.2;
    rating -= (stats.Cards?.Red || 0) * 1.0;
    rating -= (stats.Fouls?.Committed || 0) * 0.1;

    // Clamp between 1-10
    rating = Math.max(1.0, Math.min(10.0, rating));

    return rating.toFixed(1);
  }

  private static mapPosition(stats: any): string {
    // TODO: Extract position from player data
    return "M"; // Default to midfielder
  }

  private static parseTimeToMinutes(timeString: string, half?: number): number | "-" {
    if (!timeString) return "-";

    // Parse time format like "41:48" or "45:43"
    const match = timeString.match(/(\d+):(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);

      // If we have half information, add 45 minutes for second half
      if (half === 2) {
        return minutes + 45;
      }

      return minutes;
    }

    return "-";
  }

  private static mapEventType(korastatsType: string): string {
    const typeMapping: Record<string, string> = {
      "Goal Scored": "Goal",
      "Yellow Card": "Card",
      "Red Card": "Card",
      Substitution: "subst",
      Var: "Var",
    };

    return typeMapping[korastatsType] || korastatsType;
  }
}

