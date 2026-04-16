"use client";

type PersonaSwitcherProps = {
  currentPersona: string;
  onSwitch: (persona: string) => Promise<void>;
};

const personaOptions = ["default", "work", "family", "friends"];

export function PersonaSwitcher({ currentPersona, onSwitch }: PersonaSwitcherProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <p className="mb-2 text-sm font-medium">Persona</p>
      <div className="flex flex-wrap gap-2">
        {personaOptions.map((persona) => (
          <button
            key={persona}
            type="button"
            onClick={() => onSwitch(persona)}
            className={`rounded-full px-3 py-1 text-xs ${
              currentPersona === persona
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            {persona}
          </button>
        ))}
      </div>
    </div>
  );
}
