"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { ChatDetail, RelationshipScore } from "@/types";
import { usePresence } from "@/hooks/usePresence";

type ChatHeaderProps = {
  chatId: string;
};

function HealthBar({ score }: { score: number }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5" title={`Relationship health: ${pct}%`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-tertiary,#f1f0f8)]">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
    </div>
  );
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [score, setScore] = useState<RelationshipScore | null>(null);
  const user = useAuthStore((state) => state.user);
  const { getStatus } = usePresence();

  useEffect(() => {
    apiClient.get<ChatDetail>(`/api/chats/${chatId}`).then(setChat).catch(() => null);
    apiClient
      .get<RelationshipScore[]>("/api/users/me/relationship-scores")
      .then((scores) => {
        const otherMember = chat?.members.find((m) => m.userId !== user?.id);
        if (otherMember) {
          const rel = scores.find(
            (s) =>
              (s.userAId === user?.id && s.userBId === otherMember.userId) ||
              (s.userBId === user?.id && s.userAId === otherMember.userId)
          );
          setScore(rel ?? null);
        }
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, user?.id]);

  const otherMembers = chat?.members.filter((m) => m.userId !== user?.id) ?? [];
  const title = otherMembers.length === 1
    ? otherMembers[0].user.displayName
    : otherMembers.map((m) => m.user.displayName).join(", ") || "Chat";

  const onlineCount = otherMembers.filter((m) => getStatus(m.userId) === "online").length;

  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {onlineCount > 0 && (
          <p className="text-[10px] text-emerald-500">
            {onlineCount === 1 ? "Online" : `${onlineCount} online`}
          </p>
        )}
      </div>
      {score && <HealthBar score={score.score} />}
    </div>
  );
}
