"use client";

import { useEffect } from "react";
import { MoodProvider } from "@/components/providers/MoodProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthBootstrap } from "@/components/providers/AuthBootstrap";
import { initSentry } from "@/lib/sentry";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSentry().catch(() => null);
  }, []);

  return (
    <ThemeProvider>
      <MoodProvider>
        <AuthBootstrap>
          <SocketProvider>{children}</SocketProvider>
        </AuthBootstrap>
      </MoodProvider>
    </ThemeProvider>
  );
}