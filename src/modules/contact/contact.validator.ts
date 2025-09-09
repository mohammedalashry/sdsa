import Joi from "joi";

// Based on Excel sheet parameters
export const contactValidationSchemas = {
  // GET /api/contact/ - page (query), pageSize (query)
  getContacts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),

  // POST /api/contact/ - Contact schema (body)
  createContact: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    subject: Joi.string().required(),
    message: Joi.string().required(),
  }),
};

