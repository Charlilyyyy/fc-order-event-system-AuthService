import { describe, expect, it } from "vitest";
import {
  stripAndValidateResendOtpInput,
  stripAndValidateVerifyEmailInput,
} from "./validation.js";

describe("verify email validation", () => {
  it("accepts valid verify email input", () => {
    expect(
      stripAndValidateVerifyEmailInput({
        email: "User@Example.com",
        otp: "123456",
      }),
    ).toEqual({ email: "user@example.com", otp: "123456" });
  });

  it("rejects invalid OTP", () => {
    expect(
      stripAndValidateVerifyEmailInput({
        email: "user@example.com",
        otp: "12345",
      }),
    ).toBeNull();
  });

  it("accepts valid resend OTP input", () => {
    expect(
      stripAndValidateResendOtpInput({ email: "User@Example.com" }),
    ).toEqual({ email: "user@example.com" });
  });
});
