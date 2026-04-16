"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { SearchResult } from "@/types";

type SearchBarProps = {
  chatId?: string;
  placeholder?: string;
};

export function SearchBar({ chatId, placeholder = "Search messages or people…" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const path = chatId
          ? `/api/search?q=${encodeURIComponent(query)}&chatId=${chatId}`
          : `/api/search?q=${encodeURIComponent(query)}`;
        const data = await apiClient.get<SearchResult>(path);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, chatId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
        <span className="text-[var(--text-muted)]">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {loading && <span className="text-xs text-[var(--text-muted)]">…</span>}
      </div>

      {open && results && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg">
          {results.users.length > 0 && (
            <div className="p-2">
              <p className="mb-1 px-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">People</p>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  <span className="h-6 w-6 rounded-full bg-[var(--accent)] text-center text-xs leading-6 text-white">
                    {u.displayName[0]}
                  </span>
                  <span>{u.displayName}</span>
                  <span className="text-xs text-[var(--text-muted)]">@{u.username}</span>
                </button>
              ))}
            </div>
          )}

          {results.messages.length > 0 && (
            <div className="border-t border-[var(--border)] p-2">
              <p className="mb-1 px-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Messages</p>
              {results.messages.map((m) => (
                <Link
                  key={m.id}
                  href={`/chat/${m.chatId}`}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => { setOpen(false); setQuery(""); }}
                >
                  <p className="truncate">{m.content}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(m.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}

          {results.users.length === 0 && results.messages.length === 0 && (
            <p className="p-4 text-center text-sm text-[var(--text-secondary)]">No results for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
