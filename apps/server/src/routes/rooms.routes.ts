import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const roomsRouter = Router();

roomsRouter.get("/", requireAuth, async (_req, res) => {
  const rooms = await prisma.chat.findMany({
    where: { type: "SPATIAL_ROOM" },
    orderBy: { updatedAt: "desc" },
    take: 50
  });
  res.json(rooms);
});

roomsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1),
      background: z.string().default("cafe"),
      password: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const room = await prisma.chat.create({
    data: {
      type: "SPATIAL_ROOM",
      name: parsed.data.name,
      roomConfig: { background: parsed.data.background, password: parsed.data.password ?? null },
      members: {
        create: [{ userId: req.authUser!.userId, role: "OWNER" }]
      }
    }
  });
  res.status(201).json(room);
});
