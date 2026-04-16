type ConflictMediatorProps = {
  suggestion: string;
  onDismiss: () => void;
  onPost?: () => Promise<void>;
};

export function ConflictMediator({ suggestion, onDismiss, onPost }: ConflictMediatorProps) {
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium">Things seem tense. Want a neutral reframe?</p>
        <button className="text-xs underline" onClick={onDismiss}>Dismiss</button>
      </div>
      <p className="mb-2">{suggestion}</p>
      {onPost && (
        <button
          className="rounded-md bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-700"
          onClick={onPost}
        >
          Post this message
        </button>
      )}
    </div>
  );
}
