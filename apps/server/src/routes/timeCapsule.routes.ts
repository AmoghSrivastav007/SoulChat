import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const timeCapsuleRouter = Router();

timeCapsuleRouter.post("/", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      chatId: z.string().optional(),
      content: z.string().min(1),
      mediaUrls: z.array(z.string()).default([]),
      voiceUrl: z.string().optional(),
      deliverAt: z.string(),
      condition: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const capsule = await prisma.timeCapsule.create({
    data: {
      senderId: req.authUser!.userId,
      chatId: parsed.data.chatId,
      content: parsed.data.content,
      mediaUrls: parsed.data.mediaUrls,
      voiceUrl: parsed.data.voiceUrl,
      deliverAt: new Date(parsed.data.deliverAt),
      condition: parsed.data.condition
    }
  });
  res.status(201).json(capsule);
});

timeCapsuleRouter.get("/me", requireAuth, async (req, res) => {
  const capsules = await prisma.timeCapsule.findMany({
    where: { senderId: req.authUser!.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json(capsules);
});

timeCapsuleRouter.delete("/:id", requireAuth, async (req, res) => {
  await prisma.timeCapsule.deleteMany({
    where: { id: req.params.id, senderId: req.authUser!.userId }
  });
  res.status(204).send();
});
