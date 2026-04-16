"use client";

import { useEffect, useState } from "react";
import { PersonaSwitcher } from "@/components/profile/PersonaSwitcher";
import { SoulCard } from "@/components/profile/SoulCard";
import { Avatar3D } from "@/components/avatar/Avatar3D";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { LiveExpression } from "@/components/avatar/LiveExpression";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { UserProfile, XPData } from "@/types";
import { ProfileSkeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

type TrustBalance = { balance: number; sent: number; received: number };

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [xp, setXP] = useState<XPData | null>(null);
  const [trust, setTrust] = useState<TrustBalance | null>(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [moodWord, setMoodWord] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiClient.get<UserProfile>(`/api/users/${user.id}`),
      apiClient.get<XPData>("/api/quests/xp"),
      apiClient.get<TrustBalance>("/api/users/me/trust-tokens")
    ])
      .then(([p, x, t]) => {
        setProfile(p);
        setXP(x);
        setTrust(t);
        setBio(p.bio ?? "");
        setMoodWord(p.moodWord ?? "");
      })
      .catch(() => null);
  }, [user]);

  if (!profile) return <ProfileSkeleton />;

  return (
    <ErrorBoundary>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <Avatar3D displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
          <div>
            <h1 className="text-xl font-semibold">{profile.displayName}</h1>
            <p className="text-sm text-[var(--text-secondary)]">@{profile.username}</p>
            {xp && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Level {xp.level} · {xp.xp} XP
              </p>
            )}
          </div>
        </div>

        <SoulCard profile={profile} />

        {/* Trust token balance */}
        {trust && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Balance", value: trust.balance },
              { label: "Sent", value: trust.sent },
              { label: "Received", value: trust.received }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[var(--border)] p-3 text-center">
                <p className="text-lg font-semibold">{item.value}</p>
                <p className="text-xs text-[var(--text-secondary)]">{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Edit bio / mood */}
        {editing ? (
          <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
            <label className="block text-sm">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={140}
                rows={2}
                className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              Mood word
              <input
                value={moodWord}
                onChange={(e) => setMoodWord(e.target.value)}
                maxLength={32}
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
              />
            </label>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs text-white disabled:opacity-60"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const updated = await apiClient.patch<UserProfile>("/api/users/me", { bio, moodWord });
                    setProfile(updated);
                    setEditing(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="rounded-md border border-[var(--border)] px-3 py-1 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)]"
            onClick={() => setEditing(true)}
          >
            Edit profile
          </button>
        )}

        <AvatarEditor
          currentUrl={profile.avatarUrl}
          onSave={async (avatarUrl) => {
            const updated = await apiClient.patch<UserProfile>("/api/users/me", { avatarUrl });
            setProfile(updated);
          }}
        />

        <LiveExpression />

        <PersonaSwitcher
          currentPersona={profile.currentPersona}
          onSwitch={async (persona) => {
            await apiClient.post("/api/users/me/persona", { persona, config: { persona } });
            setProfile((prev) => (prev ? { ...prev, currentPersona: persona } : prev));
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
