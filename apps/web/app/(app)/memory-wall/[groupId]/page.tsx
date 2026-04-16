"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { MemoryItem } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function MemoryWallPage({ params }: { params: { groupId: string } }) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [pinning, setPinning] = useState(false);
  const [curating, setCurating] = useState(false);

  useEffect(() => {
    apiClient
      .get<MemoryItem[]>(`/api/memories/${params.groupId}`)
      .then(setMemories)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params.groupId]);

  async function handlePin() {
    if (!title.trim()) return;
    setPinning(true);
    try {
      const created = await apiClient.post<MemoryItem>(`/api/memories/${params.groupId}/pin`, { title });
      setMemories((prev) => [created, ...prev]);
      setTitle("");
    } finally {
      setPinning(false);
    }
  }

  async function handleAICurate() {
    setCurating(true);
    try {
      type CurateResult = Array<{ title: string; content: string }>;
      const result = await apiClient.post<CurateResult>("/api/ai/memory-curate", {
        messages: memories.map((m) => m.content ?? m.title)
      });
      // Pin each AI-curated memory
      for (const item of result) {
        const created = await apiClient.post<MemoryItem>(`/api/memories/${params.groupId}/pin`, {
          title: item.title,
          content: item.content
        });
        setMemories((prev) => [created, ...prev]);
      }
    } finally {
      setCurating(false);
    }
  }

  return (
    <ErrorBoundary>
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Memory Wall</h1>
          <button
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] disabled:opacity-60"
            disabled={curating}
            onClick={handleAICurate}
          >
            {curating ? "Curating…" : "✨ AI Curate"}
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePin()}
            className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            placeholder="Pin a memory title…"
          />
          <button
            className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white disabled:opacity-60"
            disabled={pinning || !title.trim()}
            onClick={handlePin}
          >
            {pinning ? "…" : "Pin"}
          </button>
        </div>

        {loading ? (
          <div className="columns-1 gap-3 md:columns-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="mb-3 h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : memories.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No memories yet. Pin one or use AI curation.</p>
        ) : (
          <div className="columns-1 gap-3 md:columns-2">
            {memories.map((memory) => (
              <article
                key={memory.id}
                className="mb-3 break-inside-avoid rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{memory.title}</p>
                  {memory.isStarred && <span className="text-amber-400">⭐</span>}
                </div>
                {memory.content && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{memory.content}</p>
                )}
                {memory.mediaUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {memory.mediaUrls.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" className="h-16 w-16 rounded-md object-cover" loading="lazy" />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  {new Date(memory.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
