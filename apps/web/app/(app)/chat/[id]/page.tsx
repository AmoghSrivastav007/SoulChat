"use client";

import { use, useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { TimeCapsule } from "@/components/chat/TimeCapsule";
import { StoryCanvas } from "@/components/chat/StoryCanvas";
import { MiniGameLauncher } from "@/components/games/MiniGameLauncher";
import { BillSplitter } from "@/components/economy/BillSplitter";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { apiClient } from "@/lib/api";
import { ChatDetail } from "@/types";

type Tab = "chat" | "games" | "bills" | "story" | "capsule";

const TABS: { id: Tab; label: string }[] = [
  { id: "chat", label: "💬" },
  { id: "games", label: "🎮" },
  { id: "bills", label: "💸" },
  { id: "story", label: "📖" },
  { id: "capsule", label: "⏰" }
];

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("chat");
  const [chatDetail, setChatDetail] = useState<ChatDetail | null>(null);

  useEffect(() => {
    apiClient.get<ChatDetail>(`/api/chats/${id}`).then(setChatDetail).catch(() => null);
  }, [id]);

  const memberIds = chatDetail?.members.map((m) => m.userId) ?? [];
  const memberNames = Object.fromEntries(
    chatDetail?.members.map((m) => [m.userId, m.user.displayName || m.user.username]) ?? []
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)] bg-[var(--bg-primary)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex-1 py-2.5 text-sm transition-colors ${
              tab === t.id
                ? "border-b-2 border-[var(--accent)] font-medium text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
            onClick={() => setTab(t.id)}
            title={t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <ErrorBoundary>
          {tab === "chat" && <ChatWindow chatId={id} />}

          {tab === "games" && (
            <div className="p-4">
              <MiniGameLauncher chatId={id} />
            </div>
          )}

          {tab === "bills" && (
            <div className="p-4">
              <BillSplitter chatId={id} memberIds={memberIds} memberNames={memberNames} />
            </div>
          )}

          {tab === "story" && (
            <div className="p-4">
              <StoryCanvas chatId={id} />
            </div>
          )}

          {tab === "capsule" && (
            <div className="p-4">
              <TimeCapsule chatId={id} />
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
