import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const usersRouter = Router();

usersRouter.get("/:id", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      moodWord: true,
      currentSong: true,
      trustScore: true,
      currentPersona: true,
      personas: true
    }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

usersRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      displayName: z.string().optional(),
      bio: z.string().max(140).optional(),
      moodWord: z.string().max(32).optional(),
      currentSong: z.string().max(120).optional(),
      avatarUrl: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: req.authUser!.userId },
    data: parsed.data
  });

  // Keep search index in sync
  const { indexUser } = await import("../services/search.service");
  indexUser({ id: updated.id, username: updated.username, displayName: updated.displayName }).catch(() => null);

  res.json(updated);
});

usersRouter.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.json([]);
    return;
  }
  const users = await prisma.user.findMany({
    where: {
      OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }]
    },
    take: 20,
    select: { id: true, username: true, displayName: true, avatarUrl: true }
  });
  res.json(users);
});

usersRouter.post("/me/persona", requireAuth, async (req, res) => {
  const parsed = z.object({ persona: z.string().min(1), config: z.record(z.unknown()) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.userId } });
  const current = Array.isArray(user?.personas) ? (user?.personas as unknown[]) : [];
  const personas = [...current.filter((item) => (item as { persona?: string }).persona !== parsed.data.persona), parsed.data];
  const updated = await prisma.user.update({
    where: { id: req.authUser!.userId },
    data: { personas: personas as Prisma.InputJsonValue, currentPersona: parsed.data.persona }
  });
  res.json(updated);
});

usersRouter.get("/me/relationship-scores", requireAuth, async (req, res) => {
  const userId = req.authUser!.userId;
  const scores = await prisma.relationshipScore.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }]
    }
  });
  res.json(scores);
});

usersRouter.get("/me/trust-tokens", requireAuth, async (req, res) => {
  const userId = req.authUser!.userId;
  const sent = await prisma.trustTransaction.aggregate({ where: { senderId: userId }, _sum: { amount: true } });
  const received = await prisma.trustTransaction.aggregate({ where: { receiverId: userId }, _sum: { amount: true } });
  const balance = 100 - (sent._sum.amount ?? 0) + (received._sum.amount ?? 0);
  res.json({ balance, sent: sent._sum.amount ?? 0, received: received._sum.amount ?? 0 });
});
