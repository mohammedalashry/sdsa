import { Role } from "@prisma/client";
import prismaService from "@/db/prismadb/prisma.service";
import { issueTokens } from "@/core/token/token.service";
import AppError from "@/core/utils/app-error";
import { IRegisterUser } from "@/modules/auth/user.interface";
import { getCountryByPhoneNumber } from "@/core/helpers/get-country-code";
import { ILoginUser } from "@/core/types/auth.types";
import { encodeDjangoPBKDF2, verifyDjangoPBKDF2 } from "@/core/helpers/hash-password";

export const registerUser = async (
  ip: string | undefined,
  headers: { "user-agent": string | undefined },
  data: IRegisterUser,
) => {
  const { phonenumber, email } = data;

  const countryCode = getCountryByPhoneNumber(phonenumber);
  const hashedPassword = encodeDjangoPBKDF2(data.password);

  const user = await prismaService.user.create({
    data: {
      ...data,
      email: email.toLowerCase(),
      role: Role.client,
      country_code: countryCode?.countryCode ?? null,
      password: hashedPassword,
    },
  });

  const { access, refresh } = await issueTokens(user, {
    ip,
    userAgent: headers["user-agent"] as string,
  });

  return {
    message: "User registered successfully.",
    access,
    refresh,
    role: user.role,
  };
};

export const loginUser = async (
  ip: string | undefined,
  headers: { "user-agent": string | undefined },
  data: ILoginUser,
) => {
  try {
    const { password } = data;
    let email = data.email;
    if (!email || !password) {
      throw new AppError("Email and password are required.", 400);
    }
    email = email.toLowerCase();
    const user = await prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = verifyDjangoPBKDF2(password, user.password as string);
    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const { access, refresh } = await issueTokens(user, {
      ip,
      userAgent: headers["user-agent"] as string,
    });
    console.log("access and refress", access, refresh);
    return {
      refresh,
      access,
      role: user.role,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    throw new AppError("Login error", 500);
  }
};

export const userForgotPasswordEmail = async (email: string) => {
  const user = await prismaService.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, role: true },
  });

  if (!user) {
    throw new AppError("user not found", 404);
  }

  return { success: true };
};

export const googleAuth = (): string => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_PATIENT_REDIRECT_URI } = process.env;

    // if (!GOOGLE_CLIENT_ID || !GOOGLE_PATIENT_REDIRECT_URI) {
    //   throw new AppError("Google client ID or redirect URI not found", 500);
    // }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_PATIENT_REDIRECT_URI}&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile&response_type=code&access_type=offline&prompt=consent`;

    return url;
  } catch (error: any) {
    console.error("Google auth error:", error);
    throw new AppError("Google client ID or redirect URI not found", 500);
  }
};

// google
// {
//     "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc1NDQ5OTAyNiwiaWF0IjoxNzU0NDEyNjI2LCJqdGkiOiI4Y2M2ODVlOTBhMWQ0MWExYTcwZDAzNTBiY2NhNDg0YSIsInVzZXJfaWQiOjEyMCwiaWQiOjEyMCwiZmlyc3RfbmFtZSI6IlNhbmR5IiwibGFzdF9uYW1lIjoiVGhhYml0IiwiZW1haWwiOiJzYW5keXRoYWJpdDU4OEBnbWFpbC5jb20ifQ.MMI1kd-sPvYk7ouTzbED8Ys944ctMfP-29tsNoPWhYQ",
//     "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU3MDA0NjI2LCJpYXQiOjE3NTQ0MTI2MjYsImp0aSI6ImFlNTQyMjc1M2ZlZjRjOTU4YWFiYzE3NWQwY2E5MmJiIiwidXNlcl9pZCI6MTIwLCJpZCI6MTIwLCJmaXJzdF9uYW1lIjoiU2FuZHkiLCJsYXN0X25hbWUiOiJUaGFiaXQiLCJlbWFpbCI6InNhbmR5dGhhYml0NTg4QGdtYWlsLmNvbSJ9.xmOnUbYa9Hp2jOwirX4HJLAkqzVZ2usDQQ1OLsrTaMA",
//     "role": "client"
// }
