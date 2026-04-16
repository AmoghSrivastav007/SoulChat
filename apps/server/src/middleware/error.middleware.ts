import { NextFunction, Request, Response } from "express";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = (error as { status?: number })?.status ?? 500;
  const message = error instanceof Error ? error.message : "Unknown server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.method}] ${req.path}`, error);
  }

  res.status(status).json({ error: message });
}
