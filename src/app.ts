import express from "express";
import { createApiRateLimiter } from "./middleware/rateLimitter.js";
import { apiRouter } from "./routes/api.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(healthRouter);
  app.use("/api", createApiRateLimiter(), apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
