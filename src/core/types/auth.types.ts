import { Role } from "@prisma/client";
import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import { IUser } from "@/modules/auth/user.interface";

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
  error?: string;
}

export interface FacebookUserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  verified_email?: boolean;
  picture?: string;
  error?: string;
}

export interface JWTPayload extends JwtPayload {
  id: number;
  role: Role;
  tokenCode: string;
}

export interface ILoginUser {
  email: string;
  password: string;
}
export interface IRequest<BodyType = any, ParamType = any, QueryType = any>
  extends Request<ParamType, any, BodyType, QueryType> {
  jwtPayload?: JWTPayload;
  user?: IUser;
}

