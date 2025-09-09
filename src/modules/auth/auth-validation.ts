import Joi from "joi";
import { EmailType } from "@prisma/client";

export const registerValidation = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  last_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  email_type: Joi.string()
    .valid(...Object.values(EmailType))
    .required(),
  company_name: Joi.string().when("email_type", {
    is: EmailType.work,
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  password: Joi.string().required(),
  purpose: Joi.string().required(),
  phonenumber: Joi.string().required(),
  terms_and_conditions: Joi.boolean().valid(true).required(),
});

export const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
