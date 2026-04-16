import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { deleteHashField, deletePattern, deleteValue, getHashAll, getValue, setHashField, setValue } from "../lib/redis";
import { requireAuth } from "../middleware/auth.middleware";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { magicLinkRateLimit } from "../middleware/rateLimit.middleware";

export const authRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

function refreshKey(userId: string, deviceId: string): string {
  return `refresh:${userId}:${deviceId}`;
}

function magicKey(token: string): string {
  return `magic:${token}`;
}

const mailer =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      })
    : null;

// ─── schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8).max(100),
  deviceId: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  deviceId: z.string().optional()
});

// ─── register ───────────────────────────────────────────────────────────────

authRouter.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { email, username, displayName, password, deviceId } = parsed.data;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      res.status(409).json({ error: "Email or username already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, username, displayName, passwordHash } });

    // Index in Meilisearch
    const { indexUser } = await import("../services/search.service");
    indexUser({ id: user.id, username: user.username, displayName: user.displayName }).catch(() => null);

    const device = deviceId ?? crypto.randomUUID();
    const accessToken = signAccessToken({ userId: user.id, email: user.email, deviceId: device });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email, deviceId: device });
    await setHashField(`refresh:${user.id}`, device, refreshToken);
    await setValue(refreshKey(user.id, device), refreshToken, 60 * 60 * 24 * 7);

    res.status(201).json({
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
      accessToken,
      refreshToken,
      deviceId: device
    });
  } catch (error) {
    console.error("[register] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── login ──────────────────────────────────────────────────────────────────

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, deviceId } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const isValid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!isValid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const device = deviceId ?? crypto.randomUUID();
  const accessToken = signAccessToken({ userId: user.id, email: user.email, deviceId: device });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email, deviceId: device });
  await setHashField(`refresh:${user.id}`, device, refreshToken);
  await setValue(refreshKey(user.id, device), refreshToken, 60 * 60 * 24 * 7);

  res.json({
    user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
    accessToken,
    refreshToken,
    deviceId: device
  });
});

// ─── refresh ─────────────────────────────────────────────────────────────────

authRouter.post("/refresh", async (req, res) => {
  const body = z.object({ refreshToken: z.string(), deviceId: z.string().optional() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(body.data.refreshToken);
    const device = body.data.deviceId ?? payload.deviceId ?? "default";
    const saved = await getValue(refreshKey(payload.userId, device));

    if (!saved || saved !== body.data.refreshToken) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email, deviceId: device });
    const rotatedRefresh = signRefreshToken({ userId: payload.userId, email: payload.email, deviceId: device });

    await setHashField(`refresh:${payload.userId}`, device, rotatedRefresh);
    await setValue(refreshKey(payload.userId, device), rotatedRefresh, 60 * 60 * 24 * 7);

    res.json({ accessToken, refreshToken: rotatedRefresh, deviceId: device });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ─── logout ──────────────────────────────────────────────────────────────────

authRouter.post("/logout", requireAuth, async (req, res) => {
  const device = req.body?.deviceId ?? req.authUser?.deviceId ?? "default";
  await deleteValue(refreshKey(req.authUser!.userId, device));
  await deleteHashField(`refresh:${req.authUser!.userId}`, device);
  res.status(204).send();
});

// ─── logout all devices ───────────────────────────────────────────────────────

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  await deletePattern(`refresh:${req.authUser!.userId}:*`);
  await deleteValue(`refresh:${req.authUser!.userId}`);
  res.status(204).send();
});

// ─── sessions list ────────────────────────────────────────────────────────────

authRouter.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await getHashAll(`refresh:${req.authUser!.userId}`);
  res.json(Object.keys(sessions).map((deviceId) => ({ deviceId })));
});

// ─── magic link ───────────────────────────────────────────────────────────────

authRouter.post("/magic-link", magicLinkRateLimit, async (req, res) => {
  const body = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user) {
    // Don't reveal whether email exists
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await setValue(magicKey(token), user.id, 60 * 15); // 15 min TTL

  const link = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/auth/magic-verify?token=${token}`;

  if (mailer) {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@soulchat.app",
      to: user.email,
      subject: "Your SoulChat magic link",
      html: `<p>Click to sign in (expires in 15 minutes):</p><p><a href="${link}">${link}</a></p>`
    });
  } else {
    console.log("[magic-link] SMTP not configured. Link:", link);
  }

  res.json({ ok: true });
});

authRouter.get("/magic-verify", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(400).json({ error: "Token required" });
    return;
  }

  const userId = await getValue(magicKey(token));
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  await deleteValue(magicKey(token));

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const device = crypto.randomUUID();
  const accessToken = signAccessToken({ userId: user.id, email: user.email, deviceId: device });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email, deviceId: device });
  await setHashField(`refresh:${user.id}`, device, refreshToken);
  await setValue(refreshKey(user.id, device), refreshToken, 60 * 60 * 24 * 7);

  res.json({
    user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
    accessToken,
    refreshToken,
    deviceId: device
  });
});

// ─── me ───────────────────────────────────────────────────────────────────────

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser?.userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    trustScore: user.trustScore
  });
});
