import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { sendMessageNotification } from "../services/notification.service";
import { progressQuest } from "../services/quest.service";
import { QuestType } from "@prisma/client";

export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on("join_chat", ({ chatId }: { chatId: string }) => socket.join(chatId));
  socket.on("leave_chat", ({ chatId }: { chatId: string }) => socket.leave(chatId));

  socket.on("typing_start", ({ chatId }: { chatId: string }) => {
    socket.to(chatId).emit("typing", { chatId, userId, isTyping: true });
  });

  socket.on("typing_stop", ({ chatId }: { chatId: string }) => {
    socket.to(chatId).emit("typing", { chatId, userId, isTyping: false });
  });

  // Optimistic send via socket (no DB write – use REST for persistence)
  socket.on(
    "send_message",
    ({ chatId, content, type, replyToId, metadata }: {
      chatId: string;
      content?: string;
      type?: string;
      replyToId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const message = {
        id: crypto.randomUUID(),
        chatId,
        senderId: userId,
        content,
        type: type ?? "TEXT",
        replyToId: replyToId ?? null,
        metadata: metadata ?? null,
        createdAt: new Date().toISOString()
      };
      io.to(chatId).emit("message_received", { message });
    }
  );

  socket.on("message_read", async ({ chatId, messageId }: { chatId: string; messageId: string }) => {
    // Mark delivered → read
    await prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { lastRead: new Date() }
    });
    socket.to(chatId).emit("read_receipt", { chatId, userId, messageId });
  });

  socket.on("message_delivered", ({ chatId, messageId }: { chatId: string; messageId: string }) => {
    socket.to(chatId).emit("delivery_receipt", { chatId, userId, messageId });
  });

  socket.on("react", ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    io.emit("reaction_added", { messageId, userId, emoji });
    // Quest: react to messages
    progressQuest(userId, QuestType.REACT_TO_MESSAGES).catch(() => null);
  });

  // Notify other chat members when a new message arrives (push)
  socket.on(
    "notify_message",
    async ({ chatId, content }: { chatId: string; content: string }) => {
      const members = await prisma.chatMember.findMany({
        where: { chatId, userId: { not: userId } },
        select: { userId: true }
      });
      for (const member of members) {
        await sendMessageNotification(userId, member.userId, chatId, content).catch(() => null);
      }
    }
  );
}
