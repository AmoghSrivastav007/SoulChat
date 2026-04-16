"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api";

type CulturalTranslatorProps = {
  content: string;
  messageId: string;
};

type TranslateResponse = { original: string; translated: string };

const LANGUAGES = [
  { code: "Hindi", label: "हिंदी" },
  { code: "Spanish", label: "Español" },
  { code: "French", label: "Français" },
  { code: "Japanese", label: "日本語" },
  { code: "Arabic", label: "العربية" }
];

export function CulturalTranslator({ content, messageId }: CulturalTranslatorProps) {
  const [open, setOpen] = useState(false);
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("Hindi");

  async function translate(targetLang: string) {
    setLoading(true);
    setLang(targetLang);
    try {
      const result = await apiClient.post<TranslateResponse>("/api/ai/translate", {
        text: content,
        targetLanguage: targetLang
      });
      setTranslated(result.translated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline"
        onClick={() => setOpen(!open)}
      >
        🌐 Translate
      </button>

      {open && (
        <div className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-2 shadow-sm">
          <div className="mb-1.5 flex flex-wrap gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                  lang === l.code ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] hover:bg-[var(--bg-secondary)]"
                }`}
                onClick={() => translate(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {loading && <p className="text-[10px] text-[var(--text-muted)]">Translating…</p>}

          {translated && !loading && (
            <div className="space-y-1">
              <p className="text-[10px] text-[var(--text-muted)] line-through opacity-60">{content}</p>
              <p className="text-xs">{translated}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
