/**
 * League Logo Service
 * Provides static league logo mappings for leagues not available in KoraStats
 */

export interface LeagueLogoInfo {
  id: number;
  name: string;
  logo: string;
  season: number;
  type: string;
}

export class LeagueLogoService {
  private static readonly LEAGUE_LOGOS: Map<number, LeagueLogoInfo> = new Map([
    [
      934,
      {
        id: 934,
        name: "Pro League U19",
        logo: "https://media.api-sports.io/football/leagues/308.png",
        season: 2024,
        type: "League",
      },
    ],
    [
      840,
      {
        id: 840,
        name: "Pro League",
        logo: "https://media.api-sports.io/football/leagues/307.png",
        season: 2024,
        type: "League",
      },
    ],
    [
      600,
      {
        id: 600,
        name: "Yelo",
        logo: "https://media.api-sports.io/football/leagues/309.png",
        season: 2023,
        type: "Cup",
      },
    ],
    [
      1441,
      {
        id: 840,
        name: "Pro League",
        logo: "https://media.api-sports.io/football/leagues/307.png",
        season: 2025,
        type: "League",
      },
    ],
  ]);

  /**
   * Get league logo information by league ID
   */
  static getLeagueLogo(leagueId: number): LeagueLogoInfo | null {
    console.log("Getting league logo for league ID:", leagueId);
    return this.LEAGUE_LOGOS.get(leagueId) || null;
  }

  /**
   * Get all available league logos
   */
  static getAllLeagueLogos(): LeagueLogoInfo[] {
    return Array.from(this.LEAGUE_LOGOS.values());
  }

  /**
   * Check if a league has a logo available
   */
  static hasLeagueLogo(leagueId: number): boolean {
    return this.LEAGUE_LOGOS.has(leagueId);
  }

  /**
   * Get league name by ID
   */
  static getLeagueName(leagueId: number): string | null {
    const logoInfo = this.getLeagueLogo(leagueId);
    return logoInfo?.name || null;
  }

  /**
   * Get league logo URL by ID
   */
  static getLeagueLogoUrl(leagueId: number): string | null {
    const logoInfo = this.getLeagueLogo(leagueId);
    return logoInfo?.logo || null;
  }
}

