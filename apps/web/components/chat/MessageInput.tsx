"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCopilot } from "./MessageCopilot";

type MessageInputProps = {
  onSend: (content: string) => Promise<void>;
  onSendMedia?: (file: File) => Promise<void>;
  disabled?: boolean;
  onTypingChange?: (isTyping: boolean) => void;
  contextText: string;
  editingContent?: string | null;
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/ogg", "audio/webm",
  "application/pdf"
];

export function MessageInput({ onSend, onSendMedia, disabled, onTypingChange, contextText, editingContent }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Populate textarea when editing
  useEffect(() => {
    if (editingContent !== null && editingContent !== undefined) {
      setContent(editingContent);
      textareaRef.current?.focus();
    }
  }, [editingContent]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || disabled || isSending) return;

    try {
      setIsSending(true);
      await onSend(trimmed);
      setContent("");
    } finally {
      setIsSending(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || !onSendMedia) return;

    setUploadError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadError("File type not supported.");
      event.currentTarget.value = "";
      return;
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB client-side guard
    if (file.size > MAX_SIZE) {
      setUploadError("File too large (max 100MB).");
      event.currentTarget.value = "";
      return;
    }

    try {
      setIsSending(true);
      await onSendMedia(file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsSending(false);
      event.currentTarget.value = "";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-3">
      <div className="mb-2">
        <MessageCopilot
          draft={content}
          context={contextText}
          onApply={(value) => {
            setContent(value);
            onTypingChange?.(value.trim().length > 0);
          }}
        />
      </div>

      {uploadError && (
        <p className="mb-1 text-xs text-red-500">{uploadError}</p>
      )}

      <div className="flex items-end gap-2">
        <label className="cursor-pointer rounded-xl border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-secondary)]" title="Attach file">
          📎
          <input
            type="file"
            className="hidden"
            accept={ALLOWED_MIME_TYPES.join(",")}
            disabled={disabled || isSending}
            onChange={handleFileChange}
          />
        </label>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            const next = e.target.value;
            setContent(next);
            onTypingChange?.(next.trim().length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          placeholder={editingContent !== null && editingContent !== undefined ? "Edit message…" : "Type a message…"}
          disabled={disabled || isSending}
        />

        <button
          type="submit"
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
          disabled={disabled || isSending || !content.trim()}
        >
          {isSending ? "…" : editingContent !== null && editingContent !== undefined ? "Save" : "Send"}
        </button>
      </div>
    </form>
  );
}
