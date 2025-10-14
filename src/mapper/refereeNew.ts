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
    // Guard clause: Ensure we have valid referee data
    if (!entityReferee || !entityReferee.id) {
      throw new Error("Invalid entityReferee data provided");
    }
    // Get referee photo
    const refereePhoto = await this.korastatsService
      .getImageUrl("referee", entityReferee.id)
      .catch(() => "https://via.placeholder.com/80x80/cccccc/666666?text=REFEREE");

    // Calculate career statistics from tournament data
    const careerStats = await this.calculateCareerStats(
      entityReferee.id,
      tournamentReferees,
      tournamentId,
    );

    // Calculate total matches from career data
    const totalMatches = careerStats.reduce((total, stat) => total + stat.appearances, 0);

    // Get country information
    const countryInfo = await this.mapCountryInfo(
      entityReferee.nationality || { id: 0, name: "Unknown" },
    );

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

  private async mapCountryInfo(nationality: { id: number; name: string }) {
    // Map nationality to country info with flag
    const countryCode = this.getCountryCode(nationality.name);
    const countryFlag = this.korastatsService
      .getEntityCountries(nationality.name)
      .then((res) => {
        return res.root.object.find((country) => country.id === nationality.id)?.flag;
      });
    return {
      name: nationality.name,
      code: countryCode,
      flag: await countryFlag,
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
    let countryCode = "";
    if (countryMap[countryName]) {
      countryCode = countryMap[countryName];
    } else {
      if (countryName.split(" ").length > 1) {
        countryCode = countryName.split(" ")[0][0] + countryName.split(" ")[1][0];
      } else {
        countryCode = countryName.substring(0, 2).toLowerCase();
      }
    }
    return countryCode;
  }

  private async calculateCareerStats(
    refereeId: number,
    tournamentReferees: KorastatsRefereeInTournament[],
    tournamentId: number,
  ) {
    const leagueInfo = LeagueLogoService.getLeagueLogo(tournamentId);

    const referee = tournamentReferees.find((referee) => referee.id === refereeId);
    const stats = referee?.stats;
    const season = this.extractYearFromSeason(tournamentId);
    return [
      {
        league: {
          id: leagueInfo?.id || tournamentId,
          name: leagueInfo?.name || "Unknown League",
          season: season, // Current season
          logo:
            leagueInfo?.logo ||
            "https://via.placeholder.com/100x100/cccccc/666666?text=LEAGUE",
        },
        appearances: stats?.MatchesPlayed || 0,
        yellow_cards: stats?.["Yellow Card"] || 0,
        red_cards: (stats?.["2nd Yellow Card"] || 0) + (stats?.["Direct Red Card"] || 0),
        penalties: stats?.Penalties || 0,
      },
    ];
  }
  private extractYearFromSeason(tournamentId: number): number {
    return tournamentId === 1441 ? 2025 : tournamentId === 600 ? 2023 : 2024;
  }
}

