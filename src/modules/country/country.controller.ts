import { Request, Response } from "express";
import { CountryService } from "./country.service";
import { catchAsync } from "../../core/utils/catch-async";

export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  /**
   * GET /api/country/
   * Get countries (name filter)
   */
  getAllCountries = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.query;

    const countries = await this.countryService.getCountries({
      name: name as string,
    });

    res.json(countries);
  });
}

