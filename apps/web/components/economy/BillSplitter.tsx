"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { Message } from "@/types";

type Split = { userId: string; amount: number; paid: boolean };
type BillMeta = { title: string; totalAmount: number; currency: string; splits: Split[]; items?: Array<{ item: string; amount: number }> };

type BillSplitterProps = {
  chatId: string;
  memberIds: string[];
  memberNames: Record<string, string>;
};

export function BillSplitter({ chatId, memberIds, memberNames }: BillSplitterProps) {
  const [bills, setBills] = useState<Message[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [total, setTotal] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [receiptDesc, setReceiptDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    apiClient.get<Message[]>(`/api/bills/${chatId}`).then(setBills).catch(() => null);
  }, [chatId]);

  function computeSplits(): Split[] {
    const totalNum = parseFloat(total) || 0;
    if (splitMode === "equal") {
      const each = totalNum / memberIds.length;
      return memberIds.map((id) => ({ userId: id, amount: Math.round(each * 100) / 100, paid: id === user?.id }));
    }
    return memberIds.map((id) => ({
      userId: id,
      amount: parseFloat(customAmounts[id] ?? "0") || 0,
      paid: id === user?.id
    }));
  }

  async function handleSubmit() {
    if (!title.trim() || !total) return;
    setSubmitting(true);
    try {
      const msg = await apiClient.post<Message>("/api/bills", {
        chatId,
        title,
        totalAmount: parseFloat(total),
        currency: "INR",
        splits: computeSplits(),
        receiptDescription: receiptDesc || undefined
      });
      setBills((prev) => [msg, ...prev]);
      setShowForm(false);
      setTitle(""); setTotal(""); setReceiptDesc(""); setCustomAmounts({});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle(messageId: string, userId: string) {
    const updated = await apiClient.patch<Message>(`/api/bills/${messageId}/settle`, { userId });
    setBills((prev) => prev.map((b) => b.id === messageId ? updated : b));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Bill Splitter</p>
        <button
          className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ New bill"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bill title (e.g. Dinner)"
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Total amount (₹)"
            className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
          />

          <div className="flex gap-2">
            {(["equal", "custom"] as const).map((m) => (
              <button
                key={m}
                className={`rounded-full px-2 py-0.5 text-xs ${splitMode === m ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"}`}
                onClick={() => setSplitMode(m)}
              >
                {m === "equal" ? "Equal split" : "Custom"}
              </button>
            ))}
          </div>

          {splitMode === "custom" && (
            <div className="space-y-1">
              {memberIds.map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs">{memberNames[id] ?? id.slice(0, 8)}</span>
                  <input
                    type="number"
                    value={customAmounts[id] ?? ""}
                    onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [id]: e.target.value }))}
                    placeholder="₹0"
                    className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          <textarea
            value={receiptDesc}
            onChange={(e) => setReceiptDesc(e.target.value)}
            placeholder="Paste receipt text for AI item extraction (optional)"
            rows={2}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-xs"
          />

          <button
            className="w-full rounded-md bg-[var(--accent)] py-2 text-sm text-white disabled:opacity-60"
            disabled={submitting || !title.trim() || !total}
            onClick={handleSubmit}
          >
            {submitting ? "Creating…" : "Create bill"}
          </button>
        </div>
      )}

      {bills.map((bill) => {
        const meta = (bill.metadata as Record<string, unknown>)?.bill as BillMeta | undefined;
        if (!meta) return null;
        const allPaid = meta.splits.every((s) => s.paid);
        return (
          <div key={bill.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{meta.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${allPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {allPaid ? "Settled" : "Pending"}
              </span>
            </div>
            <p className="mb-2 text-xs text-[var(--text-secondary)]">
              Total: {meta.currency} {meta.totalAmount}
            </p>

            {meta.items && meta.items.length > 0 && (
              <div className="mb-2 rounded-md bg-[var(--bg-secondary)] p-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Items</p>
                {meta.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{item.item}</span>
                    <span>{meta.currency} {item.amount}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1">
              {meta.splits.map((split) => (
                <div key={split.userId} className="flex items-center justify-between text-xs">
                  <span className="truncate">{memberNames[split.userId] ?? split.userId.slice(0, 8)}</span>
                  <div className="flex items-center gap-2">
                    <span>{meta.currency} {split.amount}</span>
                    {split.paid ? (
                      <span className="text-emerald-500">✓ Paid</span>
                    ) : split.userId === user?.id ? (
                      <button
                        className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-[10px] text-white"
                        onClick={() => handleSettle(bill.id, split.userId)}
                      >
                        Mark paid
                      </button>
                    ) : (
                      <span className="text-amber-500">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {bills.length === 0 && !showForm && (
        <p className="py-4 text-center text-xs text-[var(--text-secondary)]">No bills yet</p>
      )}
    </div>
  );
}
