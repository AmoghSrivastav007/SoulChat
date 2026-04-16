import bcrypt from "bcryptjs";
import { PrismaClient, QuestType } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 12);

  const [alice, bob] = await Promise.all([
    prisma.user.upsert({
      where: { email: "alice@soulchat.dev" },
      update: {},
      create: {
        email: "alice@soulchat.dev",
        username: "alice",
        displayName: "Alice",
        passwordHash,
        moodWord: "curious"
      }
    }),
    prisma.user.upsert({
      where: { email: "bob@soulchat.dev" },
      update: {},
      create: {
        email: "bob@soulchat.dev",
        username: "bob",
        displayName: "Bob",
        passwordHash,
        moodWord: "focused"
      }
    })
  ]);

  const chat = await prisma.chat.create({
    data: {
      type: "DIRECT",
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "OWNER" },
            { userId: bob.id, role: "MEMBER" }
          ]
        }
      }
    }
  });

  await prisma.message.createMany({
    data: [
      { chatId: chat.id, senderId: alice.id, content: "Welcome to SoulChat!", type: "TEXT" },
      { chatId: chat.id, senderId: bob.id, content: "Glad to be here.", type: "TEXT" }
    ]
  });

  const quests = [
    {
      title: "Send a voice note",
      description: "Share a quick voice message with a close contact.",
      type: QuestType.SEND_VOICE,
      xpReward: 20,
      tokenReward: 5
    },
    {
      title: "React to messages",
      description: "React to five different messages today.",
      type: QuestType.REACT_TO_MESSAGES,
      xpReward: 15,
      tokenReward: 4
    },
    {
      title: "Revive an old chat",
      description: "Message someone you have not contacted this week.",
      type: QuestType.REVIVE_OLD_CHAT,
      xpReward: 25,
      tokenReward: 6
    }
  ];

  for (const quest of quests) {
    await prisma.quest.create({ data: quest });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
