"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type MessageCopilotProps = {
  draft: string;
  context: string;
  onApply: (value: string) => void;
};

type RewriteResponse = { formal: string; warmer: string; funnier: string };

// Simple word-level diff: returns spans with changed words highlighted
function DiffView({ original, rewritten }: { original: string; rewritten: string }) {
  const origWords = original.split(/\s+/);
  const newWords = rewritten.split(/\s+/);
  const maxLen = Math.max(origWords.length, newWords.length);

  return (
    <span>
      {newWords.map((word, i) => {
        const changed = word !== origWords[i];
        return (
          <span key={i} className={changed ? "rounded bg-violet-200 px-0.5 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200" : ""}>
            {word}{i < maxLen - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
}

export function MessageCopilot({ draft, context, onApply }: MessageCopilotProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rewrites, setRewrites] = useState<RewriteResponse | null>(null);

  async function handleGenerate(): Promise<void> {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      const result = await apiClient.post<RewriteResponse>("/api/ai/rewrite", { draft, context });
      setRewrites(result);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  const tones = rewrites
    ? ([
        ["Formal", rewrites.formal, "📋"],
        ["Warmer", rewrites.warmer, "🤗"],
        ["Funnier", rewrites.funnier, "😄"]
      ] as const)
    : [];

  return (
    <div>
      <button
        type="button"
        title="AI rewrite suggestions"
        className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
          loading ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)]"
        }`}
        onClick={open ? () => setOpen(false) : handleGenerate}
        disabled={loading || !draft.trim()}
      >
        {loading ? "…" : "✨"}
      </button>

      {open && rewrites && (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">AI Suggestions</p>
            <button className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setOpen(false)}>✕</button>
          </div>
          {tones.map(([label, value, icon]) => (
            <button
              key={label}
              type="button"
              className="mb-1.5 block w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left hover:border-[var(--accent)] hover:bg-[var(--bg-primary)] transition-colors"
              onClick={() => { onApply(value); setOpen(false); }}
            >
              <div className="mb-0.5 flex items-center gap-1.5">
                <span>{icon}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
              </div>
              <p className="text-sm leading-snug">
                <DiffView original={draft} rewritten={value} />
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
