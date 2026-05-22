import type { Request, Response } from "express";
import rateLimit, { MemoryStore } from "express-rate-limit";
import { HttpStatusCode } from "../types/http-status.js";

/** Same IP: max 5 requests per minute on `/api` routes. */
export function createApiRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore(),
    handler(_req: Request, res: Response) {
      res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
        data: null,
        error: "Too many requests, please try again in one minute.",
        status: HttpStatusCode.TOO_MANY_REQUESTS,
      } satisfies API.ErrorResponse);
    },
  });
}
