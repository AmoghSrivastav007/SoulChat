import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { progressQuest } from "../services/quest.service";
import { QuestType } from "@prisma/client";

export const gamesRouter = Router();

gamesRouter.post("/start", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      chatId: z.string().min(1),
      gameType: z.enum(["word_duel", "doodle_guess", "trivia"]),
      state: z.record(z.unknown()).default({})
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const game = await prisma.gameSession.create({
    data: {
      chatId: parsed.data.chatId,
      gameType: parsed.data.gameType,
      state: { ...parsed.data.state, players: [req.authUser!.userId] } as Prisma.InputJsonValue,
      status: "waiting"
    }
  });
  res.status(201).json(game);
});

gamesRouter.post("/:id/join", requireAuth, async (req, res) => {
  const session = await prisma.gameSession.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  if (session.status !== "waiting") {
    res.status(400).json({ error: "Game already started" });
    return;
  }
  const state = (session.state as Record<string, unknown>) ?? {};
  const players = Array.isArray(state.players) ? (state.players as string[]) : [];
  if (!players.includes(req.authUser!.userId)) {
    players.push(req.authUser!.userId);
  }
  const updated = await prisma.gameSession.update({
    where: { id: req.params.id },
    data: { state: { ...state, players } as Prisma.InputJsonValue, status: players.length >= 2 ? "active" : "waiting" }
  });
  res.json(updated);
});

gamesRouter.patch("/:id/move", requireAuth, async (req, res) => {
  const parsed = z.object({ move: z.record(z.unknown()) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const session = await prisma.gameSession.findUnique({ where: { id: req.params.id } });
  if (!session) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  const state = (session.state as Record<string, unknown>) ?? {};
  const updated = await prisma.gameSession.update({
    where: { id: req.params.id },
    data: { state: { ...state, lastMove: parsed.data.move, lastPlayerId: req.authUser!.userId } as Prisma.InputJsonValue }
  });
  res.json(updated);
});

gamesRouter.post("/:id/finish", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      results: z.array(z.object({ userId: z.string(), score: z.number(), isWinner: z.boolean() }))
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await prisma.gameSession.update({ where: { id: req.params.id }, data: { status: "finished" } });

  for (const result of parsed.data.results) {
    await prisma.gameResult.create({
      data: { sessionId: req.params.id, userId: result.userId, score: result.score, isWinner: result.isWinner }
    });
    // Quest: play a game
    await progressQuest(result.userId, QuestType.PLAY_GAME).catch(() => null);
  }

  res.status(201).json({ ok: true });
});

gamesRouter.get("/:id", requireAuth, async (req, res) => {
  const game = await prisma.gameSession.findUnique({
    where: { id: req.params.id },
    include: { results: true }
  });
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(game);
});

gamesRouter.get("/chat/:chatId", requireAuth, async (req, res) => {
  const games = await prisma.gameSession.findMany({
    where: { chatId: req.params.chatId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { results: true }
  });
  res.json(games);
});
