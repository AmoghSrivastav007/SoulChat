"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useSocket } from "@/hooks/useSocket";
import { apiClient } from "@/lib/api";
import { ChatDetail, Message } from "@/types";
import { ConflictMediator } from "./ConflictMediator";
import { ContextBriefing } from "./ContextBriefing";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";

type ChatWindowProps = { chatId: string };
type MessageListResponse = { items: Message[]; nextCursor: string | null };

function dayLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString();
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUserNames, setTypingUserNames] = useState<string[]>([]);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<{ summary: string; mood: string; urgentCount: number } | null>(null);
  const [conflictSuggestion, setConflictSuggestion] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const memberNamesRef = useRef<Record<string, string>>({});
  const user = useAuthStore((state) => state.user);
  const { socket } = useSocket();

  // ── Load messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFirstUnreadMessageId(null);
    setReplyTo(null);
    setEditingMessage(null);

    apiClient.get<MessageListResponse>(`/api/messages/${chatId}`).then((data) => {
      if (!active) return;
      const sorted = [...data.items].reverse().map((m) => ({ ...m, deliveryStatus: "sent" as const }));
      setMessages(sorted);
      setNextCursor(data.nextCursor);

      const newest = data.items[0];
      if (newest) {
        const awayHours = (Date.now() - new Date(newest.createdAt).getTime()) / (1000 * 60 * 60);
        if (awayHours >= 24) {
          apiClient
            .post<{ summary: string; mood: string; urgentCount: number }>("/api/ai/summarize", {
              messages: data.items.slice(0, 20).map((m) => m.content ?? ""),
              chatId
            })
            .then(setBriefing)
            .catch(() => null);
        }
      }
    }).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [chatId]);

  // ── Load member names ──────────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get<ChatDetail>(`/api/chats/${chatId}`).then((chat) => {
      memberNamesRef.current = chat.members.reduce<Record<string, string>>((acc, m) => {
        acc[m.userId] = m.user.displayName || m.user.username;
        return acc;
      }, {});
    }).catch(() => null);
  }, [chatId]);

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    socket.emit("join_chat", { chatId });

    const onReceived = ({ message }: { message: Message }) => {
      if (message.chatId !== chatId) return;
      const container = listRef.current;
      const nearBottom = container
        ? container.scrollHeight - container.scrollTop - container.clientHeight < 120
        : true;

      setMessages((prev) =>
        prev.some((m) => m.id === message.id)
          ? prev
          : [...prev, { ...message, deliveryStatus: message.senderId === user?.id ? "sent" : undefined }]
      );

      if (!nearBottom && message.senderId !== user?.id) {
        setFirstUnreadMessageId((prev) => prev ?? message.id);
      }

      if (message.senderId !== user?.id) {
        socket.emit("message_read", { chatId, messageId: message.id });
        socket.emit("message_delivered", { chatId, messageId: message.id });
      }
    };

    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: null } : m));
    };

    const onEdited = ({ messageId, content }: { messageId: string; content: string }) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, content, isEdited: true } : m));
    };

    const onReadReceipt = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId && m.senderId === user?.id ? { ...m, deliveryStatus: "read" } : m)
      );
    };

    const onDeliveryReceipt = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.senderId === user?.id && m.deliveryStatus === "sent"
            ? { ...m, deliveryStatus: "delivered" }
            : m
        )
      );
    };

    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      if (userId === user?.id) return;
      const displayName = memberNamesRef.current[userId] ?? "Someone";
      setTypingUserNames((prev) => {
        if (isTyping) return prev.includes(displayName) ? prev : [...prev, displayName];
        return prev.filter((n) => n !== displayName);
      });
    };

    const onReactionAdded = ({ messageId, userId, emoji }: { messageId: string; userId: string; emoji: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id !== messageId ? m : {
            ...m,
            reactions: (m.reactions ?? []).some((r) => r.userId === userId && r.emoji === emoji)
              ? m.reactions
              : [...(m.reactions ?? []), { userId, emoji }]
          }
        )
      );
    };

    const onCapsuleDelivered = ({ capsule }: { capsule: { id: string; content: string; chatId: string } }) => {
      if (capsule.chatId === chatId) {
        const systemMsg: Message = {
          id: `capsule-${capsule.id}`,
          chatId,
          senderId: "system",
          content: `⏰ Time Capsule: ${capsule.content}`,
          type: "TIME_CAPSULE",
          isDeleted: false,
          isEdited: false,
          createdAt: new Date().toISOString()
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    };

    socket.on("message_received", onReceived);
    socket.on("message_deleted", onDeleted);
    socket.on("message_edited", onEdited);
    socket.on("read_receipt", onReadReceipt);
    socket.on("delivery_receipt", onDeliveryReceipt);
    socket.on("typing", onTyping);
    socket.on("reaction_added", onReactionAdded);
    socket.on("capsule_delivered", onCapsuleDelivered);

    return () => {
      socket.emit("leave_chat", { chatId });
      socket.off("message_received", onReceived);
      socket.off("message_deleted", onDeleted);
      socket.off("message_edited", onEdited);
      socket.off("read_receipt", onReadReceipt);
      socket.off("delivery_receipt", onDeliveryReceipt);
      socket.off("typing", onTyping);
      socket.off("reaction_added", onReactionAdded);
      socket.off("capsule_delivered", onCapsuleDelivered);
      setTypingUserNames([]);
    };
  }, [chatId, socket, user?.id]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [messages]
  );

  // ── Conflict detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const tense = sortedMessages.slice(-8).filter((m) => m.emotionTag === "angry" || m.emotionTag === "anxious");
    if (tense.length < 3) { setConflictSuggestion(null); return; }

    apiClient
      .post<{ hasConflict: boolean; suggestion: string | null }>("/api/ai/conflict-check", {
        messages: sortedMessages.slice(-12).map((m) => m.content ?? "")
      })
      .then((r) => setConflictSuggestion(r.hasConflict ? r.suggestion : null))
      .catch(() => null);
  }, [sortedMessages]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 140;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
      setShowJumpToLatest(false);
    } else {
      setShowJumpToLatest(true);
    }
  }, [sortedMessages.length]);

  // ── Load more (infinite scroll) ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await apiClient.get<MessageListResponse>(`/api/messages/${chatId}?cursor=${nextCursor}`);
      const older = [...data.items].reverse().map((m) => ({ ...m, deliveryStatus: "sent" as const }));
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, nextCursor, loadingMore]);

  // ── Send ───────────────────────────────────────────────────────────────────
  async function onSend(content: string): Promise<void> {
    if (editingMessage) {
      await apiClient.patch(`/api/messages/${editingMessage.id}`, { content });
      setEditingMessage(null);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      chatId,
      senderId: user?.id ?? "me",
      content,
      type: "TEXT",
      replyToId: replyTo?.id ?? null,
      isDeleted: false,
      isEdited: false,
      createdAt: new Date().toISOString(),
      deliveryStatus: "sending"
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyTo(null);

    try {
      const created = await apiClient.post<Message>("/api/messages", {
        chatId,
        content,
        type: "TEXT",
        replyToId: replyTo?.id
      });
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...created, deliveryStatus: "sent" } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, deliveryStatus: "failed" } : m));
    }
  }

  async function onSendMedia(file: File): Promise<void> {
    const extension = file.name.split(".").pop() ?? "bin";
    const upload = await apiClient.post<{ uploadUrl: string; fileUrl: string; key: string }>(
      "/api/messages/upload-url",
      { mimeType: file.type || "application/octet-stream", extension }
    );

    if (!upload.uploadUrl.includes("example.local")) {
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });
    }

    const msgType = file.type.startsWith("image/") ? "IMAGE"
      : file.type.startsWith("video/") ? "VIDEO"
      : file.type.startsWith("audio/") ? "VOICE"
      : "FILE";

    const created = await apiClient.post<Message>("/api/messages", {
      chatId,
      type: msgType,
      content: file.name,
      metadata: { mediaUrl: upload.fileUrl, mediaType: file.type }
    });
    setMessages((prev) => [...prev, { ...created, deliveryStatus: "sent" }]);
  }

  async function onRetry(messageId: string): Promise<void> {
    const failed = messages.find((m) => m.id === messageId);
    if (!failed?.content) return;
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deliveryStatus: "sending" } : m));
    try {
      const created = await apiClient.post<Message>("/api/messages", { chatId, content: failed.content, type: failed.type ?? "TEXT" });
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...created, deliveryStatus: "sent" } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deliveryStatus: "failed" } : m));
    }
  }

  async function onReact(messageId: string, emoji: string): Promise<void> {
    const existing = messages.find((m) => m.id === messageId)?.reactions?.some((r) => r.userId === user?.id && r.emoji === emoji);
    if (existing) {
      await apiClient.del(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions: (m.reactions ?? []).filter((r) => !(r.userId === user?.id && r.emoji === emoji)) } : m));
      return;
    }
    await apiClient.post(`/api/messages/${messageId}/reactions`, { emoji });
  }

  async function onDelete(messageId: string): Promise<void> {
    await apiClient.del(`/api/messages/${messageId}`);
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isDeleted: true, content: null } : m));
  }

  function onTypingChange(isTyping: boolean): void {
    if (isTyping) {
      socket.emit("typing_start", { chatId });
      if (stopTypingTimeout.current) clearTimeout(stopTypingTimeout.current);
      stopTypingTimeout.current = setTimeout(() => socket.emit("typing_stop", { chatId }), 900);
    } else {
      socket.emit("typing_stop", { chatId });
    }
  }

  if (loading) {
    return (
      <section className="flex h-[calc(100vh-2rem)] flex-col">
        <ChatHeader chatId={chatId} />
        <div className="flex flex-1 flex-col gap-2 p-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-10 w-${i % 2 === 0 ? "2/3" : "1/2"} animate-pulse rounded-2xl bg-[var(--bg-secondary)]`} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-[calc(100vh-2rem)] flex-col">
      <ChatHeader chatId={chatId} />
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto p-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          setShowJumpToLatest(!nearBottom);
          if (nearBottom) setFirstUnreadMessageId(null);
          // Load more when near top
          if (el.scrollTop < 100) loadMore();
        }}
      >
        {loadingMore && <div className="py-2 text-center text-xs text-[var(--text-secondary)]">Loading older messages…</div>}

        {briefing && (
          <ContextBriefing
            summary={briefing.summary}
            mood={briefing.mood}
            urgentCount={briefing.urgentCount}
            onDismiss={() => setBriefing(null)}
          />
        )}

        {conflictSuggestion && (
          <ConflictMediator
            suggestion={conflictSuggestion}
            onDismiss={() => setConflictSuggestion(null)}
            onPost={async () => {
              await onSend(conflictSuggestion);
              setConflictSuggestion(null);
            }}
          />
        )}

        {sortedMessages.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No messages yet. Say hello.</p>
        ) : (
          sortedMessages.map((message, index) => {
            const prev = sortedMessages[index - 1];
            const sameDay = prev && new Date(prev.createdAt).toDateString() === new Date(message.createdAt).toDateString();
            const showDaySeparator = !prev || !sameDay;
            const isGrouped = !!prev && sameDay && prev.senderId === message.senderId &&
              Math.abs(new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60 * 1000;
            const replyToMsg = message.replyToId ? messages.find((m) => m.id === message.replyToId) ?? null : null;

            return (
              <div key={message.id}>
                {showDaySeparator && (
                  <div className="my-3 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{dayLabel(message.createdAt)}</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                )}
                {firstUnreadMessageId === message.id && (
                  <div className="my-2 flex items-center gap-2">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">New messages</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === user?.id}
                  onReact={onReact}
                  onRetry={onRetry}
                  onReply={setReplyTo}
                  onEdit={setEditingMessage}
                  onDelete={onDelete}
                  compact={isGrouped}
                  replyTo={replyToMsg}
                />
              </div>
            );
          })
        )}

        {typingUserNames.length > 0 && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {typingUserNames.join(", ")} {typingUserNames.length === 1 ? "is" : "are"} typing…
          </p>
        )}

        {showJumpToLatest && (
          <button
            type="button"
            className="sticky bottom-2 ml-auto block rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-1 text-xs shadow-sm"
            onClick={() => {
              if (!listRef.current) return;
              listRef.current.scrollTop = listRef.current.scrollHeight;
              setShowJumpToLatest(false);
              setFirstUnreadMessageId(null);
            }}
          >
            ↓ Jump to latest
          </button>
        )}
      </div>

      {/* Reply / Edit banner */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs">
          <span className="text-[var(--text-secondary)]">
            {editingMessage ? "✏️ Editing message" : `↩ Replying to: ${(replyTo?.content ?? "Media").slice(0, 50)}`}
          </span>
          <button
            type="button"
            className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => { setReplyTo(null); setEditingMessage(null); }}
          >
            ✕
          </button>
        </div>
      )}

      <MessageInput
        onSend={onSend}
        onSendMedia={onSendMedia}
        onTypingChange={onTypingChange}
        contextText={sortedMessages.slice(-10).map((m) => m.content ?? "").join("\n")}
        editingContent={editingMessage?.content ?? null}
      />
    </section>
  );
}
