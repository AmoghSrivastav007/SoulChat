"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/hooks/useAuthStore";
import { apiClient } from "@/lib/api";
import { GameSession } from "@/types";

const PROMPTS = ["cat", "house", "sun", "tree", "car", "star", "heart", "moon"];

type DrawingGameProps = {
  chatId: string;
  sessionId?: string;
  onFinish?: (winnerId: string) => void;
};

type DrawEvent = { x: number; y: number; drawing: boolean; color: string };

export function DrawingGame({ chatId, sessionId: initialSessionId, onFinish }: DrawingGameProps) {
  const [sessionId, setSessionId] = useState(initialSessionId ?? null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [color, setColor] = useState("#7c3aed");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const { socket } = useSocket();
  const user = useAuthStore((state) => state.user);

  const prompt: string = session
    ? ((session.state as Record<string, unknown>).prompt as string) ?? ""
    : "";

  useEffect(() => {
    if (!sessionId) return;
    apiClient.get<GameSession>(`/api/games/${sessionId}`).then((g) => {
      setSession(g);
      const state = g.state as Record<string, unknown>;
      setIsDrawer((state.drawerId as string) === user?.id);
    }).catch(() => null);
  }, [sessionId, user?.id]);

  useEffect(() => {
    if (!sessionId) return;
    socket.emit("game_join", { gameId: sessionId });

    const onUpdate = ({ game }: { game: GameSession }) => {
      setSession(game);
      const state = game.state as Record<string, unknown>;
      setIsDrawer((state.drawerId as string) === user?.id);
    };

    const onDraw = ({ event: ev }: { event: DrawEvent }) => {
      if (isDrawer) return; // don't apply own strokes twice
      applyDrawEvent(ev);
    };

    const onFinished = ({ results }: { results: Array<{ userId: string; isWinner: boolean }> }) => {
      const winner = results.find((r) => r.isWinner);
      if (winner) onFinish?.(winner.userId);
    };

    socket.on("game_update", onUpdate);
    socket.on("game_draw", onDraw);
    socket.on("game_finished", onFinished);
    return () => {
      socket.off("game_update", onUpdate);
      socket.off("game_draw", onDraw);
      socket.off("game_finished", onFinished);
    };
  }, [sessionId, socket, isDrawer, onFinish, user?.id]);

  function applyDrawEvent(ev: DrawEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!ev.drawing) { ctx.beginPath(); return; }
    ctx.strokeStyle = ev.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(ev.x, ev.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ev.x, ev.y);
  }

  function handleMouseEvent(e: React.MouseEvent<HTMLCanvasElement>, drawing: boolean) {
    if (!isDrawer || !sessionId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ev: DrawEvent = {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
      drawing,
      color
    };
    applyDrawEvent(ev);
    socket.emit("game_move", { gameId: sessionId, move: { type: "draw", event: ev } });
  }

  async function startGame() {
    setStarting(true);
    try {
      const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
      const game = await apiClient.post<GameSession>("/api/games/start", {
        chatId,
        gameType: "doodle_guess",
        state: { prompt, drawerId: user?.id }
      });
      setSessionId(game.id);
      setSession(game);
      setIsDrawer(true);
    } finally {
      setStarting(false);
    }
  }

  async function submitGuess() {
    if (!sessionId || !user) return;
    const correct = guess.toLowerCase().trim() === prompt.toLowerCase();
    setFeedback(correct ? "✓ Correct!" : "✗ Nope, try again");
    if (correct) {
      await apiClient.post(`/api/games/${sessionId}/finish`, {
        results: [{ userId: user.id, score: 100, isWinner: true }]
      }).catch(() => null);
    }
    setGuess("");
  }

  if (!session) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 text-center">
        <p className="mb-3 text-sm font-medium">Doodle Guess</p>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">Draw a prompt, others guess it</p>
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

  const isFinished = session.status === "finished";

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">Doodle Guess</p>
        {isDrawer && !isFinished && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] text-violet-700">
            Draw: <strong>{prompt}</strong>
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={200}
        className={`w-full rounded-md border border-[var(--border)] bg-white ${isDrawer && !isFinished ? "cursor-crosshair" : "cursor-default"}`}
        onMouseDown={(e) => { isDrawingRef.current = true; handleMouseEvent(e, true); }}
        onMouseMove={(e) => { if (isDrawingRef.current) handleMouseEvent(e, true); }}
        onMouseUp={() => { isDrawingRef.current = false; }}
        onMouseLeave={() => { isDrawingRef.current = false; }}
      />

      {isDrawer && !isFinished && (
        <div className="mt-2 flex gap-2">
          {["#7c3aed", "#ef4444", "#3b82f6", "#10b981", "#000000"].map((c) => (
            <button
              key={c}
              className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-[var(--accent)] scale-110" : "border-transparent"}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <button
            className="ml-auto rounded-md border border-[var(--border)] px-2 py-0.5 text-xs"
            onClick={() => {
              const ctx = canvasRef.current?.getContext("2d");
              if (ctx) ctx.clearRect(0, 0, 320, 200);
            }}
          >
            Clear
          </button>
        </div>
      )}

      {!isDrawer && !isFinished && (
        <div className="mt-2 flex gap-2">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGuess()}
            className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
            placeholder="What is it?"
          />
          <button className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white" onClick={submitGuess}>
            Guess
          </button>
        </div>
      )}

      {feedback && (
        <p className={`mt-1 text-sm font-medium ${feedback.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
          {feedback}
        </p>
      )}
      {isFinished && <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">Game over!</p>}
    </div>
  );
}
