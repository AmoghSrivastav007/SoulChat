import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { readBillItems } from "../services/ai.service";

export const billsRouter = Router();

const splitSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().nonnegative(),
  paid: z.boolean().default(false)
});

billsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      chatId: z.string().min(1),
      title: z.string().min(1),
      totalAmount: z.number().positive(),
      currency: z.string().default("INR"),
      splits: z.array(splitSchema).default([]),
      receiptDescription: z.string().optional() // for AI OCR
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { chatId, title, totalAmount, currency, splits, receiptDescription } = parsed.data;

  // AI item extraction if receipt description provided
  let items: Array<{ item: string; amount: number }> = [];
  if (receiptDescription) {
    items = await readBillItems({ imageDescription: receiptDescription }).catch(() => []);
  }

  const message = await prisma.message.create({
    data: {
      chatId,
      senderId: req.authUser!.userId,
      type: "SYSTEM",
      content: `Bill Split: ${title}`,
      metadata: {
        bill: { title, totalAmount, currency, splits, items }
      }
    }
  });

  res.status(201).json(message);
});

billsRouter.patch("/:messageId/settle", requireAuth, async (req, res) => {
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) {
    res.status(404).json({ error: "Bill not found" });
    return;
  }

  const meta = message.metadata as Record<string, unknown> | null;
  const bill = meta?.bill as { splits?: Array<{ userId: string; paid?: boolean }> } | undefined;
  if (!bill?.splits) {
    res.status(400).json({ error: "No splits found" });
    return;
  }

  const updatedSplits = bill.splits.map((s) =>
    s.userId === parsed.data.userId ? { ...s, paid: true } : s
  );

  const updated = await prisma.message.update({
    where: { id: req.params.messageId },
    data: { metadata: { ...meta, bill: { ...bill, splits: updatedSplits } } }
  });

  res.json(updated);
});

billsRouter.get("/:chatId", requireAuth, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { chatId: req.params.chatId, type: "SYSTEM", content: { startsWith: "Bill Split:" } },
    orderBy: { createdAt: "desc" }
  });
  res.json(messages);
});
