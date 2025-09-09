/**
 * League Logo Service
 * Provides static league logo mappings for leagues not available in KoraStats
 */

export interface LeagueLogoInfo {
  id: number;
  name: string;
  logo: string;
}

export class LeagueLogoService {
  private static readonly LEAGUE_LOGOS: Map<number, LeagueLogoInfo> = new Map([
    [
      934,
      {
        id: 934,
        name: "Division 1",
        logo: "https://media.api-sports.io/football/leagues/308.png",
      },
    ],
    [
      840,
      {
        id: 840,
        name: "Pro League",
        logo: "https://media.api-sports.io/football/leagues/307.png",
      },
    ],
    [
      600,
      {
        id: 600,
        name: "Division 2",
        logo: "https://media.api-sports.io/football/leagues/309.png",
      },
    ],
  ]);

  /**
   * Get league logo information by league ID
   */
  static getLeagueLogo(leagueId: number): LeagueLogoInfo | null {
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

