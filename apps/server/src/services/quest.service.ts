import { QuestType } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Per-quest completion thresholds (how many events needed to complete)
const QUEST_THRESHOLDS: Partial<Record<QuestType, number>> = {
  [QuestType.REACT_TO_MESSAGES]: 5,
  [QuestType.SEND_VOICE]: 1,
  [QuestType.SEND_TIME_CAPSULE]: 1,
  [QuestType.REVIVE_OLD_CHAT]: 1,
  [QuestType.PLAY_GAME]: 1,
  [QuestType.SHARE_MEMORY]: 1,
  [QuestType.COMPLETE_STORY]: 1
};

/**
 * Auto-progress a quest for a user based on an event type.
 * Tracks a counter in the progress metadata and completes when threshold is met.
 */
export async function progressQuest(userId: string, type: QuestType): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quest = await prisma.quest.findFirst({ where: { type, isDaily: true } });
  if (!quest) return;

  const threshold = QUEST_THRESHOLDS[type] ?? 1;

  const existing = await prisma.questProgress.findUnique({
    where: { userId_questId_date: { userId, questId: quest.id, date: today } }
  });

  if (existing?.status === "COMPLETED" || existing?.status === "CLAIMED") return;

  if (!existing) {
    // First event — create progress entry with count=1
    if (threshold <= 1) {
      // Single-event quest: complete immediately
      await prisma.questProgress.create({
        data: { userId, questId: quest.id, status: "COMPLETED", completedAt: new Date(), date: today }
      });
      await awardQuest(userId, quest.xpReward, quest.tokenReward);
    } else {
      await prisma.questProgress.create({
        data: { userId, questId: quest.id, status: "IN_PROGRESS", date: today }
      });
    }
    return;
  }

  // Multi-step quest: increment counter stored in a Redis-like approach via DB
  // We use a simple approach: count existing reactions/events today from DB
  const count = await countTodayEvents(userId, type, today);

  if (count >= threshold) {
    await prisma.questProgress.update({
      where: { id: existing.id },
      data: { status: "COMPLETED", completedAt: new Date() }
    });
    await awardQuest(userId, quest.xpReward, quest.tokenReward);
  }
}

async function countTodayEvents(userId: string, type: QuestType, today: Date): Promise<number> {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (type) {
    case QuestType.REACT_TO_MESSAGES:
      return prisma.reaction.count({
        where: { userId, createdAt: { gte: today, lt: tomorrow } }
      });
    case QuestType.SEND_VOICE:
      return prisma.message.count({
        where: { senderId: userId, type: "VOICE", createdAt: { gte: today, lt: tomorrow } }
      });
    case QuestType.SEND_TIME_CAPSULE:
      return prisma.timeCapsule.count({
        where: { senderId: userId, createdAt: { gte: today, lt: tomorrow } }
      });
    default:
      return 1;
  }
}

async function awardQuest(userId: string, xpReward: number, tokenReward: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: { increment: tokenReward } }
  });

  const xpRecord = await prisma.userXP.upsert({
    where: { userId },
    update: { xp: { increment: xpReward } },
    create: { userId, xp: xpReward }
  });

  const newLevel = Math.floor(xpRecord.xp / 100) + 1;
  if (newLevel !== xpRecord.level) {
    await prisma.userXP.update({ where: { userId }, data: { level: newLevel } });
  }
}
