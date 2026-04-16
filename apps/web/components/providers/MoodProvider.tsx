"use client";

import { useEffect } from "react";
import { applyMoodAccent, useMood } from "@/hooks/useMood";

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const mood = useMood((state) => state.mood);

  useEffect(() => {
    applyMoodAccent(mood);
  }, [mood]);

  return <>{children}</>;
}
