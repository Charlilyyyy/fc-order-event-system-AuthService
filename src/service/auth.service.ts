import { env } from "../config/env.js";
import {
  buildLoginData,
  buildLoginSuccessResponse,
  buildSignupPendingResponse,
} from "../lib/auth-response.js";
import { sendPasswordResetEmail, sendVerificationOtpEmail } from "../lib/email.js";
import { generateSecureToken } from "../lib/secure-token.js";
import {
  exchangeGoogleAuthCode,
  isGoogleOAuthConfigured,
  verifyGoogleIdToken,
  verifyOAuthState,
} from "../lib/google-oauth.js";
import { generateOtp } from "../lib/otp.js";
import { hashPassword } from "../lib/password.js";
import {
  extractGoogleIdToken,
  stripAndValidateForgotPasswordInput,
  stripAndValidateLoginInput,
  stripAndValidateResendOtpInput,
  stripAndValidateResetPasswordInput,
  stripAndValidateResetToken,
  stripAndValidateSignupInput,
  stripAndValidateVerifyEmailInput,
} from "../lib/validation.js";
import {
  consumeVerificationToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  findValidEmailVerificationToken,
  findValidPasswordResetToken,
} from "../repositories/verification-token.repository.js";
import {
  activateUserEmail,
  createUserWithPassword,
  findOrCreateUserFromGoogle,
  findUserByEmailAndPassword,
  findUserForPasswordReset,
  findUserSignupState,
  updateUserPassword,
} from "../repositories/user.repository.js";
import { HttpStatusCode } from "../types/http-status.js";

function otpExpiresAt(): Date {
  return new Date(Date.now() + env.otpExpiresInMinutes * 60 * 1000);
}

function otpExpiresInSeconds(): number {
  return env.otpExpiresInMinutes * 60;
}

function passwordResetExpiresAt(): Date {
  return new Date(
    Date.now() + env.passwordResetExpiresInMinutes * 60 * 1000,
  );
}

function passwordResetExpiresInSeconds(): number {
  return env.passwordResetExpiresInMinutes * 60;
}

