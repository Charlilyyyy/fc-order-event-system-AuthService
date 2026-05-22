import { describe, expect, it } from "vitest";
import { generateOtp, hashOtp, verifyOtpHash } from "./otp.js";

describe("otp", () => {
  it("generates a 6-digit code", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it("verifies matching OTP hash", () => {
    const otp = "123456";
    const tokenHash = hashOtp(otp);
    expect(verifyOtpHash(otp, tokenHash)).toBe(true);
    expect(verifyOtpHash("000000", tokenHash)).toBe(false);
  });
});
