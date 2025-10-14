import Joi from "joi";

export const searchValidationSchemas = {
  search: Joi.object({
    keyword: Joi.string().min(1).required().messages({
      "string.empty": "Keyword is required",
      "string.min": "Keyword must be at least 1 character",
    }),
    searchType: Joi.string().required().messages({
      "string.empty": "Search type is required",
    }),
    lang: Joi.string().valid("en", "ar").default("en").messages({
      "any.only": "Language must be either 'en' or 'ar'",
    }),
  }),
};

