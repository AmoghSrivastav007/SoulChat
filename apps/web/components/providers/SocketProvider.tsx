"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { socket } from "@/lib/socket";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { token: accessToken };
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off();
    };
  }, [accessToken]);

  return <>{children}</>;
}
