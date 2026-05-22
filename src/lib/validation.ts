const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** Blocks obvious SQL/script patterns in user input (defense in depth; use Prisma for DB safety). */
const SUSPICIOUS_INPUT_PATTERN =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)|(--)|(;)|(\/\*)|(\*\/)|(<script)/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function containsSuspiciousInput(value: string): boolean {
  return SUSPICIOUS_INPUT_PATTERN.test(value);
}

function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}

function isValidPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stripAndValidateLoginInput(
  data: unknown,
): Auth.LoginUser | null {
  if (!isRecord(data)) return null;

  const email = data.email;
  const password = data.password;
  if (typeof email !== "string" || typeof password !== "string") return null;

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!trimmedEmail || !trimmedPassword) return null;
  if (!isValidEmail(trimmedEmail) || !isValidPassword(trimmedPassword)) {
    return null;
  }
  if (
    containsSuspiciousInput(trimmedEmail) ||
    containsSuspiciousInput(trimmedPassword)
  ) {
    return null;
  }

  return { email: trimmedEmail, password: trimmedPassword };
}

export function stripAndValidateSignupInput(
  data: unknown,
): Auth.SignupUser | null {
  if (!isRecord(data)) return null;

  const email = data.email;
  const password = data.password;
  const passwordConfirmation = data.passwordConfirmation;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string"
  ) {
    return null;
  }

  const login = stripAndValidateLoginInput({ email, password });
  if (!login) return null;

  const trimmedConfirmation = passwordConfirmation.trim();
  if (login.password !== trimmedConfirmation) return null;

  return {
    email: login.email,
    password: login.password,
    passwordConfirmation: trimmedConfirmation,
  };
}

const OTP_PATTERN = /^\d{6}$/;

export function stripAndValidateVerifyEmailInput(
  data: unknown,
): Auth.VerifyEmailRequest | null {
  if (!isRecord(data)) return null;

  const email = data.email;
  const otp = data.otp;
  if (typeof email !== "string" || typeof otp !== "string") return null;

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedOtp = otp.trim();

  if (!trimmedEmail || !trimmedOtp) return null;
  if (!isValidEmail(trimmedEmail) || !OTP_PATTERN.test(trimmedOtp)) return null;
  if (
    containsSuspiciousInput(trimmedEmail) ||
    containsSuspiciousInput(trimmedOtp)
  ) {
    return null;
  }

  return { email: trimmedEmail, otp: trimmedOtp };
}

export function stripAndValidateResendOtpInput(
  data: unknown,
): Auth.ResendOtpRequest | null {
  if (!isRecord(data)) return null;

  const email = data.email;
  if (typeof email !== "string") return null;

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !isValidEmail(trimmedEmail)) return null;
  if (containsSuspiciousInput(trimmedEmail)) return null;

  return { email: trimmedEmail };
}

export function stripAndValidateForgotPasswordInput(
  data: unknown,
): Auth.ForgotPasswordRequest | null {
  return stripAndValidateResendOtpInput(data);
}

const RESET_TOKEN_MIN_LENGTH = 32;
const RESET_TOKEN_MAX_LENGTH = 128;

function isValidResetToken(value: string): boolean {
  return (
    value.length >= RESET_TOKEN_MIN_LENGTH &&
    value.length <= RESET_TOKEN_MAX_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function stripAndValidateResetToken(
  data: unknown,
): Auth.ValidateResetTokenRequest | null {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed || !isValidResetToken(trimmed)) return null;
    return { token: trimmed };
  }

  if (!isRecord(data)) return null;

  const token = data.token;
  if (typeof token !== "string") return null;

  const trimmedToken = token.trim();
  if (!trimmedToken || !isValidResetToken(trimmedToken)) return null;
  if (containsSuspiciousInput(trimmedToken)) return null;

  return { token: trimmedToken };
}

export function stripAndValidateResetPasswordInput(
  data: unknown,
): Auth.ResetPasswordRequest | null {
  if (!isRecord(data)) return null;

  const token = data.token;
  const password = data.password;
  const passwordConfirmation = data.passwordConfirmation;
  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string"
  ) {
    return null;
  }

  const tokenInput = stripAndValidateResetToken({ token });
  if (!tokenInput) return null;

  const trimmedPassword = password.trim();
  const trimmedConfirmation = passwordConfirmation.trim();
  if (!trimmedPassword || !trimmedConfirmation) return null;
  if (!isValidPassword(trimmedPassword)) return null;
  if (trimmedPassword !== trimmedConfirmation) return null;
  if (
    containsSuspiciousInput(trimmedPassword) ||
    containsSuspiciousInput(trimmedConfirmation)
  ) {
    return null;
  }

  return {
    token: tokenInput.token,
    password: trimmedPassword,
    passwordConfirmation: trimmedConfirmation,
  };
}

export function extractGoogleIdToken(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const credential = data.credential;
  const idToken = data.idToken;

  if (typeof credential === "string" && credential.trim()) {
    return credential.trim();
  }
  if (typeof idToken === "string" && idToken.trim()) {
    return idToken.trim();
  }

  return null;
}
