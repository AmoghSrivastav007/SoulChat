"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import { DailyQuest, XPData } from "@/types";
import { QuestSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function XPBar({ xp }: { xp: XPData }) {
  const xpInLevel = xp.xp % 100;
  const pct = xpInLevel;
  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold">Level {xp.level}</span>
        <span className="text-[var(--text-secondary)]">{xp.xp} XP total</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary,#f1f0f8)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{xpInLevel}/100 XP to next level</p>
    </div>
  );
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [xp, setXP] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<DailyQuest[]>("/api/quests/daily"),
      apiClient.get<XPData>("/api/quests/xp")
    ])
      .then(([q, x]) => { setQuests(q); setXP(x); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <QuestSkeleton />;

  return (
    <ErrorBoundary>
      <div className="space-y-3 p-4">
        <h1 className="text-xl font-semibold">Daily Quests</h1>

        {xp && <XPBar xp={xp} />}

        {quests.map((quest) => {
          const done = quest.progress?.status === "COMPLETED" || quest.progress?.status === "CLAIMED";
          return (
            <div
              key={quest.id}
              className={`rounded-xl border p-3 transition-colors ${done ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-[var(--border)]"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{quest.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{quest.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    +{quest.xpReward} XP · +{quest.tokenReward} trust tokens
                  </p>
                </div>
                {done ? (
                  <span className="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">✓ Done</span>
                ) : (
                  <button
                    className="shrink-0 rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white disabled:opacity-60"
                    disabled={completing === quest.id}
                    onClick={async () => {
                      setCompleting(quest.id);
                      try {
                        await apiClient.post(`/api/quests/${quest.id}/complete`);
                        const [updatedQuests, updatedXP] = await Promise.all([
                          apiClient.get<DailyQuest[]>("/api/quests/daily"),
                          apiClient.get<XPData>("/api/quests/xp")
                        ]);
                        setQuests(updatedQuests);
                        setXP(updatedXP);
                      } finally {
                        setCompleting(null);
                      }
                    }}
                  >
                    {completing === quest.id ? "…" : "Complete"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ErrorBoundary>
  );
}
