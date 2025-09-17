// src/mapper/refereeNew.ts
import { RefereeInterface } from "@/db/mogodb/schemas/referee.schema";
import {
  KorastatsEntityReferee,
  KorastatsRefereeInTournament,
  KorastatsRefereeStats,
} from "@/integrations/korastats/types";

import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
import {
  LeagueLogoInfo,
  LeagueLogoService,
} from "@/integrations/korastats/services/league-logo.service";

export class RefereeNew {
  private readonly korastatsService: KorastatsService;

  constructor() {
    this.korastatsService = new KorastatsService();
  }

  // ===================================================================
  // MAIN REFEREE MAPPER (Referee Schema)
  // Uses: EntityReferee + TournamentRefereeList
  // ===================================================================

  async mapToReferee(
    entityReferee: KorastatsEntityReferee,
    tournamentReferees: KorastatsRefereeInTournament[],
    tournamentId: number,
  ): Promise<RefereeInterface> {
    // Get referee photo
    const refereePhoto = await this.korastatsService
      .getImageUrl("referee", entityReferee.id)
      .catch(() => "");

    // Calculate career statistics from tournament data
    const careerStats = await this.calculateCareerStats(tournamentReferees, tournamentId);

    // Calculate total matches from career data
    const totalMatches = careerStats.reduce((total, stat) => total + stat.appearances, 0);

    // Get country information
    const countryInfo = this.mapCountryInfo(entityReferee.nationality);

    return {
      // === IDENTIFIERS ===
      korastats_id: entityReferee.id,

      // === PERSONAL INFO ===
      name: entityReferee.fullname,
      country: countryInfo,
      birthDate: entityReferee.dob,
      age: parseInt(entityReferee.age) || this.calculateAge(entityReferee.dob),
      photo: refereePhoto,
      matches: totalMatches,

      // === CAREER STATISTICS ===
      career_stats: careerStats,

      // === STATUS ===
      status: entityReferee.retired ? "retired" : "active",

      // === SYNC TRACKING ===
      last_synced: new Date(),
      sync_version: 1,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  private calculateAge(dob: string): number {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private mapCountryInfo(nationality: { id: number; name: string }) {
    // Map nationality to country info with flag
    const countryCode = this.getCountryCode(nationality.name);

    return {
      name: nationality.name,
      code: countryCode,
      flag: `https://media.api-sports.io/flags/${countryCode.toLowerCase()}.svg`,
    };
  }

  private getCountryCode(countryName: string): string {
    // Map country names to ISO codes for flag URLs
    const countryMap: Record<string, string> = {
      "Saudi Arabia": "sa",
      "United Arab Emirates": "ae",
      Qatar: "qa",
      Kuwait: "kw",
      Bahrain: "bh",
      Oman: "om",
      Jordan: "jo",
      Lebanon: "lb",
      Syria: "sy",
      Iraq: "iq",
      Yemen: "ye",
      Egypt: "eg",
      Morocco: "ma",
      Tunisia: "tn",
      Algeria: "dz",
      Libya: "ly",
      Sudan: "sd",
    };

    return countryMap[countryName] || "sa"; // Default to Saudi Arabia
  }

  private async calculateCareerStats(
    tournamentReferees: KorastatsRefereeInTournament[],
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    const careerStats = tournamentReferees.map((referee) => {
      const stats = referee.stats;

      return {
        league: leagueInfo?.name || "Unknown League",
        appearances: stats?.MatchesPlayed || 0,
        yellow_cards: stats?.["Yellow Card"] || 0,
        red_cards: (stats?.["2nd Yellow Card"] || 0) + (stats?.["Direct Red Card"] || 0),
        penalties: stats?.Penalties || 0,
      };
    });

    // Ensure at least one career stat entry
    if (careerStats.length === 0) {
      careerStats.push({
        league: leagueInfo?.name || "Unknown League",
        appearances: 0,
        yellow_cards: 0,
        red_cards: 0,
        penalties: 0,
      });
    }

    return careerStats;
  }
}

