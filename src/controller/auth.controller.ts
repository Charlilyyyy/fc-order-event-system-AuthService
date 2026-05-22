import type { Request, Response } from "express";
import {
  getGoogleAuthorizationUrl,
  isGoogleOAuthConfigured,
  signOAuthState,
} from "../lib/google-oauth.js";
import {
  forgotPasswordService,
  googleCallbackService,
  googleSignInService,
  loginService,
  resendOtpService,
  resetPasswordService,
  signupService,
  validateResetTokenService,
  verifyEmailService,
} from "../service/auth.service.js";
import { HttpStatusCode } from "../types/http-status.js";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data = {
      email: req.body.email,
      password: req.body.password,
    } satisfies Auth.LoginUser;

    const result = await loginService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to login:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to login",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const data = {
      email: req.body.email,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation,
    } satisfies Auth.SignupUser;

    const result = await signupService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to signup:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to sign up",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

/** Redirect browser to Google OAuth consent (for full-page redirect flow). */
export function googleAuthRedirect(req: Request, res: Response): void {
  if (!isGoogleOAuthConfigured()) {
    res.status(HttpStatusCode.BAD_REQUEST).json({
      data: null,
      error: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse);
    return;
  }

  const redirectPath =
    typeof req.query.redirect === "string" ? req.query.redirect : "/";
  const state = signOAuthState(redirectPath);
  res.redirect(getGoogleAuthorizationUrl(state));
}

/** Google OAuth callback — redirects to frontend with tokens in query string. */
export async function googleAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;

  if (!code || !state) {
    res.status(HttpStatusCode.BAD_REQUEST).json({
      data: null,
      error: "Missing code or state from Google",
      status: HttpStatusCode.BAD_REQUEST,
    } satisfies API.ErrorResponse);
    return;
  }

  const result = await googleCallbackService(code, state);
  if ("redirectUrl" in result) {
    res.redirect(result.redirectUrl);
    return;
  }

  res.status(result.status).json(result);
}

/**
 * Google Sign-In for SPAs (React @react-oauth/google, GIS button).
 * POST body: { "credential": "<google id token>" } or { "idToken": "..." }
 */
export async function googleSignIn(req: Request, res: Response): Promise<void> {
  const result = await googleSignInService(req.body);
  res.status(result.status).json(result);
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const data = {
      email: req.body.email,
      otp: req.body.otp,
    } satisfies Auth.VerifyEmailRequest;

    const result = await verifyEmailService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to verify email:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to verify email",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const data = {
      email: req.body.email,
    } satisfies Auth.ResendOtpRequest;

    const result = await resendOtpService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to resend OTP:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to resend verification code",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = {
      email: req.body.email,
    } satisfies Auth.ForgotPasswordRequest;

    const result = await forgotPasswordService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to process forgot password:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to process password reset request",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

export async function validateResetToken(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const token =
      typeof req.query.token === "string" ? req.query.token : req.body?.token;
    const result = await validateResetTokenService({ token });
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to validate reset token:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to validate reset link",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const data = {
      token: req.body.token,
      password: req.body.password,
      passwordConfirmation: req.body.passwordConfirmation,
    } satisfies Auth.ResetPasswordRequest;

    const result = await resetPasswordService(data);
    res.status(result.status).json(result);
  } catch (error) {
    console.error("Failed to reset password:", error);
    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      data: null,
      error: "Failed to reset password",
      status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    } satisfies API.ErrorResponse);
  }
}

/** Protected route — send `Authorization: Bearer <accessToken>`. */
export function me(req: Request, res: Response): void {
  res.status(HttpStatusCode.OK).json({
    data: { user: req.user! },
    error: null,
    status: HttpStatusCode.OK,
  } satisfies API.SuccessResponse<{ user: Auth.User }>);
}
