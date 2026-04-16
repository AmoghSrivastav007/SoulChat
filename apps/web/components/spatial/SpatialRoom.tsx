"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/hooks/useAuthStore";

type AvatarPosition = { userId: string; x: number; y: number };

type SpatialRoomProps = {
  roomId: string;
  roomName: string;
};

const STAGE_WIDTH = 600;
const STAGE_HEIGHT = 400;

export function SpatialRoom({ roomId, roomName }: SpatialRoomProps) {
  const [positions, setPositions] = useState<AvatarPosition[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    socket.emit("join_room", { roomId });

    const onRoomState = ({ positions: pos }: { positions: AvatarPosition[] }) => {
      setPositions(pos);
    };

    const onAvatarMoved = ({ userId, x, y }: AvatarPosition) => {
      setPositions((prev) => {
        const existing = prev.find((p) => p.userId === userId);
        if (existing) return prev.map((p) => p.userId === userId ? { ...p, x, y } : p);
        return [...prev, { userId, x, y }];
      });
    };

    const onAvatarJoined = ({ userId }: { userId: string }) => {
      setPositions((prev) => {
        if (prev.find((p) => p.userId === userId)) return prev;
        return [...prev, { userId, x: STAGE_WIDTH / 2, y: STAGE_HEIGHT / 2 }];
      });
    };

    const onAvatarLeft = ({ userId }: { userId: string }) => {
      setPositions((prev) => prev.filter((p) => p.userId !== userId));
    };

    socket.on("room_state", onRoomState);
    socket.on("avatar_moved", onAvatarMoved);
    socket.on("avatar_joined", onAvatarJoined);
    socket.on("avatar_left", onAvatarLeft);

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("room_state", onRoomState);
      socket.off("avatar_moved", onAvatarMoved);
      socket.off("avatar_joined", onAvatarJoined);
      socket.off("avatar_left", onAvatarLeft);
    };
    // positions intentionally excluded — handlers use functional setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, socket, user?.id]);

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!stageRef.current || !user?.id) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * STAGE_WIDTH);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * STAGE_HEIGHT);
    socket.emit("move_avatar", { roomId, x, y });
    setPositions((prev) => {
      const existing = prev.find((p) => p.userId === user.id);
      if (existing) return prev.map((p) => p.userId === user.id ? { ...p, x, y } : p);
      return [...prev, { userId: user.id, x, y }];
    });
  }

  const myPos = positions.find((p) => p.userId === user?.id);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <p className="text-sm font-medium">{roomName}</p>
        <span className="text-xs text-[var(--text-secondary)]">{positions.length} in room</span>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative cursor-pointer bg-gradient-to-br from-indigo-950 to-purple-950"
        style={{ width: "100%", paddingBottom: `${(STAGE_HEIGHT / STAGE_WIDTH) * 100}%` }}
        onClick={handleStageClick}
      >
        <div className="absolute inset-0">
          {/* Grid dots */}
          <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {positions.map((pos) => {
            const isMe = pos.userId === user?.id;
            const xPct = (pos.x / STAGE_WIDTH) * 100;
            const yPct = (pos.y / STAGE_HEIGHT) * 100;
            return (
              <div
                key={pos.userId}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{ left: `${xPct}%`, top: `${yPct}%` }}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-lg ${
                    isMe ? "bg-[var(--accent)] text-white ring-2 ring-white" : "bg-purple-700 text-white"
                  }`}
                >
                  {isMe ? "Me" : pos.userId.slice(0, 2).toUpperCase()}
                </div>
                {isMe && (
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/70">
                    You
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="px-3 py-2 text-xs text-[var(--text-secondary)]">
        Click anywhere to move your avatar · {myPos ? `Position: ${myPos.x}, ${myPos.y}` : "Click to join"}
      </p>
    </div>
  );
}
