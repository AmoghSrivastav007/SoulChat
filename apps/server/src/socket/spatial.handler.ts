import { Server, Socket } from "socket.io";
import { setHashField, getHashAll, deleteHashField } from "../lib/redis";

type AvatarPosition = { x: number; y: number; userId: string };

export function registerSpatialHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;
  let currentRoom: string | null = null;

  socket.on("join_room", async ({ roomId }: { roomId: string }) => {
    if (currentRoom) {
      socket.leave(`room:${currentRoom}`);
      await deleteHashField(`room:${currentRoom}:positions`, userId);
      io.to(`room:${currentRoom}`).emit("avatar_left", { roomId: currentRoom, userId });
    }

    currentRoom = roomId;
    socket.join(`room:${roomId}`);

    // Send existing positions to the joining user
    const positions = await getHashAll(`room:${roomId}:positions`).catch(() => ({}));
    const parsed: AvatarPosition[] = Object.entries(positions).map(([uid, raw]) => ({
      userId: uid,
      ...(JSON.parse(raw) as { x: number; y: number })
    }));
    socket.emit("room_state", { roomId, positions: parsed });

    io.to(`room:${roomId}`).emit("avatar_joined", { roomId, userId });
  });

  socket.on("move_avatar", async ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
    await setHashField(`room:${roomId}:positions`, userId, JSON.stringify({ x, y }));
    io.to(`room:${roomId}`).emit("avatar_moved", { roomId, userId, x, y });
  });

  socket.on("leave_room", async ({ roomId }: { roomId: string }) => {
    socket.leave(`room:${roomId}`);
    await deleteHashField(`room:${roomId}:positions`, userId);
    io.to(`room:${roomId}`).emit("avatar_left", { roomId, userId });
    currentRoom = null;
  });

  socket.on("disconnect", async () => {
    if (currentRoom) {
      await deleteHashField(`room:${currentRoom}:positions`, userId);
      io.to(`room:${currentRoom}`).emit("avatar_left", { roomId: currentRoom, userId });
    }
  });
}
