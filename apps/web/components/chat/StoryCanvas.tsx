"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Message } from "@/types";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useSocket } from "@/hooks/useSocket";

type StoryCanvasProps = {
  chatId: string;
};

type NarrateResponse = { narration: string; illustrationPrompt: string };

export function StoryCanvas({ chatId }: StoryCanvasProps) {
  const [segments, setSegments] = useState<Message[]>([]);
  const [newSegment, setNewSegment] = useState("");
  const [narration, setNarration] = useState<string | null>(null);
  const [illustrationPrompt, setIllustrationPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { socket } = useSocket();

  useEffect(() => {
    type MsgList = { items: Message[]; nextCursor: string | null };
    apiClient
      .get<MsgList>(`/api/messages/${chatId}`)
      .then((data) => setSegments(data.items.filter((m) => m.type === "STORY_SEGMENT").reverse()))
      .catch(() => null);
  }, [chatId]);

  useEffect(() => {
    socket.emit("join_chat", { chatId });
    const onReceived = ({ message }: { message: Message }) => {
      if (message.type === "STORY_SEGMENT") {
        setSegments((prev) => [...prev, message]);
      }
    };
    socket.on("message_received", onReceived);
    return () => { socket.off("message_received", onReceived); };
  }, [chatId, socket]);

  async function addSegment() {
    if (!newSegment.trim()) return;
    setLoading(true);
    try {
      const msg = await apiClient.post<Message>("/api/messages", {
        chatId,
        type: "STORY_SEGMENT",
        content: newSegment.trim()
      });
      setSegments((prev) => [...prev, msg]);
      setNewSegment("");
    } finally {
      setLoading(false);
    }
  }

  async function getNarration() {
    setNarrating(true);
    try {
      const result = await apiClient.post<NarrateResponse>("/api/ai/story-narrate", {
        segments: segments.map((s) => s.content ?? ""),
        theme: "emotional connection"
      });
      setNarration(result.narration);
      setIllustrationPrompt(result.illustrationPrompt);
    } finally {
      setNarrating(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">📖 Story Canvas</p>
        <button
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-secondary)] disabled:opacity-60"
          disabled={narrating || segments.length === 0}
          onClick={getNarration}
        >
          {narrating ? "Narrating…" : "✨ AI Narrate"}
        </button>
      </div>

      {/* Story segments */}
      <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg bg-[var(--bg-secondary)] p-3">
        {segments.length === 0 ? (
          <p className="text-center text-xs text-[var(--text-muted)]">No story yet. Add the first segment.</p>
        ) : (
          segments.map((seg, i) => (
            <div key={seg.id} className="flex gap-2">
              <span className="mt-0.5 text-[10px] text-[var(--text-muted)] w-4 shrink-0">{i + 1}.</span>
              <p className="text-sm leading-relaxed">{seg.content}</p>
            </div>
          ))
        )}
      </div>

      {/* AI narration */}
      {narration && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/20">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500">AI Continuation</p>
          <p className="text-sm italic leading-relaxed text-violet-900 dark:text-violet-200">{narration}</p>
          {illustrationPrompt && (
            <p className="mt-2 text-[10px] text-violet-400">🎨 {illustrationPrompt}</p>
          )}
          <button
            className="mt-2 rounded-md bg-violet-600 px-3 py-1 text-xs text-white hover:bg-violet-700"
            onClick={() => { setNewSegment(narration); setNarration(null); }}
          >
            Add to story
          </button>
        </div>
      )}

      {/* Add segment */}
      <div className="flex gap-2">
        <textarea
          value={newSegment}
          onChange={(e) => setNewSegment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addSegment(); } }}
          rows={2}
          className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          placeholder="Continue the story…"
        />
        <button
          className="self-end rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-60"
          disabled={loading || !newSegment.trim()}
          onClick={addSegment}
        >
          {loading ? "…" : "Add"}
        </button>
      </div>
    </div>
  );
}
