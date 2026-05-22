import { createHash, randomInt } from "node:crypto";

const OTP_LENGTH = 6;

export function generateOtp(): string {
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(0, max)).padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, tokenHash: string): boolean {
  return hashOtp(otp) === tokenHash;
}
