"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/hooks/useAuthStore";
import { apiClient } from "@/lib/api";
import { GameSession } from "@/types";

const WORD_BANK = ["SOUL", "TRUST", "BOND", "HEART", "DREAM", "SPARK", "GLOW", "VIBE", "ECHO", "BLOOM"];

type WordGameProps = {
  chatId: string;
  sessionId?: string;
  onFinish?: (winnerId: string) => void;
};

export function WordGame({ chatId, sessionId: initialSessionId, onFinish }: WordGameProps) {
  const [sessionId, setSessionId] = useState(initialSessionId ?? null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const { socket } = useSocket();
  const user = useAuthStore((state) => state.user);

  const target: string = session
    ? ((session.state as Record<string, unknown>).word as string) ?? "SOUL"
    : "";
  const scrambled = target
    .split("")
    .sort((a, b) => (a.charCodeAt(0) * 7 + b.charCodeAt(0) * 3) % 5 - 2)
    .join("");

  useEffect(() => {
    if (!sessionId) return;
    apiClient.get<GameSession>(`/api/games/${sessionId}`).then(setSession).catch(() => null);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    socket.emit("game_join", { gameId: sessionId });

    const onUpdate = ({ game }: { game: GameSession }) => setSession(game);
    const onFinished = ({ results }: { results: Array<{ userId: string; isWinner: boolean }> }) => {
      const winner = results.find((r) => r.isWinner);
      if (winner) onFinish?.(winner.userId);
    };

    socket.on("game_update", onUpdate);
    socket.on("game_finished", onFinished);
    return () => {
      socket.off("game_update", onUpdate);
      socket.off("game_finished", onFinished);
    };
  }, [sessionId, socket, onFinish]);

  async function startGame() {
    setStarting(true);
    try {
      const word = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
      const game = await apiClient.post<GameSession>("/api/games/start", {
        chatId,
        gameType: "word_duel",
        state: { word, scores: {} }
      });
      setSessionId(game.id);
      setSession(game);
    } finally {
      setStarting(false);
    }
  }

  async function submitGuess() {
    if (!sessionId || !user) return;
    const correct = guess.toUpperCase() === target;
    setFeedback(correct ? "✓ Correct!" : "✗ Try again");

    if (correct) {
      socket.emit("game_move", { gameId: sessionId, move: { type: "guess", userId: user.id, correct: true } });
      await apiClient.post(`/api/games/${sessionId}/finish`, {
        results: [{ userId: user.id, score: 100, isWinner: true }]
      }).catch(() => null);
    }
    setGuess("");
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 text-center">
        <p className="mb-3 text-sm font-medium">Word Duel</p>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">Unscramble the word before your opponent</p>
        <button
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={starting}
          onClick={startGame}
        >
          {starting ? "Starting…" : "Start game"}
        </button>
      </div>
    );
  }

  const state = session.state as Record<string, unknown>;
  const isFinished = session.status === "finished";

  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Word Duel</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] ${isFinished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {isFinished ? "Finished" : "In progress"}
        </span>
      </div>

      {!isFinished ? (
        <>
          <p className="mb-3 text-center text-2xl font-bold tracking-widest text-[var(--accent)]">{scrambled}</p>
          <div className="flex gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm uppercase tracking-widest"
              placeholder="Your answer…"
              maxLength={target.length}
            />
            <button
              className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
              onClick={submitGuess}
            >
              Submit
            </button>
          </div>
          {feedback && (
            <p className={`mt-2 text-sm font-medium ${feedback.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
              {feedback}
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-sm text-[var(--text-secondary)]">
          The word was: <strong>{target}</strong>
        </p>
      )}
    </div>
  );
}
