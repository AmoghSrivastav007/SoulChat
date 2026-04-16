"use client";

import { useState } from "react";
import { WordGame } from "./WordGame";
import { DrawingGame } from "./DrawingGame";

type MiniGameLauncherProps = {
  chatId: string;
};

type GameMode = "word" | "drawing";

export function MiniGameLauncher({ chatId }: MiniGameLauncherProps) {
  const [mode, setMode] = useState<GameMode>("word");
  const [winnerId, setWinnerId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["word", "drawing"] as const).map((m) => (
          <button
            key={m}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              mode === m ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] hover:bg-[var(--bg-secondary)]"
            }`}
            onClick={() => { setMode(m); setWinnerId(null); }}
          >
            {m === "word" ? "🔤 Word Duel" : "🎨 Doodle Guess"}
          </button>
        ))}
      </div>

      {winnerId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
          🏆 Winner: {winnerId.slice(0, 8)}…
          <button className="ml-2 underline text-xs" onClick={() => setWinnerId(null)}>Play again</button>
        </div>
      )}

      {!winnerId && mode === "word" && (
        <WordGame chatId={chatId} onFinish={setWinnerId} />
      )}
      {!winnerId && mode === "drawing" && (
        <DrawingGame chatId={chatId} onFinish={setWinnerId} />
      )}
    </div>
  );
}
