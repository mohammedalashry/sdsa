import Joi from "joi";

export const contactValidationSchemas = {
  createContact: Joi.object({
    first_name: Joi.string().min(1).max(255).required().messages({
      "string.empty": "First name is required",
      "string.max": "First name too long",
    }),
    last_name: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Last name is required",
      "string.max": "Last name too long",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email address",
      "string.empty": "Email is required",
    }),
    contact_number: Joi.string().min(1).max(20).required().messages({
      "string.empty": "Contact number is required",
      "string.max": "Contact number too long",
    }),
    message: Joi.string().min(1).required().messages({
      "string.empty": "Message is required",
    }),
  }),

  getContacts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().optional(),
  }),
};