function buildPasswordResetUrl(rawToken: string): string {
  const path = env.passwordResetPath.startsWith("/")
    ? env.passwordResetPath
    : `/${env.passwordResetPath}`;
  const url = new URL(path, env.frontendUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

const FORGOT_PASSWORD_MESSAGE =
  "If an account with that email exists, a password reset link has been sent";

async function sendEmailVerificationOtp(
  userId: string,
  email: string,
): Promise<void> {
  const otp = generateOtp();
  await createEmailVerificationToken(userId, email, otp, otpExpiresAt());
  await sendVerificationOtpEmail(email, otp);
}

export async function loginService(
  data: Auth.LoginUser,
): Promise<API.SuccessResponse<Auth.LoginResponse> | API.ErrorResponse> {
  if (!stripAndValidateLoginInput(data)) {
    return {
      data: null,
      error: "Email or password is required and must be a valid email address",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  try {
    const user = await findUserByEmailAndPassword(data.email, data.password);
    return buildLoginSuccessResponse(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    if (message.includes("Invalid email or password")) {
      return {
        data: null,
        error: "Invalid email or password",
        status: HttpStatusCode.UNAUTHORIZED,
      } satisfies API.ErrorResponse;
    }
    if (message.includes("EMAIL_NOT_VERIFIED")) {
      return {
        data: null,
        error: "Please verify your email before signing in",
        status: HttpStatusCode.FORBIDDEN,
      } satisfies API.ErrorResponse;
    }

    throw new Error(`[LOGIN_USER] ${message}`);
  }
}

export async function signupService(
  data: Auth.SignupUser,
): Promise<
  | API.CreatedResponse<Auth.SignupPendingResponse>
  | API.ErrorResponse
> {
  if (!stripAndValidateSignupInput(data)) {
    return {
      data: null,
      error:
        "Invalid signup data. Check email, password (8–128 chars), and matching password confirmation.",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  try {
    const passwordHash = await hashPassword(data.password);
    const user = await createUserWithPassword(data.email, passwordHash);
    await sendEmailVerificationOtp(user.id, user.email);
    return buildSignupPendingResponse(user, otpExpiresInSeconds());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    if (message.includes("EMAIL_ALREADY_EXISTS")) {
      return {
        data: null,
        error: "An account with this email already exists",
        status: HttpStatusCode.CONFLICT,
      } satisfies API.ErrorResponse;
    }

    throw new Error(`[SIGNUP_USER] ${message}`);
  }
}

export async function verifyEmailService(
  data: Auth.VerifyEmailRequest,
): Promise<API.SuccessResponse<Auth.LoginResponse> | API.ErrorResponse> {
  if (!stripAndValidateVerifyEmailInput(data)) {
    return {
      data: null,
      error: "Valid email and 6-digit OTP are required",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const token = await findValidEmailVerificationToken(data.email, data.otp);
  if (!token?.userId) {
    return {
      data: null,
      error: "Invalid or expired verification code",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const userState = await findUserSignupState(data.email);
  if (!userState) {
    return {
      data: null,
      error: "Account not found",
      status: HttpStatusCode.NOT_FOUND,
    } satisfies API.ErrorResponse;
  }

  if (userState.emailVerified && userState.status === "active") {
    return {
      data: null,
      error: "Email is already verified",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  await consumeVerificationToken(token.id);
  const user = await activateUserEmail(token.userId);
  return buildLoginSuccessResponse(user);
}

export async function resendOtpService(
  data: Auth.ResendOtpRequest,
): Promise<API.SuccessResponse<{ message: string; otpExpiresIn: number }> | API.ErrorResponse> {
  if (!stripAndValidateResendOtpInput(data)) {
    return {
      data: null,
      error: "A valid email address is required",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const user = await findUserSignupState(data.email);
  if (!user) {
    return {
      data: {
        message: "If an account exists, a new verification code has been sent",
        otpExpiresIn: otpExpiresInSeconds(),
      },
      error: null,
      status: HttpStatusCode.OK,
    } satisfies API.SuccessResponse<{ message: string; otpExpiresIn: number }>;
  }

  if (user.emailVerified && user.status === "active") {
    return {
      data: null,
      error: "Email is already verified",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  try {
    await sendEmailVerificationOtp(user.id, user.email);
    return {
      data: {
        message: "Verification OTP sent to your email",
        otpExpiresIn: otpExpiresInSeconds(),
      },
      error: null,
      status: HttpStatusCode.OK,
    } satisfies API.SuccessResponse<{ message: string; otpExpiresIn: number }>;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resend OTP";
    throw new Error(`[RESEND_OTP] ${message}`);
  }
}

export async function forgotPasswordService(
  data: Auth.ForgotPasswordRequest,
): Promise<
  | API.SuccessResponse<{ message: string; resetExpiresIn: number }>
  | API.ErrorResponse
> {
  if (!stripAndValidateForgotPasswordInput(data)) {
    return {
      data: null,
      error: "A valid email address is required",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const user = await findUserForPasswordReset(data.email);
  if (user?.credentials[0]) {
    try {
      const rawToken = generateSecureToken();
      await createPasswordResetToken(
        user.id,
        user.email,
        rawToken,
        passwordResetExpiresAt(),
      );
      await sendPasswordResetEmail(
        user.email,
        buildPasswordResetUrl(rawToken),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send reset email";
      throw new Error(`[FORGOT_PASSWORD] ${message}`);
    }
  }

  return {
    data: {
      message: FORGOT_PASSWORD_MESSAGE,
      resetExpiresIn: passwordResetExpiresInSeconds(),
    },
    error: null,
    status: HttpStatusCode.OK,
  } satisfies API.SuccessResponse<{ message: string; resetExpiresIn: number }>;
}

export async function validateResetTokenService(
  data: Auth.ValidateResetTokenRequest,
): Promise<
  | API.SuccessResponse<{ valid: true; resetExpiresIn: number }>
  | API.ErrorResponse
> {
  if (!stripAndValidateResetToken(data)) {
    return {
      data: null,
      error: "Invalid or expired reset link",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const token = await findValidPasswordResetToken(data.token);
  if (!token) {
    return {
      data: null,
      error: "Invalid or expired reset link",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  return {
    data: { valid: true, resetExpiresIn: passwordResetExpiresInSeconds() },
    error: null,
    status: HttpStatusCode.OK,
  } satisfies API.SuccessResponse<{ valid: true; resetExpiresIn: number }>;
}

export async function resetPasswordService(
  data: Auth.ResetPasswordRequest,
): Promise<
  | API.SuccessResponse<{ message: string }>
  | API.ErrorResponse
> {
  if (!stripAndValidateResetPasswordInput(data)) {
    return {
      data: null,
      error:
        "Invalid reset data. Check token, password (8–128 chars), and matching confirmation.",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const token = await findValidPasswordResetToken(data.token);
  if (!token?.userId) {
    return {
      data: null,
      error: "Invalid or expired reset link",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const passwordHash = await hashPassword(data.password);
  await updateUserPassword(token.userId, passwordHash);
  await consumeVerificationToken(token.id);

  return {
    data: { message: "Password has been reset successfully" },
    error: null,
    status: HttpStatusCode.OK,
  } satisfies API.SuccessResponse<{ message: string }>;
}

export async function googleSignInService(
  body: unknown,
): Promise<API.SuccessResponse<Auth.LoginResponse> | API.ErrorResponse> {
  if (!isGoogleOAuthConfigured()) {
    return {
      data: null,
      error: "Google sign-in is not configured on the server",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  const idToken = extractGoogleIdToken(body);
  if (!idToken) {
    return {
      data: null,
      error: "Google credential (idToken) is required",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  try {
    const profile = await verifyGoogleIdToken(idToken);
    const user = await findOrCreateUserFromGoogle(profile);
    return buildLoginSuccessResponse(user);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return {
      data: null,
      error: "Invalid or expired Google credential",
      status: HttpStatusCode.UNAUTHORIZED,
    } satisfies API.ErrorResponse;
  }
}

export async function googleCallbackService(
  code: string,
  state: string,
): Promise<{ redirectUrl: string } | API.ErrorResponse> {
  if (!isGoogleOAuthConfigured()) {
    return {
      data: null,
      error: "Google sign-in is not configured on the server",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse;
  }

  try {
    const { redirectPath } = verifyOAuthState(state);
    const profile = await exchangeGoogleAuthCode(code);
    const user = await findOrCreateUserFromGoogle(profile);
    const { accessToken, tokenType, expiresIn } = buildLoginData(user);

    const redirectUrl = new URL(redirectPath, env.frontendUrl);
    redirectUrl.searchParams.set("accessToken", accessToken);
    redirectUrl.searchParams.set("tokenType", tokenType);
    redirectUrl.searchParams.set("expiresIn", String(expiresIn));

    return { redirectUrl: redirectUrl.toString() };
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return {
      data: null,
      error: "Google sign-in failed",
      status: HttpStatusCode.UNAUTHORIZED,
    } satisfies API.ErrorResponse;
  }
}
