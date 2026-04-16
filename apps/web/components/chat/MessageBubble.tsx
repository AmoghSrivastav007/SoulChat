"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Message } from "@/types";
import { CulturalTranslator } from "./CulturalTranslator";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  onReact?: (messageId: string, emoji: string) => Promise<void>;
  onRetry?: (messageId: string) => Promise<void>;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  compact?: boolean;
  replyTo?: Message | null;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

function DeliveryIcon({ status }: { status?: string }) {
  if (status === "sending") return <span className="opacity-50">○</span>;
  if (status === "sent") return <span>✓</span>;
  if (status === "delivered") return <span>✓✓</span>;
  if (status === "read") return <span className="text-sky-300">✓✓</span>;
  if (status === "failed") return <span className="text-red-400">!</span>;
  return null;
}

function SelfDestructTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);

  if (remaining <= 0) return <span className="text-red-400 text-[10px]">Expiring…</span>;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return <span className="text-amber-400 text-[10px]">⏱ {m}:{String(s).padStart(2, "0")}</span>;
}

function MediaContent({ message }: { message: Message }) {
  const mediaUrl = (message.metadata as Record<string, string> | null)?.mediaUrl ?? message.mediaUrl;
  if (!mediaUrl) return null;

  if (message.type === "IMAGE") {
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Image"
          className="mt-1 max-h-64 max-w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (message.type === "VIDEO") {
    return (
      <video
        src={mediaUrl}
        controls
        className="mt-1 max-h-48 max-w-full rounded-lg"
        preload="metadata"
      />
    );
  }

  if (message.type === "VOICE") {
    return (
      <audio src={mediaUrl} controls className="mt-1 w-full max-w-xs" preload="metadata" />
    );
  }

  if (message.type === "FILE") {
    const fileName = message.content ?? "Download file";
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 text-sm hover:opacity-80"
      >
        <span>📎</span>
        <span className="truncate max-w-[200px]">{fileName}</span>
      </a>
    );
  }

  return null;
}

export function MessageBubble({
  message,
  isOwn,
  onReact,
  onRetry,
  onReply,
  onEdit,
  onDelete,
  compact,
  replyTo
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const reactionSummary = Object.entries(
    (message.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
      return acc;
    }, {})
  );

  const emotionBorderClass =
    message.emotionTag === "angry"
      ? "border-l-4 border-l-rose-400"
      : message.emotionTag === "anxious"
        ? "border-l-4 border-l-amber-400"
        : message.emotionTag === "happy"
          ? "border-l-4 border-l-emerald-400"
          : message.emotionTag === "sad"
            ? "border-l-4 border-l-blue-400"
            : "";

  const safeContent =
    typeof window !== "undefined" && message.content
      ? DOMPurify.sanitize(message.content)
      : (message.content ?? "");

  return (
    <div
      className={`${compact ? "mb-0.5" : "mb-2"} flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative max-w-[80%]">
        {/* Reply preview */}
        {replyTo && !replyTo.isDeleted && (
          <div className={`mb-1 rounded-lg border-l-2 border-[var(--accent)] bg-black/10 px-2 py-1 text-xs opacity-70 ${isOwn ? "text-right" : ""}`}>
            <span className="font-medium">{replyTo.senderId}</span>
            <p className="truncate">{replyTo.content ?? "Media"}</p>
          </div>
        )}

        <article
          className={`rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
          } ${emotionBorderClass}`}
        >
          {message.isDeleted ? (
            <p className="italic opacity-60">Message deleted</p>
          ) : (
            <>
              <p
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: safeContent }}
              />
              <MediaContent message={message} />
              {message.type === "TEXT" && message.content && !isOwn && (
                <CulturalTranslator content={message.content} messageId={message.id} />
              )}
            </>
          )}

          {/* Reactions */}
          {!message.isDeleted && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded-md px-1 text-xs hover:bg-black/10 active:scale-110 transition-transform"
                  onClick={() => onReact?.(message.id, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {reactionSummary.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {reactionSummary.map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${isOwn ? "text-white/60 justify-end" : "text-[var(--text-muted)]"}`}>
            {message.expiresAt && <SelfDestructTimer expiresAt={message.expiresAt} />}
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            {message.isEdited && <span>· edited</span>}
            {isOwn && <DeliveryIcon status={message.deliveryStatus} />}
          </div>

          {isOwn && message.deliveryStatus === "failed" && (
            <button
              type="button"
              className="mt-1 rounded-md border border-current px-2 py-0.5 text-[10px] opacity-90"
              onClick={() => onRetry?.(message.id)}
            >
              Retry
            </button>
          )}
        </article>

        {/* Hover action bar */}
        {showActions && !message.isDeleted && (
          <div className={`absolute top-0 ${isOwn ? "right-full mr-1" : "left-full ml-1"} flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 py-1 shadow-md`}>
            {onReply && (
              <button
                type="button"
                className="rounded p-1 text-xs hover:bg-[var(--bg-secondary)]"
                title="Reply"
                onClick={() => onReply(message)}
              >
                ↩
              </button>
            )}
            {isOwn && onEdit && (
              <button
                type="button"
                className="rounded p-1 text-xs hover:bg-[var(--bg-secondary)]"
                title="Edit"
                onClick={() => onEdit(message)}
              >
                ✏️
              </button>
            )}
            {isOwn && onDelete && (
              <button
                type="button"
                className="rounded p-1 text-xs hover:bg-[var(--bg-secondary)]"
                title="Delete"
                onClick={() => onDelete(message.id)}
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
