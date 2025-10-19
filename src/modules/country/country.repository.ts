// src/modules/country/country.repository.ts
import { Models } from "../../db/mogodb/models";
import { CacheService } from "../../integrations/korastats/services/cache.service";
import { CountryData } from "./country.service";
import { KorastatsService } from "@/integrations/korastats/services/korastats.service";
export class CountryRepository {
  private cacheService: CacheService;
  private korastatsService: KorastatsService;
  constructor() {
    this.cacheService = new CacheService();
    this.korastatsService = new KorastatsService();
  }

  /**
   * GET /api/country/ - Get countries
   */
  async getCountries(options: { name?: string }): Promise<CountryData[] | CountryData> {
    try {
      const cacheKey = `countries_${options.name || "all"}`;

      const cached = this.cacheService.get<CountryData[] | CountryData>(cacheKey);
      if (cached) {
        return cached;
      }
      if (options.name && options.name !== "all") {
        const countries = await this.korastatsService.getEntityCountries(options.name);
        if (!countries.root.object) {
          return [];
        }
        const country: CountryData = countries.root.object.map((country) => ({
          id: country.id,
          name: country.name,
          code: this.generateCountryCode(country.name),
          flag: country.flag,
        }))[0];
        return country;
      }
      const countries = await Models.Country.find();
      const countryData: CountryData[] = countries.map((country) => ({
        id: country.korastats_id,
        name: country.name,
        code: country.code,
        flag: country.flag,
      }));
      this.cacheService.set(cacheKey, countryData, 30 * 60 * 1000);
      return countryData;
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      return [];
    }
  }
  private generateCountryCode(name: string): string {
    const array = name?.split(" ");
    if (array.length === 1) {
      return array[0].substring(0, 2).toUpperCase();
    }
    return array[0][0].toUpperCase() + array[1][0].toUpperCase();
  }
}

