export class TeamFactory {
  static createTeamData(overrides: Partial<any> = {}) {
    return {
      team: {
        id: Math.floor(Math.random() * 1000),
        name: `Team ${Math.random()}`,
        code: "TST",
        country: "England",
        founded: 2000,
        national: false,
        logo: "https://example.com/logo.png",
      },
      venue: {
        id: Math.floor(Math.random() * 1000),
        name: `Stadium ${Math.random()}`,
        address: "123 Test Street",
        city: "Test City",
        capacity: 50000,
        surface: "grass",
        image: "https://example.com/stadium.png",
      },
      ...overrides,
    };
  }

  static createBatch(count: number, overrides: Partial<any> = {}) {
    return Array(count)
      .fill(null)
      .map(() => this.createTeamData(overrides));
  }
}
