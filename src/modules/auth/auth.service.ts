import { Role } from "@prisma/client";
import prismaService from "@/db/prismadb/prisma.service";
import { issueTokens } from "@/core/token/token.service";
import AppError from "@/core/utils/app-error";
import { IRegisterUser } from "@/modules/auth/user.interface";
import { getCountryByPhoneNumber } from "@/core/helpers/get-country-code";
import { ILoginUser } from "@/core/types/auth.types";
import { encodeDjangoPBKDF2, verifyDjangoPBKDF2 } from "@/core/helpers/hash-password";
import jwt from "jsonwebtoken";
import { EmailType } from "@prisma/client";

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
    console.log("user", user);
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

/**
 * Change password for authenticated user
 */
export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await prismaService.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Verify current password
  const isCurrentPasswordValid = verifyDjangoPBKDF2(
    currentPassword,
    user.password as string,
  );
  if (!isCurrentPasswordValid) {
    throw new AppError("Current password is incorrect", 400);
  }

  // Check if new password is different
  const isSamePassword = verifyDjangoPBKDF2(newPassword, user.password as string);
  if (isSamePassword) {
    throw new AppError("New password can't be the same as the old password", 400);
  }

  // Update password
  const hashedNewPassword = encodeDjangoPBKDF2(newPassword);
  await prismaService.user.update({
    where: { id: userId },
    data: {
      password: hashedNewPassword,
      change_password: false,
    },
  });

  return { success: true, message: "Password changed successfully" };
};

/**
 * Set new password with token
 */
export const setNewPassword = async (token: string, newPassword: string) => {
  if (!token) {
    throw new AppError("Token is required", 400);
  }

  let email: string;
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;
    email = decoded.email;
    if (!email) {
      throw new AppError("Invalid token", 400);
    }
  } catch (error) {
    throw new AppError("Invalid or expired token", 400);
  }

  const user = await prismaService.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, password: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check if new password is different
  const isSamePassword = verifyDjangoPBKDF2(newPassword, user.password as string);
  if (isSamePassword) {
    throw new AppError("New password can't be the same as the old password", 400);
  }

  // Update password
  const hashedNewPassword = encodeDjangoPBKDF2(newPassword);
  await prismaService.user.update({
    where: { id: user.id },
    data: {
      password: hashedNewPassword,
      change_password: false,
    },
  });

  return { success: true, message: "Password updated successfully" };
};

/**
 * Generate OTP for user
 */
export const generateOtp = async (userId: number) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prismaService.user.update({
    where: { id: userId },
    data: {
      otp,
      otp_expiry: otpExpiry,
    },
  });

  return { otp, otpExpiry };
};

/**
 * Resend OTP
 */
export const resendOtp = async (otpToken: string) => {
  if (!otpToken) {
    throw new AppError("OTP token is required", 400);
  }

  let email: string;
  try {
    const decoded = jwt.verify(otpToken, process.env.JWT_ACCESS_SECRET!) as any;
    email = decoded.email;
    if (!email) {
      throw new AppError("Invalid OTP token", 400);
    }
  } catch (error) {
    throw new AppError("Invalid OTP token", 400);
  }

  const user = await prismaService.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, first_name: true, email: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { otp, otpExpiry } = await generateOtp(user.id);

  // Generate new OTP token
  const newOtpToken = jwt.sign(
    {
      email: email,
      otp_expiry: otpExpiry.getTime() / 1000,
    },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "10m" },
  );

  // TODO: Send OTP via email/SMS
  console.log(`OTP for ${email}: ${otp}`);

  return {
    message: "OTP resent successfully",
    otp_token: newOtpToken,
  };
};

/**
 * Validate OTP
 */
