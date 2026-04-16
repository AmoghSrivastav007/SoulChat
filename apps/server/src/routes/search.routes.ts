import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import { searchMessages, searchUsers } from "../services/search.service";
import { prisma } from "../lib/prisma";

export const searchRouter = Router();

searchRouter.get("/", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const chatId = req.query.chatId ? String(req.query.chatId) : undefined;

  if (!q) {
    res.json({ users: [], messages: [] });
    return;
  }

  const [users, messages] = await Promise.all([
    searchUsers(q),
    searchMessages(q, chatId)
  ]);

  // Fallback to Prisma if Meilisearch not configured
  const finalUsers = users.length > 0 ? users : await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } }
      ]
    },
    take: 20,
    select: { id: true, username: true, displayName: true }
  });

  const finalMessages = messages.length > 0 ? messages : await prisma.message.findMany({
    where: {
      content: { contains: q, mode: "insensitive" },
      isDeleted: false,
      ...(chatId ? { chatId } : {})
    },
    take: 30,
    orderBy: { createdAt: "desc" },
    select: { id: true, chatId: true, senderId: true, content: true, createdAt: true }
  }).then((msgs) => msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));

  res.json({ users: finalUsers, messages: finalMessages });
});
