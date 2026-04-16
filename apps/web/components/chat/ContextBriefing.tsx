type ContextBriefingProps = {
  summary: string;
  mood: string;
  urgentCount: number;
  onDismiss: () => void;
};

export function ContextBriefing({ summary, mood, urgentCount, onDismiss }: ContextBriefingProps) {
  return (
    <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium">You've been away</p>
        <button className="text-xs text-[var(--text-secondary)] underline" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <p>{summary}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Mood: {mood} · Urgent: {urgentCount}
      </p>
    </div>
  );
}
