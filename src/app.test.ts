import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("createApp", () => {
  const app = createApp();

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health").expect(200);

    expect(res.body).toMatchObject({
      status: "ok",
      service: "auth-service",
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api/auth/me without token returns 401", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);

    expect(res.body).toMatchObject({
      data: null,
      error: "Authorization header with Bearer token is required",
      status: 401,
    });
  });

  it("GET /api returns service info", async () => {
    const res = await request(app).get("/api").expect(200);

    expect(res.body).toEqual({
      message: "fc-order-event-system Auth Service",
      version: "0.1.0",
    });
  });

  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/unknown").expect(404);

    expect(res.body).toEqual({ error: "Not found" });
  });
});

describe("api rate limiter", () => {
  const app = createApp();

  it("returns 429 when same IP exceeds 5 requests per minute on /api", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).get("/api").expect(200);
    }

    const res = await request(app).get("/api").expect(429);

    expect(res.body).toMatchObject({
      data: null,
      error: "Too many requests, please try again in one minute.",
      status: 429,
    });
    expect(res.headers["ratelimit-limit"]).toBe("5");
  });

  it("does not rate limit /health", async () => {
    for (let i = 0; i < 6; i++) {
      await request(app).get("/health").expect(200);
    }
  });
});
