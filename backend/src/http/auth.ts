import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.apiToken) {
    next();
    return;
  }

  const bearer = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const headerToken = req.header("x-api-token");
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = bearer || headerToken || queryToken;

  if (token === config.apiToken) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export function isAuthorizedToken(token?: string | null): boolean {
  if (!config.apiToken) return true;
  return token === config.apiToken;
}