export const validateOtp = async (otpToken: string, otp: string) => {
  if (!otpToken || !otp) {
    throw new AppError("OTP token and OTP are required", 400);
  }

  let email: string;
  let otpExpiry: number;
  try {
    const decoded = jwt.verify(otpToken, process.env.JWT_ACCESS_SECRET!) as any;
    email = decoded.email;
    otpExpiry = decoded.otp_expiry;
    if (!email || !otpExpiry) {
      throw new AppError("Invalid OTP token", 400);
    }
  } catch (error) {
    throw new AppError("Invalid OTP token", 400);
  }

  const user = await prismaService.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, otp: true, otp_expiry: true, role: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Check OTP expiry
  if (!user.otp_expiry || user.otp_expiry < new Date()) {
    throw new AppError("OTP has expired", 400);
  }

  // Validate OTP
  if (user.otp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  // Clear OTP
  await prismaService.user.update({
    where: { id: user.id },
    data: {
      otp: null,
      otp_expiry: null,
    },
  });

  // Issue tokens
  const { access, refresh } = await issueTokens(user, {
    ip: undefined,
    userAgent: undefined,
  });

  return {
    access,
    refresh,
    role: user.role,
  };
};

/**
 * Login with Google
 */
export const loginWithGoogle = async (accessToken: string) => {
  try {
    // TODO: Replace with actual Google OAuth verification
    // const googleUserInfo = await verifyGoogleToken(accessToken);

    // Placeholder implementation - replace with actual Google API call
    const googleUserInfo = {
      email: "user@example.com",
      given_name: "John",
      family_name: "Doe",
      picture: "https://example.com/avatar.jpg",
    };

    // Check if user exists
    let user = await prismaService.user.findUnique({
      where: { email: googleUserInfo.email.toLowerCase() },
      select: { id: true, email: true, role: true, is_active: true },
    });

    if (!user) {
      // Create new user
      user = await prismaService.user.create({
        data: {
          email: googleUserInfo.email.toLowerCase(),
          first_name: googleUserInfo.given_name,
          last_name: googleUserInfo.family_name,
          image: googleUserInfo.picture,
          email_type: EmailType.personal,
          purpose: "other",
          terms_and_conditions: true,
          role: Role.client,
          is_active: true,
        },
        select: { id: true, email: true, role: true, is_active: true },
      });
    } else if (!user.is_active) {
      throw new AppError("Account disabled. Please contact an Administrator", 400);
    }

    // Issue tokens
    const { access, refresh } = await issueTokens(user, {
      ip: undefined,
      userAgent: undefined,
    });

    return {
      access,
      refresh,
      role: user.role,
    };
  } catch (error) {
    console.error("Google login error:", error);
    throw new AppError("Invalid Google access token", 400);
  }
};

/**
 * Login with Facebook
 */
export const loginWithFacebook = async (accessToken: string) => {
  try {
    // TODO: Replace with actual Facebook OAuth verification
    // const facebookUserInfo = await verifyFacebookToken(accessToken);

    // Placeholder implementation - replace with actual Facebook API call
    const facebookUserInfo = {
      email: "user@example.com",
      first_name: "John",
      last_name: "Doe",
      picture: {
        data: {
          url: "https://example.com/avatar.jpg",
        },
      },
    };

    // Check if user exists
    let user = await prismaService.user.findUnique({
      where: { email: facebookUserInfo.email.toLowerCase() },
      select: { id: true, email: true, role: true, is_active: true },
    });

    if (!user) {
      // Create new user
      user = await prismaService.user.create({
        data: {
          email: facebookUserInfo.email.toLowerCase(),
          first_name: facebookUserInfo.first_name,
          last_name: facebookUserInfo.last_name,
          image: facebookUserInfo.picture.data.url,
          email_type: EmailType.personal,
          purpose: "other",
          terms_and_conditions: true,
          role: Role.client,
          is_active: true,
        },
        select: { id: true, email: true, role: true, is_active: true },
      });
    } else if (!user.is_active) {
      throw new AppError("Account disabled. Please contact an Administrator", 400);
    }

    // Issue tokens
    const { access, refresh } = await issueTokens(user, {
      ip: undefined,
      userAgent: undefined,
    });

    return {
      access,
      refresh,
      role: user.role,
    };
  } catch (error) {
    console.error("Facebook login error:", error);
    throw new AppError("Invalid Facebook access token", 400);
  }
};

/**
 * Login with X (Twitter)
 */
export const loginWithX = async (oauthToken: string, oauthVerifier: string) => {
  try {
    // TODO: Replace with actual X (Twitter) OAuth verification
    // const xUserInfo = await verifyXToken(oauthToken, oauthVerifier);

    // Placeholder implementation - replace with actual X API call
    const xUserInfo = {
      email: "user@example.com",
      name: "John Doe",
      profile_image_url_https: "https://example.com/avatar.jpg",
    };

    // Parse name into first and last name
    const names = xUserInfo.name.split(" ");
    const firstName = names[0];
    const lastName = names.length > 1 ? names.slice(1).join(" ") : "";

    // Check if user exists
    let user = await prismaService.user.findUnique({
      where: { email: xUserInfo.email.toLowerCase() },
      select: { id: true, email: true, role: true, is_active: true },
    });

    if (!user) {
      // Create new user
      user = await prismaService.user.create({
        data: {
          email: xUserInfo.email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          image: xUserInfo.profile_image_url_https,
          email_type: EmailType.personal,
          purpose: "other",
          terms_and_conditions: true,
          role: Role.client,
          is_active: true,
        },
        select: { id: true, email: true, role: true, is_active: true },
      });
    } else if (!user.is_active) {
      throw new AppError("Account disabled. Please contact an Administrator", 400);
    }

    // Issue tokens
    const { access, refresh } = await issueTokens(user, {
      ip: undefined,
      userAgent: undefined,
    });

    return {
      access,
      refresh,
      role: user.role,
    };
  } catch (error) {
    console.error("X login error:", error);
    throw new AppError("Invalid X OAuth credentials", 400);
  }
};

/**
 * Get X auth URL
 */
export const getXAuthUrl = async (redirectUri: string) => {
  try {
    // TODO: Replace with actual X (Twitter) OAuth URL generation
    // const authUrl = await generateXAuthUrl(redirectUri);

    // Placeholder implementation - replace with actual X OAuth URL generation
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=placeholder_token&oauth_callback=${encodeURIComponent(redirectUri)}`;

    return {
      auth_url: authUrl,
    };
  } catch (error) {
    console.error("X auth URL generation error:", error);
    throw new AppError("Failed to generate X auth URL", 500);
  }
};
