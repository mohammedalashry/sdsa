import { Router } from "express";
import { login, register, forgotPasswordEmail } from "@/modules/auth/auth.controller";
import validate from "@/core/middleware/validation.middleware";
import { registerValidation } from "@/modules/auth/auth-validation";

const authRouter = Router();

// Based on Excel sheet endpoints

// POST /api/auth/change-password/ - Change password
authRouter.post(
  "/change-password/" /* validate(changePasswordValidation), */ /* changePassword */,
);

// POST /api/auth/forgot-password-email/ - Forgot password email
authRouter.post("/forgot-password-email/", forgotPasswordEmail);

// POST /api/auth/login-with-facebook/ - Login with Facebook
authRouter.post(
  "/login-with-facebook/" /* validate(facebookLoginValidation), */ /* facebookLogin */,
);

// POST /api/auth/login-with-google/ - Login with Google
authRouter.post(
  "/login-with-google/" /* validate(googleLoginValidation), */ /* googleLogin */,
);

// POST /api/auth/login-with-x/ - Login with X (Twitter)
authRouter.post("/login-with-x/" /* validate(xLoginValidation), */ /* xLogin */);

// POST /api/auth/register/ - Register user
authRouter.post("/register/", validate(registerValidation), register);

// POST /api/auth/resend-otp/ - Resend OTP
authRouter.post("/resend-otp/" /* validate(resendOtpValidation), */ /* resendOtp */);

// POST /api/auth/send-otp/ - Send OTP
authRouter.post("/send-otp/", login);

// POST /api/auth/set-new-password/ - Set new password
authRouter.post(
  "/set-new-password/" /* validate(setNewPasswordValidation), */ /* setNewPassword */,
);

// POST /api/auth/validate-otp/ - Validate OTP
authRouter.post(
  "/validate-otp/" /* validate(validateOtpValidation), */ /* validateOtp */,
);

// POST /api/auth/x-get-auth-url/ - Get X auth URL
authRouter.post(
  "/x-get-auth-url/" /* validate(getAuthUrlValidation), */ /* getAuthUrl */,
);

export default authRouter;
