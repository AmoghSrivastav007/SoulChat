"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { Chat } from "@/types";
import { ChatListSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePresence } from "@/hooks/usePresence";

function PresenceDot({ status }: { status: string }) {
  const color = status === "online" ? "bg-emerald-400" : status === "away" ? "bg-amber-400" : "bg-gray-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export default function ChatHomePage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { getStatus } = usePresence();

  useEffect(() => {
    apiClient
      .get<Chat[]>("/api/chats")
      .then(setChats)
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load chats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChatListSkeleton />;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;

  return (
    <ErrorBoundary>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Chats</h1>
          <button
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs text-white hover:opacity-90"
            onClick={() => setShowNew(true)}
          >
            + New chat
          </button>
        </div>

        {showNew && (
          <NewChatForm
            onCreated={(chat) => { setChats((prev) => [chat, ...prev]); setShowNew(false); }}
            onCancel={() => setShowNew(false)}
          />
        )}

        <div className="space-y-2">
          {chats.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-secondary)]">No chats yet. Start a new one.</p>
          ) : (
            chats.map((chat) => (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
                  {(chat.name ?? chat.type)[0].toUpperCase()}
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceDot status={getStatus(chat.id)} />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{chat.name ?? chat.type}</p>
                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium text-white">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  {chat.lastMessage ? (
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {(chat.lastMessage.content ?? "Media").slice(0, 50)}
                      {" · "}
                      {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">{chat.description ?? "No messages yet"}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

function NewChatForm({ onCreated, onCancel }: { onCreated: (chat: Chat) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"DIRECT" | "GROUP" | "SPATIAL_ROOM">("DIRECT");
  const [creating, setCreating] = useState(false);

  return (
    <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
      <p className="mb-2 text-sm font-medium">New chat</p>
      <div className="flex gap-2 mb-2">
        {(["DIRECT", "GROUP", "SPATIAL_ROOM"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-full px-2 py-0.5 text-xs ${type === t ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"}`}
            onClick={() => setType(t)}
          >
            {t === "DIRECT" ? "Direct" : t === "GROUP" ? "Group" : "Room"}
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={type === "DIRECT" ? "Chat name (optional)" : "Group / room name"}
        className="mb-2 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <button
          className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white disabled:opacity-60"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              const chat = await apiClient.post<Chat>("/api/chats", { type, name: name || undefined });
              onCreated(chat);
            } finally {
              setCreating(false);
            }
          }}
        >
          {creating ? "Creating…" : "Create"}
        </button>
        <button className="rounded-md border border-[var(--border)] px-3 py-1 text-xs" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
