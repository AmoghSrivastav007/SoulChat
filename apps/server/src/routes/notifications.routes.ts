import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const notificationsRouter = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

notificationsRouter.post("/subscribe", requireAuth, async (req, res) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { endpoint, keys } = parsed.data;
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: {
      userId: req.authUser!.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth
    }
  });

  res.status(201).json({ id: sub.id });
});

notificationsRouter.delete("/subscribe", requireAuth, async (req, res) => {
  const endpoint = z.string().safeParse(req.body?.endpoint);
  if (!endpoint.success) {
    res.status(400).json({ error: "endpoint required" });
    return;
  }
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: endpoint.data, userId: req.authUser!.userId }
  });
  res.status(204).send();
});

notificationsRouter.get("/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});
