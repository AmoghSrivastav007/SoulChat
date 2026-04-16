import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const chatRouter = Router();

chatRouter.get("/", requireAuth, async (req, res) => {
  const userId = req.authUser!.userId;
  const chats = await prisma.chat.findMany({
    where: {
      members: {
        some: {
          userId
        }
      }
    },
    include: {
      members: true,
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const withUnread = await Promise.all(
    chats.map(async (chat) => {
      const membership = chat.members.find((member) => member.userId === userId);
      const unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          createdAt: { gt: membership?.lastRead ?? new Date(0) },
          senderId: { not: userId },
          isDeleted: false
        }
      });

      return {
        ...chat,
        unreadCount,
        lastMessage: chat.messages[0]
          ? {
              id: chat.messages[0].id,
              content: chat.messages[0].content,
              createdAt: chat.messages[0].createdAt
            }
          : null
      };
    })
  );

  res.json(withUnread);
});

chatRouter.post("/", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      type: z.enum(["DIRECT", "GROUP", "SPATIAL_ROOM", "STORY_CANVAS"]).default("DIRECT"),
      name: z.string().optional(),
      description: z.string().optional(),
      memberIds: z.array(z.string()).default([])
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const memberIds = Array.from(new Set([req.authUser!.userId, ...parsed.data.memberIds]));
  const chat = await prisma.chat.create({
    data: {
      type: parsed.data.type,
      name: parsed.data.name,
      description: parsed.data.description,
      members: {
        create: memberIds.map((userId, index) => ({
          userId,
          role: index === 0 ? "OWNER" : "MEMBER"
        }))
      }
    },
    include: { members: true }
  });
  res.status(201).json(chat);
});

chatRouter.get("/:id", requireAuth, async (req, res) => {
  const chat = await prisma.chat.findFirst({
    where: {
      id: req.params.id,
      members: { some: { userId: req.authUser!.userId } }
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true
            }
          }
        }
      }
    }
  });
  if (!chat) {
    res.status(404).json({ error: "Chat not found" });
    return;
  }
  res.json(chat);
});

chatRouter.patch("/:id", requireAuth, async (req, res) => {
  const parsed = z.object({ name: z.string().optional(), description: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const updated = await prisma.chat.update({
    where: { id: req.params.id },
    data: parsed.data
  });
  res.json(updated);
});

chatRouter.delete("/:id", requireAuth, async (req, res) => {
  await prisma.chat.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

chatRouter.post("/:id/members", requireAuth, async (req, res) => {
  const body = z.object({ userId: z.string().min(1) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.flatten() });
    return;
  }
  const member = await prisma.chatMember.upsert({
    where: { chatId_userId: { chatId: req.params.id, userId: body.data.userId } },
    update: {},
    create: { chatId: req.params.id, userId: body.data.userId, role: "MEMBER" }
  });
  res.status(201).json(member);
});

chatRouter.delete("/:id/members/:userId", requireAuth, async (req, res) => {
  await prisma.chatMember.deleteMany({
    where: {
      chatId: req.params.id,
      userId: req.params.userId
    }
  });
  res.status(204).send();
});

chatRouter.get("/:id/media", requireAuth, async (req, res) => {
  const mediaMessages = await prisma.message.findMany({
    where: {
      chatId: req.params.id,
      mediaUrl: { not: null }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json(mediaMessages);
});

chatRouter.get("/:id/memories", requireAuth, async (req, res) => {
  const memories = await prisma.memory.findMany({
    where: { chatId: req.params.id },
    orderBy: { createdAt: "desc" }
  });
  res.json(memories);
});
