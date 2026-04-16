import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

export function registerGameHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on("game_join", async ({ gameId }: { gameId: string }) => {
    socket.join(`game:${gameId}`);
    const game = await prisma.gameSession.findUnique({ where: { id: gameId } });
    if (game) {
      socket.emit("game_state", { game });
    }
  });

  socket.on("game_move", async ({ gameId, move }: { gameId: string; move: Record<string, unknown> }) => {
    const session = await prisma.gameSession.findUnique({ where: { id: gameId } });
    if (!session) return;

    const state = typeof session.state === "object" && session.state !== null ? session.state : {};
    const updated = await prisma.gameSession.update({
      where: { id: gameId },
      data: { state: { ...(state as Record<string, unknown>), lastMove: move, lastPlayerId: userId } }
    });

    io.to(`game:${gameId}`).emit("game_update", { game: updated });
  });

  socket.on("game_ready", async ({ gameId }: { gameId: string }) => {
    const updated = await prisma.gameSession.update({
      where: { id: gameId },
      data: { status: "active" }
    });
    io.to(`game:${gameId}`).emit("game_update", { game: updated });
  });

  socket.on("game_end", async ({ gameId, results }: { gameId: string; results: Array<{ userId: string; score: number; isWinner: boolean }> }) => {
    await prisma.gameSession.update({ where: { id: gameId }, data: { status: "finished" } });
    for (const result of results) {
      await prisma.gameResult.create({
        data: { sessionId: gameId, userId: result.userId, score: result.score, isWinner: result.isWinner }
      });
    }
    io.to(`game:${gameId}`).emit("game_finished", { gameId, results });
  });
}
