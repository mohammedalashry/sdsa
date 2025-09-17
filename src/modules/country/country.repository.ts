// src/modules/country/country.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { CountryData } from "./country.service";

export class CountryRepository {
  private cacheService: CacheService;

  constructor() {
    this.cacheService = new CacheService();
  }

  /**
   * GET /api/country/ - Get countries
   */
  async getCountries(options: { name?: string }): Promise<CountryData[]> {
    try {
      const cacheKey = `countries_${options.name || "all"}`;

      const cached = this.cacheService.get<CountryData[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Try to get countries from MongoDB first
      let query: any = { status: "active" };
      if (options.name) {
        query.name = { $regex: options.name, $options: "i" };
      }

      const mongoCountries = await Models.Country.find(query).limit(50);

      if (mongoCountries.length > 0) {
        console.log(`📦 Found ${mongoCountries.length} countries in MongoDB`);

        // Transform MongoDB countries to legacy format
        const countryData = mongoCountries.map((country) => ({
          id: country.korastats_id,
          name: country.name,
          code: country.code,
          flag: country.flag,
        }));

        this.cacheService.set(cacheKey, countryData, 60 * 60 * 1000); // Cache for 1 hour
        return countryData;
      }

      // If no data in MongoDB, fallback to mock data
      const mockCountries = [
        {
          id: 160,
          name: "Saudi Arabia",
          code: "SA",
          flag: "https://media.api-sports.io/flags/sa.svg",
        },
        {
          id: 57,
          name: "Egypt",
          code: "EG",
          flag: "https://media.api-sports.io/flags/eg.svg",
        },
        {
          id: 1,
          name: "United Arab Emirates",
          code: "AE",
          flag: "https://media.api-sports.io/flags/ae.svg",
        },
      ];

      let countryData = mockCountries;
      if (options.name) {
        countryData = mockCountries.filter((country) =>
          country.name.toLowerCase().includes(options.name!.toLowerCase()),
        );
      }

      this.cacheService.set(cacheKey, countryData, 60 * 60 * 1000); // Cache for 1 hour
      return countryData;
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      return [];
    }
  }
}

