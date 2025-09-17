import { LeagueInterface } from "@/db/mogodb/schemas/league.schema";
import {
  KorastatsTournament,
  KorastatsTournamentStructure,
} from "@/integrations/korastats/types/league.types";
import { KorastatsMatchListItem } from "@/integrations/korastats/types/fixture.types";
import { LeagueLogoService } from "@/integrations/korastats/services/league-logo.service";
import { KorastatsStatType } from "@/modules/players";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
// Create a plain object type for mapping (without Mongoose Document properties)
export type TournamentData = LeagueInterface;

export class LeagueNew {
  leagueLogoService: LeagueLogoService;
  korastatsService: KorastatsService;
  constructor() {
    this.leagueLogoService = new LeagueLogoService();
    this.korastatsService = new KorastatsService();
  }
  /**
   * Comprehensive tournament mapper
   * Maps KoraStats tournament data to MongoDB tournament schema
   */
  async tournamentMapper(
    tournamentList: KorastatsTournament,
    matchList: KorastatsMatchListItem[],
    listStatTypes: KorastatsStatType[],
    tournamentStructure: KorastatsTournamentStructure,
  ): Promise<TournamentData> {
    // Get league logo and real name from LeagueLogoService
    const leagueLogoInfo = LeagueLogoService.getLeagueLogo(tournamentList.id);

    // Calculate rounds from match list
    const rounds = this.calculateRoundsFromMatchList(matchList);

    // Determine tournament status based on dates
    const status = this.determineTournamentStatus(
      tournamentList.startDate,
      tournamentList.endDate,
    );

    // Extract top performers using stat types and season top stats
    const topPerformers = await this.extractTopPerformers(
      listStatTypes,
      tournamentStructure,
    );

    const result: TournamentData = {
      // Korastats identifiers
      korastats_id: tournamentList.id,
      name: leagueLogoInfo?.name || tournamentList.tournament, // Use real name from LeagueLogoService
      season: tournamentList.season,
      logo: leagueLogoInfo?.logo || "", // Use real logo from LeagueLogoService
      type: "league",
      // Tournament metadata
      country: {
        id: tournamentList.organizer?.country?.id || 0,
        name: tournamentList.organizer?.country?.name || "Saudi Arabia",
        code: "SA",
        flag: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Flag_of_Saudi_Arabia.svg",
      },
      organizer: {
        id: tournamentList.organizer?.id || 0,
        name: tournamentList.organizer?.name || "",
        abbrev: tournamentList.organizer?.abbrev || "",
      },
      age_group: {
        id: tournamentList.ageGroup?.id || 0,
        name: tournamentList.ageGroup?.name || "Senior",
        min_age: tournamentList.ageGroup?.age?.min || null,
        max_age: tournamentList.ageGroup?.age?.max || null,
      },
      gender: this.normalizeGender(tournamentStructure?.gender || "male"),

      // Tournament structure - calculated from match list
      rounds: rounds,
      rounds_count: rounds.length,

      // Tournament winners (would need additional data)

      top_scorers: topPerformers.topScorers as [{ player: { id: number; name: string } }],
      top_assisters: topPerformers.topAssisters as [
        { player: { id: number; name: string } },
      ],

      // Metadata
      start_date: new Date(tournamentList.startDate),
      end_date: new Date(tournamentList.endDate),
      status: status,

      // Sync tracking
      last_synced: new Date(),
      sync_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return result;
  }

  /**
   * Calculate rounds from match list data
   */
  private calculateRoundsFromMatchList(matchList: KorastatsMatchListItem[]): string[] {
    if (!matchList || matchList.length === 0) {
      return ["Round 1"]; // Default fallback
    }

    // Extract unique rounds from match list
    const uniqueRounds = new Set<string>();

    matchList.forEach((match) => {
      if (match.round) {
        // Format round names consistently
        const roundName = this.formatRoundName(match.round);
        uniqueRounds.add(roundName);
      }
    });

    // Convert to array and sort
    const rounds = Array.from(uniqueRounds).sort((a, b) => {
      // Extract round numbers for proper sorting
      const aNum = this.extractRoundNumber(a);
      const bNum = this.extractRoundNumber(b);
      return aNum - bNum;
    });

    return rounds.length > 0 ? rounds : ["Round 1"];
  }

  /**
   * Format round name consistently
   */
  private formatRoundName(round: number | string): string {
    const roundNum = typeof round === "string" ? parseInt(round) : round;

    if (isNaN(roundNum)) {
      return `Round ${round}`;
    }

    // Special round names for common tournament structures
    if (roundNum === 1) return "Round 1";
    if (roundNum === 2) return "Round 2";
    if (roundNum === 3) return "Round 3";
    if (roundNum === 4) return "Round 4";
    if (roundNum === 5) return "Round 5";
    if (roundNum === 6) return "Round 6";
    if (roundNum === 7) return "Round 7";
    if (roundNum === 8) return "Round 8";
    if (roundNum === 9) return "Round 9";
    if (roundNum === 10) return "Round 10";

    return `Round ${roundNum}`;
  }

  /**
   * Extract round number for sorting
   */
  private extractRoundNumber(roundName: string): number {
    const match = roundName.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Determine tournament status based on dates
   */
  private determineTournamentStatus(
    startDate: string,
    endDate: string,
  ): "active" | "completed" | "upcoming" {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return "upcoming";
    } else if (now > end) {
      return "completed";
    } else {
      return "active";
    }
  }

  /**
   * Extract top performers from tournament data
   */
  private async extractTopPerformers(
    listStatTypes: KorastatsStatType[],
    tournamentStructure: KorastatsTournamentStructure,
  ): Promise<{
    topScorers: Array<{ player: { id: number; name: string } }>;
    topAssisters: Array<{ player: { id: number; name: string } }>;
  }> {
    try {
      // Find the correct stat IDs for goals and assists
      const goalsStat = this.findStatType(listStatTypes, [
        "goals",
        "goal",
        "scored",
        "scoring",
      ]);
      const assistsStat = this.findStatType(listStatTypes, [
        "assist",
        "assists",
        "assisting",
      ]);

      const topScorers: Array<{ player: { id: number; name: string } }> = [];
      const topAssisters: Array<{ player: { id: number; name: string } }> = [];

      // Get top scorers if goals stat found
      if (goalsStat) {
        try {
          const topScorersResponse = await this.korastatsService.getSeasonPlayerTopStats(
            tournamentStructure.id, // season ID
            goalsStat.intID, // stat type ID
            "desc", // sort descending for top performers
          );

          if (
            topScorersResponse.result === "Success" &&
            topScorersResponse.data?.arrData
          ) {
            topScorers.push(
              ...topScorersResponse.data.arrData.map((player: any) => ({
                player: {
                  id: player.intPlayerID,
                  name: player.strPlayerNameEn || player.strNickNameEn,
                },
              })),
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get top scorers: ${error.message}`);
        }
      }

      // Get top assisters if assists stat found
      if (assistsStat) {
        try {
          const topAssistersResponse =
            await this.korastatsService.getSeasonPlayerTopStats(
              tournamentStructure.id, // season ID
              assistsStat.intID, // stat type ID
              "desc", // sort descending for top performers
            );

          if (
            topAssistersResponse.result === "Success" &&
            topAssistersResponse.data?.arrData
          ) {
            topAssisters.push(
              ...topAssistersResponse.data.arrData.map((player: any) => ({
                player: {
                  id: player.intPlayerID,
                  name: player.strPlayerNameEn || player.strNickNameEn,
                },
              })),
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to get top assisters: ${error.message}`);
        }
      }

      console.log(
        `✅ Extracted ${topScorers.length} top scorers and ${topAssisters.length} top assisters`,
      );

      return {
        topScorers,
        topAssisters,
      };
    } catch (error) {
      console.error(`❌ Failed to extract top performers: ${error.message}`);
      return {
        topScorers: [],
        topAssisters: [],
      };
    }
  }

  /**
   * Find stat type by matching keywords in the stat name
   */
  private findStatType(
    listStatTypes: KorastatsStatType[],
    keywords: string[],
  ): KorastatsStatType | null {
    if (!listStatTypes || listStatTypes.length === 0) {
      return null;
    }

    // Try to find exact matches first
    for (const statType of listStatTypes) {
      const statName = statType.strStatName?.toLowerCase() || "";
      for (const keyword of keywords) {
        if (statName.includes(keyword.toLowerCase())) {
          console.log(
            `🎯 Found stat type: ${statType.strStatName} (ID: ${statType.intID}) for keywords: ${keywords.join(", ")}`,
          );
          return statType;
        }
      }
    }

    // If no exact match, try partial matches
    for (const statType of listStatTypes) {
      const statName = statType.strStatName?.toLowerCase() || "";
      for (const keyword of keywords) {
        if (statName.includes(keyword.toLowerCase().substring(0, 3))) {
          console.log(
            `🎯 Found partial match stat type: ${statType.strStatName} (ID: ${statType.intID}) for keywords: ${keywords.join(", ")}`,
          );
          return statType;
        }
      }
    }

    console.warn(`⚠️ No stat type found for keywords: ${keywords.join(", ")}`);
    return null;
  }

  /**
   * Legacy method for backward compatibility
   */

  /**
   * Normalize gender value to match schema enum
   */
  private normalizeGender(gender: string): "male" | "female" | "mixed" {
    const normalizedGender = gender.toLowerCase().trim();

    switch (normalizedGender) {
      case "male":
      case "men":
      case "m":
        return "male";
      case "female":
      case "women":
      case "f":
        return "female";
      case "mixed":
      case "both":
      case "co-ed":
        return "mixed";
      default:
        return "male"; // Default to male for unknown values
    }
  }
}

