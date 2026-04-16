import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware";
import {
  checkConflict,
  curateMemories,
  detectEmotion,
  generateTrivia,
  narrateStory,
  readBillItems,
  rewriteMessage,
  summarizeContext,
  translateMessage
} from "../services/ai.service";

export const aiRouter = Router();

aiRouter.post("/rewrite", requireAuth, async (req, res) => {
  const parsed = z.object({ context: z.string().default(""), draft: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await rewriteMessage(parsed.data));
});

aiRouter.post("/emotion", requireAuth, async (req, res) => {
  const parsed = z.object({ message: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await detectEmotion(parsed.data));
});

aiRouter.post("/summarize", requireAuth, async (req, res) => {
  const parsed = z.object({ messages: z.array(z.string()).default([]), chatId: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await summarizeContext(parsed.data));
});

aiRouter.post("/conflict-check", requireAuth, async (req, res) => {
  const parsed = z.object({ messages: z.array(z.string()).default([]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await checkConflict(parsed.data));
});

aiRouter.post("/story-narrate", requireAuth, async (req, res) => {
  const parsed = z.object({ segments: z.array(z.string()).default([]), theme: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await narrateStory(parsed.data));
});

aiRouter.post("/memory-curate", requireAuth, async (req, res) => {
  const parsed = z.object({ messages: z.array(z.string()).default([]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await curateMemories(parsed.data));
});

aiRouter.post("/translate", requireAuth, async (req, res) => {
  const parsed = z.object({ text: z.string().min(1), targetLanguage: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await translateMessage(parsed.data));
});

aiRouter.post("/bill-read", requireAuth, async (req, res) => {
  const parsed = z.object({ imageDescription: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await readBillItems(parsed.data));
});

aiRouter.post("/trivia-generate", requireAuth, async (req, res) => {
  const parsed = z.object({ topic: z.string().optional(), count: z.number().int().min(1).max(10).optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  res.json(await generateTrivia(parsed.data));
});
