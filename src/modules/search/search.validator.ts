import Joi from "joi";

// Based on Excel sheet parameters
export const searchValidationSchemas = {
  // GET /api/search/ - keyword (query), lang (query), searchType (query)
  getSearch: Joi.object({
    keyword: Joi.string().required(),
    lang: Joi.string().valid("en", "ar").default("en"),
    searchType: Joi.string()
      .valid("all", "teams", "players", "leagues", "fixtures")
      .default("all"),
  }),
};

