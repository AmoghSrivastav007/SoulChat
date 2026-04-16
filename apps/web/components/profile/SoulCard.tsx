import { UserProfile } from "@/types";

type SoulCardProps = {
  profile: UserProfile;
};

export function SoulCard({ profile }: SoulCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-violet-100 to-purple-100 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{profile.displayName}</h2>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">Trust {profile.trustScore}</span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">@{profile.username}</p>
      <p className="mt-2 text-sm">{profile.bio ?? "No bio yet."}</p>
      <div className="mt-3 flex gap-2 text-xs text-[var(--text-secondary)]">
        <span>Vibe: {profile.moodWord ?? "neutral"}</span>
        <span>Song: {profile.currentSong ?? "none"}</span>
      </div>
    </section>
  );
}
