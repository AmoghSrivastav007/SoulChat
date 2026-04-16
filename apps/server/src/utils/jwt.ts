import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const accessSecret = process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me";
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me";

export type TokenPayload = {
  userId: string;
  email: string;
  jti?: string; // JWT ID for per-device tracking
  deviceId?: string;
};

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, email: payload.email, deviceId: payload.deviceId },
    accessSecret,
    { expiresIn: "15m" }
  );
}

export function signRefreshToken(payload: TokenPayload): string {
  const jti = randomUUID();
  return jwt.sign(
    { userId: payload.userId, email: payload.email, jti, deviceId: payload.deviceId },
    refreshSecret,
    { expiresIn: "7d" }
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, accessSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, refreshSecret) as TokenPayload;
}
