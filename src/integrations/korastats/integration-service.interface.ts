export interface IntegrationService {
  getTeamList(league: number, season: string): Promise<any>;

  getTeamInfo(team: number): Promise<any>;

  getTeamStats(league: number, season: number): Promise<any>;

  getTeamFixtures(team: number, league: number): Promise<any>;

  getTeamSquad(league: number, team: number): Promise<any>;

  getTeamFormOverview(league: number): Promise<any>;

  getTeamLineup(league: number): Promise<any>;

  getTournamentsList(country?: string): Promise<any>;

  getTournamentStructure(tournamentId: number, season?: string): Promise<any>;

  getTournamentHistory(tournamentId: number): Promise<any>;

  getTournamentRecentMatches(tournamentId: number): Promise<any>;
}

