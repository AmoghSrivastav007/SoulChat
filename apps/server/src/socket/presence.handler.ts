import { Server, Socket } from "socket.io";
import { setValue, deleteValue, getHashAll, setHashField, deleteHashField } from "../lib/redis";

const HEARTBEAT_TTL = 35; // seconds

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  async function setOnline(status: string): Promise<void> {
    await setHashField("presence", userId, status);
    await setValue(`presence:hb:${userId}`, "1", HEARTBEAT_TTL);
    io.emit("presence_update", { userId, status });
  }

  async function setOffline(): Promise<void> {
    await deleteHashField("presence", userId);
    await deleteValue(`presence:hb:${userId}`);
    io.emit("presence_update", { userId, status: "offline" });
  }

  // Announce online on connect
  setOnline("online").catch(() => null);

  socket.on("set_status", ({ status }: { status: string }) => {
    setOnline(status).catch(() => null);
  });

  socket.on("heartbeat", () => {
    setValue(`presence:hb:${userId}`, "1", HEARTBEAT_TTL).catch(() => null);
  });

  socket.on("get_presence", async (_, callback) => {
    const all = await getHashAll("presence").catch(() => ({}));
    if (typeof callback === "function") callback(all);
  });

  socket.on("disconnect", () => {
    setOffline().catch(() => null);
  });
}
