import webpush from "web-push";
import { prisma } from "../lib/prisma";

// Configure VAPID if keys are present
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM ?? "noreply@soulchat.app"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        if ((err as { statusCode?: number })?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    })
  );
}

export async function sendMessageNotification(
  senderId: string,
  recipientId: string,
  chatId: string,
  preview: string
): Promise<void> {
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { displayName: true }
  });

  await sendPushToUser(recipientId, {
    title: sender?.displayName ?? "New message",
    body: preview.slice(0, 80),
    url: `/chat/${chatId}`,
    tag: `chat-${chatId}`
  });
}
