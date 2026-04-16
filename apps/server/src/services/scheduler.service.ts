import cron from "node-cron";
import { Server } from "socket.io";
import { prisma } from "../lib/prisma";
import { summarizeContext } from "./ai.service";
import { indexMessage } from "./search.service";

export function startSchedulers(io: Server): void {
  // ── Hourly: time capsule delivery + conditional messages ──────────────────
  cron.schedule("0 * * * *", async () => {
    const now = new Date();

    const dueCapsules = await prisma.timeCapsule.findMany({
      where: { isDelivered: false, deliverAt: { lte: now } }
    });

    for (const capsule of dueCapsules) {
      await prisma.timeCapsule.update({ where: { id: capsule.id }, data: { isDelivered: true } });
      if (capsule.chatId) {
        io.to(capsule.chatId).emit("capsule_delivered", { capsule: { ...capsule, isDelivered: true } });
      }
    }

    const conditionalAll = await prisma.message.findMany({
      where: { type: "CONDITIONAL", isDeleted: false }
    });

    const conditionalDue = conditionalAll.filter((message) => {
      const metadata = message.metadata as { scheduledAt?: string } | null;
      if (!metadata?.scheduledAt) return false;
      return new Date(metadata.scheduledAt) <= now;
    });

    for (const message of conditionalDue) {
      io.to(message.chatId).emit("message_received", { message });
    }
  });

  // ── Self-destruct messages ─────────────────────────────────────────────────
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date();
    const expired = await prisma.message.findMany({
      where: { expiresAt: { lte: now }, isDeleted: false }
    });
    for (const message of expired) {
      await prisma.message.update({
        where: { id: message.id },
        data: { isDeleted: true, content: null }
      });
      io.to(message.chatId).emit("message_deleted", { messageId: message.id });
    }
  });

  // ── Weekly: AI memory curation ─────────────────────────────────────────────
  cron.schedule("0 3 * * 0", async () => {
    const chats = await prisma.chat.findMany({ select: { id: true } });
    for (const chat of chats) {
      try {
        const recentMessages = await prisma.message.findMany({
          where: { chatId: chat.id, isDeleted: false, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { content: true, senderId: true }
        });
        if (recentMessages.length < 5) continue;

        const result = await summarizeContext({
          messages: recentMessages.map((m) => m.content ?? "").filter(Boolean)
        });

        if (result.summary) {
          const firstMember = await prisma.chatMember.findFirst({ where: { chatId: chat.id } });
          if (firstMember) {
            await prisma.memory.create({
              data: {
                chatId: chat.id,
                createdById: firstMember.userId,
                title: `Weekly recap – ${new Date().toLocaleDateString()}`,
                content: result.summary,
                type: "AI_CURATED"
              }
            });
          }
        }
      } catch {
        // skip failed chats
      }
    }
  });

  // ── Daily: relationship score update ──────────────────────────────────────
  cron.schedule("0 2 * * *", async () => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const messages = await prisma.message.findMany({
      where: { createdAt: { gte: since }, isDeleted: false },
      select: { senderId: true, chatId: true, emotionTag: true, createdAt: true }
    });

    // Group by chat → compute per-pair scores
    const chatMembers = await prisma.chatMember.findMany({
      where: { chat: { type: "DIRECT" } },
      select: { chatId: true, userId: true }
    });

    const chatPairs: Record<string, string[]> = {};
    for (const m of chatMembers) {
      if (!chatPairs[m.chatId]) chatPairs[m.chatId] = [];
      chatPairs[m.chatId].push(m.userId);
    }

    for (const [chatId, members] of Object.entries(chatPairs)) {
      if (members.length !== 2) continue;
      const [a, b] = members;
      const chatMessages = messages.filter((m) => m.chatId === chatId);
      const frequency = Math.min(chatMessages.length / 30, 1) * 100;
      const positiveCount = chatMessages.filter((m) => m.emotionTag === "happy").length;
      const positivity = chatMessages.length > 0 ? (positiveCount / chatMessages.length) * 100 : 50;

      await prisma.relationshipScore.upsert({
        where: { userAId_userBId: { userAId: a, userBId: b } },
        update: { frequencyScore: frequency, positivityScore: positivity, score: (frequency + positivity) / 2, lastUpdated: new Date() },
        create: { userAId: a, userBId: b, frequencyScore: frequency, positivityScore: positivity, score: (frequency + positivity) / 2 }
      });
    }
  });

  // ── Meilisearch backfill on startup ───────────────────────────────────────
  setTimeout(async () => {
    try {
      const { ensureIndexes } = await import("./search.service");
      await ensureIndexes();

      const recentMessages = await prisma.message.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: { id: true, chatId: true, senderId: true, content: true, createdAt: true }
      });
      for (const m of recentMessages) {
        if (m.content) {
          await indexMessage({ id: m.id, chatId: m.chatId, senderId: m.senderId, content: m.content, createdAt: m.createdAt.toISOString() });
        }
      }
    } catch {
      // search not configured
    }
  }, 5000);
}
