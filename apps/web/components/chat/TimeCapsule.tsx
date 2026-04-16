"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";
import { TimeCapsuleItem } from "@/types";

type TimeCapsuleProps = {
  chatId?: string;
  onCreated?: (capsule: TimeCapsuleItem) => void;
};

export function TimeCapsule({ chatId, onCreated }: TimeCapsuleProps) {
  const [content, setContent] = useState("");
  const [deliverAt, setDeliverAt] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="mb-2 text-sm font-medium">Time Capsule</p>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="mb-2 w-full rounded-md border border-[var(--border)] p-2 text-sm"
        placeholder="Write a future message..."
      />
      <input
        type="datetime-local"
        value={deliverAt}
        onChange={(event) => setDeliverAt(event.target.value)}
        className="mb-2 w-full rounded-md border border-[var(--border)] p-2 text-sm"
      />
      <button
        type="button"
        className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white"
        onClick={async () => {
          try {
            const capsule = await apiClient.post<TimeCapsuleItem>("/api/time-capsules", {
              chatId,
              content,
              deliverAt: new Date(deliverAt).toISOString()
            });
            setStatus("Scheduled");
            setContent("");
            onCreated?.(capsule);
          } catch {
            setStatus("Failed");
          }
        }}
      >
        Seal Capsule
      </button>
      {status ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{status}</p> : null}
    </div>
  );
}
