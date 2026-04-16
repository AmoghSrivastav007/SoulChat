"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const moodToAccent: Record<string, string> = {
  happy: "#F59E0B",
  focused: "#4338CA",
  calm: "#0D9488",
  anxious: "#94A3B8",
  sad: "#94A3B8",
  default: "#7C3AED"
};

type MoodState = {
  mood: "happy" | "focused" | "calm" | "anxious" | "sad" | "default";
  focusMode: boolean;
  setMood: (mood: MoodState["mood"]) => void;
  setFocusMode: (enabled: boolean) => void;
};

export const useMood = create<MoodState>()(
  persist(
    (set) => ({
      mood: "default",
      focusMode: false,
      setMood: (mood) => {
        set({ mood });
        document.documentElement.style.setProperty("--accent", moodToAccent[mood]);
      },
      setFocusMode: (focusMode) => set({ focusMode })
    }),
    { name: "soulchat-mood" }
  )
);

export function applyMoodAccent(mood: MoodState["mood"]): void {
  document.documentElement.style.setProperty("--accent", moodToAccent[mood]);
}
