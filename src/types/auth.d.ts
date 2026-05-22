declare namespace Auth {
  /** API-safe user (no secrets). */
  interface User {
    id: string;
    email: string;
  }

  /** OAuth-style token fields returned on login. */
  interface LoginTokens {
    accessToken: string;
    tokenType: "Bearer";
    /** Lifetime in seconds. */
    expiresIn: number;
  }

  /** Successful login payload for the frontend. */
  interface LoginResponse {
    user: User;
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
  }

  /** Email + password only — used for login requests. */
  type LoginUser = Pick<UserCredentials, "email" | "password">;

  /** Signup request: credentials + confirmation. */
  interface SignupUser extends Pick<UserCredentials, "email" | "password"> {
    passwordConfirmation: string;
  }

  /** Signup success before email is verified (no tokens). */
  interface SignupPendingResponse {
    user: User;
    message: string;
    /** OTP lifetime in seconds. */
    otpExpiresIn: number;
  }

  /** Verify email with OTP sent after signup. */
  interface VerifyEmailRequest {
    email: string;
    otp: string;
  }

  /** Resend verification OTP. */
  interface ResendOtpRequest {
    email: string;
  }

  /** Request password reset link by email. */
  interface ForgotPasswordRequest {
    email: string;
  }

  /** Set a new password using the token from the reset email link. */
  interface ResetPasswordRequest {
    token: string;
    password: string;
    passwordConfirmation: string;
  }

  /** Validate reset token before showing the new-password form. */
  interface ValidateResetTokenRequest {
    token: string;
  }

  /** Google Sign-In from frontend (GIS) — ID token from Google. */
  interface GoogleSignInRequest {
    /** Google Identity Services field name. */
    credential?: string;
    /** Alternative field name for the same ID token. */
    idToken?: string;
  }

  /** Normalized Google account from OAuth / ID token verification. */
  interface GoogleAccount {
    googleId: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
  }

  /** Sensitive fields — never return from API responses. */
  interface UserCredentials {
    email: string;
    password: string;
  }
}
