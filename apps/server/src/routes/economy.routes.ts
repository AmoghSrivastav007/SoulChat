import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const economyRouter = Router();

economyRouter.post("/tip", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      receiverId: z.string().min(1),
      amount: z.number().int().min(1).max(50),
      reason: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { receiverId, amount, reason } = parsed.data;
  const senderId = req.authUser!.userId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = await prisma.trustTransaction.aggregate({
    where: { senderId, createdAt: { gte: today } },
    _sum: { amount: true }
  });
  if ((sentToday._sum.amount ?? 0) + amount > 50) {
    res.status(400).json({ error: "Daily trust tip limit exceeded (50)." });
    return;
  }

  const tx = await prisma.trustTransaction.create({
    data: { senderId, receiverId, amount, reason }
  });
  await prisma.user.update({
    where: { id: receiverId },
    data: { trustScore: { increment: amount } }
  });

  res.status(201).json(tx);
});

economyRouter.get("/leaderboard", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { trustScore: "desc" },
    take: 20,
    select: { id: true, username: true, displayName: true, trustScore: true }
  });
  res.json(users);
});
