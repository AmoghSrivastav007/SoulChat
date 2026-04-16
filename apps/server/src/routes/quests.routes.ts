import { Router } from "express";
import { QuestType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const questsRouter = Router();

questsRouter.get("/daily", requireAuth, async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.quest.findMany({ where: { isDaily: true }, take: 3 });
  if (existing.length < 3) {
    const defaults = [
      {
        title: "Send a voice note",
        description: "Share one voice message with someone close.",
        type: QuestType.SEND_VOICE,
        xpReward: 20,
        tokenReward: 5
      },
      {
        title: "React to 5 messages",
        description: "React across chats to keep momentum alive.",
        type: QuestType.REACT_TO_MESSAGES,
        xpReward: 15,
        tokenReward: 4
      },
      {
        title: "Revive an old chat",
        description: "Message someone you have not talked to lately.",
        type: QuestType.REVIVE_OLD_CHAT,
        xpReward: 25,
        tokenReward: 6
      }
    ];
    for (const quest of defaults) {
      await prisma.quest.create({ data: quest });
    }
  }

  const quests = await prisma.quest.findMany({ where: { isDaily: true }, take: 3 });
  const progress = await prisma.questProgress.findMany({
    where: { userId: req.authUser!.userId, date: { gte: startOfDay } }
  });

  res.json(
    quests.map((quest) => ({
      ...quest,
      progress: progress.find((item) => item.questId === quest.id) ?? null
    }))
  );
});

questsRouter.post("/:id/complete", requireAuth, async (req, res) => {
  const userId = req.authUser!.userId;
  const questId = req.params.id;
  const now = new Date();
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const entry = await prisma.questProgress.upsert({
    where: { userId_questId_date: { userId, questId, date: day } },
    update: { status: "COMPLETED", completedAt: now },
    create: { userId, questId, status: "COMPLETED", completedAt: now, date: day }
  });

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (quest) {
    await prisma.user.update({
      where: { id: userId },
      data: { trustScore: { increment: quest.tokenReward } }
    });

    // XP + leveling
    const xpRecord = await prisma.userXP.upsert({
      where: { userId },
      update: { xp: { increment: quest.xpReward } },
      create: { userId, xp: quest.xpReward }
    });
    const newLevel = Math.floor(xpRecord.xp / 100) + 1;
    if (newLevel !== xpRecord.level) {
      await prisma.userXP.update({ where: { userId }, data: { level: newLevel } });
    }
  }

  res.status(201).json(entry);
});

questsRouter.get("/xp", requireAuth, async (req, res) => {
  const xp = await prisma.userXP.findUnique({ where: { userId: req.authUser!.userId } });
  res.json(xp ?? { xp: 0, level: 1, streak: 0 });
});
