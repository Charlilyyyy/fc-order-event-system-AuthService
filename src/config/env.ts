import "dotenv/config";

const DEFAULT_JWT_SECRET = "dev-only-jwt-secret-minimum-32-characters";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  serviceName: process.env.SERVICE_NAME ?? "auth-service",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3001/api/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "noreply@localhost",
  otpExpiresInMinutes: Number(process.env.OTP_EXPIRES_IN_MINUTES ?? 15),
  passwordResetExpiresInMinutes: Number(
    process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES ?? 60,
  ),
  passwordResetPath:
    process.env.PASSWORD_RESET_PATH ?? "/reset-password",
} as const;

export function validateEnv(): void {
  if (Number.isNaN(env.port) || env.port < 1 || env.port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  if (env.isProduction && env.jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production");
  }

  if (env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
}
