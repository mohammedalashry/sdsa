import { EmailType, Role } from "@prisma/client";
import { Purpose } from "@/core/enums/enums";
import { CountryCode } from "@/core/enums/dial-codes.enum";

export interface IRegisterUser {
  first_name: string;
  last_name: string;
  email: string;
  email_type: EmailType;
  password: string;
  purpose: Purpose | string;
  phonenumber: string;
  terms_and_conditions: boolean;
}

export interface IUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_type: EmailType;
  company_name?: string;
  password: string;
  purpose: Purpose | string;
  country_code: CountryCode;
  phonenumber: string;
  terms_and_conditions: boolean;
  role: Role;
  dob: Date;
  address: string;
  image: string;
}
