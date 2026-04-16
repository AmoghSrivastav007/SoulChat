"use client";

import { useState } from "react";
import { useMood } from "@/hooks/useMood";
import { usePresence } from "@/hooks/usePresence";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const moods = ["default", "happy", "focused", "calm", "anxious", "sad"] as const;
const statuses = ["online", "away", "focus", "offline"] as const;

export default function SettingsPage() {
  const mood = useMood((state) => state.mood);
  const setMood = useMood((state) => state.setMood);
  const focusMode = useMood((state) => state.focusMode);
  const setFocusMode = useMood((state) => state.setFocusMode);
  const { setStatus } = usePresence();
  const [pushStatus, setPushStatus] = useState<"idle" | "granted" | "denied">("idle");

  async function requestPushPermission() {
    if (!("Notification" in window)) {
      setPushStatus("denied");
      return;
    }
    const result = await Notification.requestPermission();
    setPushStatus(result === "granted" ? "granted" : "denied");
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4 p-4">
        <h1 className="text-xl font-semibold">Settings</h1>

        {/* Mood accent */}
        <section className="rounded-xl border border-[var(--border)] p-3">
          <p className="mb-2 text-sm font-medium">Mood Accent</p>
          <div className="flex flex-wrap gap-2">
            {moods.map((item) => (
              <button
                key={item}
                className={`rounded-full px-3 py-1 text-xs capitalize transition-colors ${
                  mood === item ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
                onClick={() => setMood(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* Focus mode */}
        <section className="rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Focus Mode</p>
              <p className="text-xs text-[var(--text-secondary)]">Mutes non-urgent notifications</p>
            </div>
            <button
              className={`relative h-6 w-11 rounded-full transition-colors ${focusMode ? "bg-[var(--accent)]" : "bg-[var(--bg-tertiary,#f1f0f8)]"}`}
              onClick={() => setFocusMode(!focusMode)}
              role="switch"
              aria-checked={focusMode}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${focusMode ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </section>

        {/* Presence status */}
        <section className="rounded-xl border border-[var(--border)] p-3">
          <p className="mb-2 text-sm font-medium">Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs capitalize hover:bg-[var(--bg-secondary)]"
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Push notifications */}
        <section className="rounded-xl border border-[var(--border)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {pushStatus === "granted" ? "Enabled" : pushStatus === "denied" ? "Blocked by browser" : "Not yet enabled"}
              </p>
            </div>
            {pushStatus !== "granted" && (
              <button
                className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white"
                onClick={requestPushPermission}
              >
                Enable
              </button>
            )}
            {pushStatus === "granted" && <span className="text-emerald-500 text-sm">✓</span>}
          </div>
        </section>
      </div>
    </ErrorBoundary>
  );
}
