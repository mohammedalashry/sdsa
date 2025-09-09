import Joi from "joi";

// Based on Excel sheet parameters
export const adminValidationSchemas = {
  // GET /api/admin/management/ - page (query), pageSize (query), search (query)
  getAdminManagement: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
  }),

  // POST /api/admin/management/ - CreateAdmin schema (body)
  createAdmin: Joi.object({
    email: Joi.string().email().required(),
    email_type: Joi.string().required(),
    id: Joi.number().integer().positive().required(),
    password: Joi.string().min(8).required(),
    purpose: Joi.string().required(),
  }),

  // GET /api/admin/management/{id}/ - id (path)
  getAdminById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // PUT /api/admin/management/{id}/ - Admin schema (body)
  updateAdmin: Joi.object({
    email: Joi.string().email().required(),
    email_type: Joi.string().required(),
    password: Joi.string().min(8).required(),
    purpose: Joi.string().required(),
  }),

  // PATCH /api/admin/management/{id}/ - PatchedAdmin schema (body)
  patchAdmin: Joi.object({
    email: Joi.string().email().optional(),
    email_type: Joi.string().optional(),
    password: Joi.string().min(8).optional(),
    purpose: Joi.string().optional(),
  }),

  // GET /api/admin/user-logs/ - page (query), pageSize (query), search (query)
  getUserLogs: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
  }),

  // GET /api/admin/user-report-management/ - age_range (query), country_code (query), page (query), pageSize (query)
  getUserReportManagement: Joi.object({
    age_range: Joi.string().optional(),
    country_code: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),

  // GET /api/admin/user-statistics/account-statistics/ - period (query)
  getAccountStatistics: Joi.object({
    period: Joi.string().valid("daily", "weekly", "monthly", "yearly").default("monthly"),
  }),

  // GET /api/admin/users/ - page (query), pageSize (query), search (query), status (query)
  getUsers: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    status: Joi.string().valid("active", "inactive", "pending").optional(),
  }),

  // GET /api/admin/users/{id}/ - id (path)
  getUserById: Joi.object({
    id: Joi.number().integer().positive().required(),
  }),

  // PUT /api/admin/users/{id}/ - User schema (body)
  updateUser: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    is_active: Joi.boolean().required(),
  }),

  // PATCH /api/admin/users/{id}/ - PatchedUser schema (body)
  patchUser: Joi.object({
    email: Joi.string().email().optional(),
    first_name: Joi.string().optional(),
    last_name: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
  }),

  // POST /api/admin/users/{id}/deactivate/ - User schema (body)
  deactivateUser: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    is_active: Joi.boolean().required(),
  }),

  // POST /api/admin/users/{id}/reactivate/ - User schema (body)
  reactivateUser: Joi.object({
    email: Joi.string().email().required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    is_active: Joi.boolean().required(),
  }),
};

