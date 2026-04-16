import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import { Server } from "socket.io";
import { authRouter } from "./routes/auth.routes";
import { chatRouter } from "./routes/chat.routes";
import { createMessageRouter } from "./routes/message.routes";
import { aiRouter } from "./routes/ai.routes";
import { mediaRouter } from "./routes/media.routes";
import { economyRouter } from "./routes/economy.routes";
import { questsRouter } from "./routes/quests.routes";
import { memoryRouter } from "./routes/memory.routes";
import { usersRouter } from "./routes/users.routes";
import { timeCapsuleRouter } from "./routes/timeCapsule.routes";
import { roomsRouter } from "./routes/rooms.routes";
import { billsRouter } from "./routes/bills.routes";
import { gamesRouter } from "./routes/games.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { apiRateLimit, authRateLimit, magicLinkRateLimit } from "./middleware/rateLimit.middleware";
import { notificationsRouter } from "./routes/notifications.routes";
import { searchRouter } from "./routes/search.routes";
import { registerSocketHandlers } from "./socket";
import { startSchedulers } from "./services/scheduler.service";

// ── Sentry (must init before anything else) ───────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0
  });
}

const app = express();
const server = http.createServer(app);

// ── CORS origin list ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true }
});

// app.use(Sentry.Handlers.requestHandler());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api", apiRateLimit);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRateLimit, authRouter);
app.use("/api/users", usersRouter);
app.use("/api/chats", chatRouter);
app.use("/api/messages", createMessageRouter(io));
app.use("/api/ai", aiRouter);
app.use("/api/media", mediaRouter);
app.use("/api/trust", economyRouter);
app.use("/api/quests", questsRouter);
app.use("/api/memories", memoryRouter);
app.use("/api/time-capsules", timeCapsuleRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/bills", billsRouter);
app.use("/api/games", gamesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/search", searchRouter);
// app.use(Sentry.Handlers.errorHandler());
app.use(errorMiddleware);

registerSocketHandlers(io);
startSchedulers(io);

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => {
  console.log(`SoulChat server running on ${port}`);
});
