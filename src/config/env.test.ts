import { describe, expect, it } from "vitest";
import { env, validateEnv } from "./env.js";

describe("env", () => {
  it("exposes defaults from vitest setup", () => {
    expect(env.port).toBe(3001);
    expect(env.serviceName).toBe("auth-service");
    expect(env.nodeEnv).toBe("test");
    expect(env.isProduction).toBe(false);
    expect(env.databaseUrl).toBe(process.env.DATABASE_URL);
  });

  it("validateEnv passes with valid port", () => {
    expect(() => validateEnv()).not.toThrow();
  });
});
