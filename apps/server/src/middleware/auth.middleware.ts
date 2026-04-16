import { NextFunction, Request, Response } from "express";
import { TokenPayload, verifyAccessToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      authUser?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
