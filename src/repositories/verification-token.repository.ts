import { hashOtp } from "../lib/otp.js";
import { hashSecureToken } from "../lib/secure-token.js";
import { prisma } from "../lib/prisma.js";

export async function invalidateEmailVerificationTokens(
  userId: string,
): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: {
      userId,
      purpose: "email_verify",
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });
}

export async function createEmailVerificationToken(
  userId: string,
  email: string,
  otp: string,
  expiresAt: Date,
): Promise<void> {
  await invalidateEmailVerificationTokens(userId);

  await prisma.verificationToken.create({
    data: {
      userId,
      email,
      purpose: "email_verify",
      tokenHash: hashOtp(otp),
      expiresAt,
    },
  });
}

export async function findValidEmailVerificationToken(
  email: string,
  otp: string,
) {
  return prisma.verificationToken.findFirst({
    where: {
      email,
      purpose: "email_verify",
      tokenHash: hashOtp(otp),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });
}

export async function consumeVerificationToken(tokenId: string): Promise<void> {
  await prisma.verificationToken.update({
    where: { id: tokenId },
    data: { consumedAt: new Date() },
  });
}

export async function invalidatePasswordResetTokens(
  userId: string,
): Promise<void> {
  await prisma.verificationToken.updateMany({
    where: {
      userId,
      purpose: "password_reset",
      consumedAt: null,
    },
    data: { consumedAt: new Date() },
  });
}

export async function createPasswordResetToken(
  userId: string,
  email: string,
  rawToken: string,
  expiresAt: Date,
): Promise<void> {
  await invalidatePasswordResetTokens(userId);

  await prisma.verificationToken.create({
    data: {
      userId,
      email,
      purpose: "password_reset",
      tokenHash: hashSecureToken(rawToken),
      expiresAt,
    },
  });
}

export async function findValidPasswordResetToken(rawToken: string) {
  return prisma.verificationToken.findFirst({
    where: {
      purpose: "password_reset",
      tokenHash: hashSecureToken(rawToken),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });
}
