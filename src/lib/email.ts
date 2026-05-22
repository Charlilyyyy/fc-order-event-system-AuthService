import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function isSmtpConfigured(): boolean {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

function createTransport() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

export async function sendVerificationOtpEmail(
  to: string,
  otp: string,
): Promise<void> {
  const subject = "Verify your email";
  const text = `Your verification code is: ${otp}\n\nThis code expires in ${env.otpExpiresInMinutes} minutes.`;

  if (!isSmtpConfigured()) {
    if (env.isProduction) {
      throw new Error("SMTP is not configured");
    }
    console.info(`[email:dev] OTP for ${to}: ${otp}`);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html: `<p>Your verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in ${env.otpExpiresInMinutes} minutes.</p>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Reset your password";
  const text = `Reset your password using this link (expires in ${env.passwordResetExpiresInMinutes} minutes):\n\n${resetUrl}`;

  if (!isSmtpConfigured()) {
    if (env.isProduction) {
      throw new Error("SMTP is not configured");
    }
    console.info(`[email:dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html: `<p>Click the link below to reset your password. This link expires in ${env.passwordResetExpiresInMinutes} minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
