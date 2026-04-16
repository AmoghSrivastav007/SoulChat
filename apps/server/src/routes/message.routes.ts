import { Prisma } from "@prisma/client";
import { QuestType } from "@prisma/client";
import { Router } from "express";
import { Server } from "socket.io";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { detectEmotion } from "../services/ai.service";
import { createPresignedUpload } from "../services/storage.service";
import { indexMessage, deleteMessageFromIndex } from "../services/search.service";
import { sendMessageNotification } from "../services/notification.service";
import { progressQuest } from "../services/quest.service";

const sendMessageSchema = z.object({
  chatId: z.string().min(1),
  content: z.string().optional(),
  type: z
    .enum([
      "TEXT",
      "VOICE",
      "IMAGE",
      "VIDEO",
      "FILE",
      "AR_OBJECT",
      "GAME_MOVE",
      "STORY_SEGMENT",
      "SYSTEM",
      "CONDITIONAL",
      "TIME_CAPSULE"
    ])
    .default("TEXT"),
  replyToId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export function createMessageRouter(io: Server): Router {
  const messageRouter = Router();

  messageRouter.get("/:chatId", requireAuth, async (req, res) => {
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const chatId = req.params.chatId;

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 30,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { reactions: true }
    });

    await prisma.chatMember.updateMany({
      where: {
        chatId,
        userId: req.authUser!.userId
      },
      data: {
        lastRead: new Date()
      }
    });

    res.json({
      items: messages,
      nextCursor: messages.length === 30 ? messages[messages.length - 1]?.id : null
    });
  });

  messageRouter.post("/", requireAuth, async (req, res) => {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { chatId, content, type, replyToId, metadata } = parsed.data;
    const emotion = content
      ? await detectEmotion({ message: content })
      : { emotion: "neutral" as const, score: 0.5, reason: "No text content to analyze." };
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: req.authUser!.userId,
        content,
        type,
        replyToId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        emotionTag: emotion.emotion,
        emotionScore: emotion.score
      },
      include: { reactions: true }
    });

    io.to(chatId).emit("message_received", { message });

    // Index in Meilisearch
    if (message.content) {
      indexMessage({ id: message.id, chatId, senderId: req.authUser!.userId, content: message.content, createdAt: message.createdAt.toISOString() }).catch(() => null);
    }

    // Push notifications to other members
    const members = await prisma.chatMember.findMany({
      where: { chatId, userId: { not: req.authUser!.userId } },
      select: { userId: true }
    });
    for (const member of members) {
      sendMessageNotification(req.authUser!.userId, member.userId, chatId, message.content ?? "New message").catch(() => null);
    }

    // Quest auto-progression
    if (type === "VOICE") progressQuest(req.authUser!.userId, QuestType.SEND_VOICE).catch(() => null);
    if (type === "TIME_CAPSULE") progressQuest(req.authUser!.userId, QuestType.SEND_TIME_CAPSULE).catch(() => null);

    if (type === "STORY_SEGMENT") progressQuest(req.authUser!.userId, QuestType.COMPLETE_STORY).catch(() => null);
    if (type === "TEXT" || type === "VOICE") {
      const lastMsg = await prisma.message.findFirst({
        where: { chatId, isDeleted: false, id: { not: message.id } },
        orderBy: { createdAt: "desc" }
      });
      if (lastMsg) {
        const daysSince = (Date.now() - lastMsg.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 7) {
          progressQuest(req.authUser!.userId, QuestType.REVIVE_OLD_CHAT).catch(() => null);
        }
      }
    }

    res.status(201).json(message);
  });

  messageRouter.patch("/:id", requireAuth, async (req, res) => {
    const id = req.params.id;
    const content = z.string().min(1).safeParse(req.body?.content);
    if (!content.success) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const existing = await prisma.message.findUnique({ where: { id } });
    if (!existing || existing.senderId !== req.authUser!.userId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        originalContent: existing.originalContent ?? existing.content,
        content: content.data,
        isEdited: true
      }
    });
    io.to(updated.chatId).emit("message_edited", { messageId: updated.id, content: updated.content });
    res.json(updated);
  });

  messageRouter.delete("/:id", requireAuth, async (req, res) => {
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.senderId !== req.authUser!.userId) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    await prisma.message.update({
      where: { id: req.params.id },
      data: { isDeleted: true, content: null }
    });
    deleteMessageFromIndex(req.params.id).catch(() => null);
    io.to(existing.chatId).emit("message_deleted", { messageId: req.params.id });
    res.status(204).send();
  });

  messageRouter.post("/:id/reactions", requireAuth, async (req, res) => {
    const emoji = z.string().min(1).max(12).safeParse(req.body?.emoji);
    if (!emoji.success) {
      res.status(400).json({ error: "emoji is required" });
      return;
    }

    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    const reaction = await prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId: req.params.id,
          userId: req.authUser!.userId,
          emoji: emoji.data
        }
      },
      update: {},
      create: {
        messageId: req.params.id,
        userId: req.authUser!.userId,
        emoji: emoji.data
      }
    });

    io.to(message.chatId).emit("reaction_added", {
      messageId: req.params.id,
      userId: req.authUser!.userId,
      emoji: reaction.emoji
    });
    res.status(201).json(reaction);
  });

  messageRouter.delete("/:id/reactions/:emoji", requireAuth, async (req, res) => {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    await prisma.reaction.deleteMany({
      where: {
        messageId: req.params.id,
        userId: req.authUser!.userId,
        emoji: req.params.emoji
      }
    });
    res.status(204).send();
  });

  messageRouter.post("/upload-url", requireAuth, async (req, res) => {
    const parsed = z
      .object({
        mimeType: z.string().min(1),
        extension: z.string().min(1)
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await createPresignedUpload({
      userId: req.authUser!.userId,
      mimeType: parsed.data.mimeType,
      extension: parsed.data.extension
    });
    res.json(result);
  });

  return messageRouter;
}
