import Joi from "joi";

export const adminValidationSchemas = {
  createAdmin: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Invalid email address",
      "string.empty": "Email is required",
    }),
    password: Joi.string().min(8).required().messages({
      "string.min": "Password must be at least 8 characters",
      "string.empty": "Password is required",
    }),
    first_name: Joi.string().min(1).max(255).required().messages({
      "string.empty": "First name is required",
      "string.max": "First name too long",
    }),
    last_name: Joi.string().min(1).max(255).required().messages({
      "string.empty": "Last name is required",
      "string.max": "Last name too long",
    }),
    phonenumber: Joi.string().optional().allow(null, ""),
    twitter_link: Joi.string().uri().optional().allow(null, "").messages({
      "string.uri": "Invalid Twitter link format",
    }),
    dob: Joi.date().optional().allow(null, ""),
    address: Joi.string().optional().allow(null, ""),
  }),

  updateAdmin: Joi.object({
    email: Joi.string().email().optional().messages({
      "string.email": "Invalid email address",
    }),
    first_name: Joi.string().min(1).max(255).optional().messages({
      "string.max": "First name too long",
    }),
    last_name: Joi.string().min(1).max(255).optional().messages({
      "string.max": "Last name too long",
    }),
    phonenumber: Joi.string().optional().allow(null, ""),
    twitter_link: Joi.string().uri().optional().allow(null, "").messages({
      "string.uri": "Invalid Twitter link format",
    }),
    dob: Joi.date().optional().allow(null, ""),
    address: Joi.string().optional().allow(null, ""),
    is_active: Joi.boolean().optional(),
  }),

  getAdmins: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().optional(),
  }),
};

