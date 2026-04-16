"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useAuthStore } from "./useAuthStore";

type PresenceMap = Record<string, string>; // userId → status

export function usePresence() {
  const [presence, setPresence] = useState<PresenceMap>({});
  const { socket } = useSocket();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Request current presence snapshot
    socket.emit("get_presence", {}, (data: PresenceMap) => {
      if (data) setPresence(data);
    });

    const onUpdate = ({ userId, status }: { userId: string; status: string }) => {
      setPresence((prev) => ({ ...prev, [userId]: status }));
    };

    socket.on("presence_update", onUpdate);
    return () => { socket.off("presence_update", onUpdate); };
  }, [socket]);

  // Heartbeat every 25s
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => socket.emit("heartbeat"), 25_000);
    return () => clearInterval(id);
  }, [socket, user]);

  const setStatus = useCallback(
    (status: string) => socket.emit("set_status", { status }),
    [socket]
  );

  const getStatus = useCallback(
    (userId: string): string => presence[userId] ?? "offline",
    [presence]
  );

  return { presence, setStatus, getStatus };
}
