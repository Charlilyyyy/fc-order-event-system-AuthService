import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { HttpStatusCode } from "../types/http-status.js";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(HttpStatusCode.UNAUTHORIZED).json({
      data: null,
      error: "Authorization header with Bearer token is required",
      status: HttpStatusCode.UNAUTHORIZED,
    } satisfies API.ErrorResponse);
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(HttpStatusCode.UNAUTHORIZED).json({
      data: null,
      error: "Invalid or expired token",
      status: HttpStatusCode.UNAUTHORIZED,
    } satisfies API.ErrorResponse);
  }
}
