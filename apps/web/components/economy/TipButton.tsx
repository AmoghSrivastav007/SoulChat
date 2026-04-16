"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type TipButtonProps = {
  receiverId: string;
};

export function TipButton({ receiverId }: TipButtonProps) {
  const [amount, setAmount] = useState(1);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={50}
        value={amount}
        onChange={(event) => setAmount(Number(event.target.value))}
        className="w-16 rounded-md border border-[var(--border)] px-2 py-1 text-xs"
      />
      <button
        className="rounded-md bg-[var(--accent)] px-2 py-1 text-xs text-white"
        onClick={async () => {
          try {
            await apiClient.post("/api/trust/tip", { receiverId, amount });
            setStatus("Sent");
          } catch {
            setStatus("Failed");
          }
        }}
      >
        Tip
      </button>
      {status ? <span className="text-xs text-[var(--text-secondary)]">{status}</span> : null}
    </div>
  );
}
