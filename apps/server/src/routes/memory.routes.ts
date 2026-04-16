import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { progressQuest } from "../services/quest.service";
import { QuestType } from "@prisma/client";

export const memoryRouter = Router();

memoryRouter.get("/:chatId", requireAuth, async (req, res) => {
  const memories = await prisma.memory.findMany({
    where: { chatId: req.params.chatId },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  res.json(memories);
});

memoryRouter.post("/:chatId/pin", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      title: z.string().min(1),
      content: z.string().optional(),
      mediaUrls: z.array(z.string()).default([])
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const memory = await prisma.memory.create({
    data: {
      chatId: req.params.chatId,
      createdById: req.authUser!.userId,
      title: parsed.data.title,
      content: parsed.data.content,
      mediaUrls: parsed.data.mediaUrls,
      type: "USER_PINNED",
      isStarred: true
    }
  });
  // Quest: share a memory
  progressQuest(req.authUser!.userId, QuestType.SHARE_MEMORY).catch(() => null);
  res.status(201).json(memory);
});

memoryRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = z.object({ isStarred: z.boolean().optional(), title: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.memory.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(updated);
});

memoryRouter.delete("/:id", requireAuth, async (req, res) => {
  await prisma.memory.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
