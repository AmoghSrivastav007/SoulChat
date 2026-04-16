import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt";
import { registerChatHandlers } from "./chat.handler";
import { registerPresenceHandlers } from "./presence.handler";
import { registerSpatialHandlers } from "./spatial.handler";
import { registerGameHandlers } from "./game.handler";

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? null;
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerSpatialHandlers(io, socket);
    registerGameHandlers(io, socket);
  });
}
