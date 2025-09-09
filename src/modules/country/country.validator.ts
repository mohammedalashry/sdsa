import Joi from "joi";

// Based on Excel sheet parameters
export const countryValidationSchemas = {
  // GET /api/country/ - name (query)
  getCountries: Joi.object({
    name: Joi.string().optional(),
  }),
};

