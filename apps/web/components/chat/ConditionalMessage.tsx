"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type ConditionalMessageProps = {
  chatId: string;
};

export function ConditionalMessage({ chatId }: ConditionalMessageProps) {
  const [content, setContent] = useState("");
  const [hoursDelay, setHoursDelay] = useState(24);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="mb-2 text-sm font-medium">Conditional Message</p>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="mb-2 w-full rounded-md border border-[var(--border)] p-2 text-sm"
        placeholder="Send this if I don't check in..."
      />
      <label className="mb-2 block text-xs text-[var(--text-secondary)]">
        Delay (hours)
        <input
          type="number"
          min={1}
          value={hoursDelay}
          onChange={(event) => setHoursDelay(Number(event.target.value))}
          className="mt-1 w-full rounded-md border border-[var(--border)] px-2 py-1 text-sm"
        />
      </label>
      <button
        className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white"
        onClick={async () => {
          try {
            await apiClient.post("/api/messages", {
              chatId,
              type: "CONDITIONAL",
              content,
              metadata: {
                condition: "no_checkin",
                scheduledAt: new Date(Date.now() + hoursDelay * 60 * 60 * 1000).toISOString()
              }
            });
            setStatus("Scheduled");
            setContent("");
          } catch {
            setStatus("Failed");
          }
        }}
      >
        Schedule Conditional
      </button>
      {status ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{status}</p> : null}
    </div>
  );
}
