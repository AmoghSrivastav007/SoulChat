# SoulChat

Deep connections, one message at a time.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion, Three.js |
| Backend | Express, Socket.IO, Prisma, PostgreSQL |
| Cache / Presence | Redis (ioredis) |
| Search | Meilisearch |
| AI | Anthropic Claude 3.5 Sonnet |
| Storage | AWS S3 / Cloudflare R2 |
| Push | Web Push (VAPID) |
| Auth | Custom JWT (access + refresh, per-device rotation) + magic link |
| Monitoring | Sentry |
| CI/CD | GitHub Actions → Vercel (web) + Railway (server) |

---

## Local development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/your-org/soulchat
cd soulchat
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
```

### 3. Start infrastructure

```bash
docker compose up -d postgres redis meilisearch
```

### 4. Run migrations + seed

```bash
cd apps/server
npx prisma migrate dev --schema prisma/schema.prisma
npx prisma db seed
cd ../..
```

### 5. Start dev servers

```bash
# Terminal 1 — backend
cd apps/server && npm run dev

# Terminal 2 — frontend
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Seed credentials: `alice@soulchat.dev` / `password123`

---

## Docker (full stack)

```bash
docker compose up --build
```

This starts Postgres, Redis, Meilisearch, and the server. Run the web app separately with `npm run dev` in `apps/web`.

---

## Production deploy

### Environment

Copy `.env.example` to `.env.production` and fill in all values.

Key secrets needed:
- `DATABASE_URL` — production Postgres
- `REDIS_URL` — production Redis (with password)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — random 32-byte secrets
- `ANTHROPIC_API_KEY`
- `MEILI_MASTER_KEY`
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generate with `npx web-push generate-vapid-keys`
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- `ALLOWED_ORIGINS` — comma-separated list of allowed frontend origins

### GitHub Actions secrets required

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RAILWAY_TOKEN` | Railway deploy token |
| `DATABASE_URL` | Production DB URL (for migrations) |

### Manual deploy

```bash
# Build server
cd apps/server && npm run build

# Run migrations
npx prisma migrate deploy --schema prisma/schema.prisma

# Start
node dist/index.js
```

---

## Project structure

```
apps/
  server/          Express API + Socket.IO
    prisma/        Single source of truth schema
    src/
      routes/      REST endpoints
      socket/      Socket.IO handlers
      services/    AI, search, storage, notifications, quests
      middleware/  Auth, rate limiting, error handling
  web/             Next.js app
    app/           Pages (app router)
    components/    UI components
    hooks/         Zustand stores + custom hooks
    lib/           API client, socket, constants
```

---

## Key features

- **Real-time chat** — Socket.IO with optimistic UI, delivery receipts (sent → delivered → read), typing indicators
- **AI copilot** — Message rewriting, emotion detection, conflict mediation, context briefing (Redis-cached)
- **Spatial rooms** — 2D avatar stage with real-time position sync
- **Constellation view** — Relationship strength visualisation
- **Quests & XP** — Daily quests with auto-progression from socket events
- **Trust economy** — Token tips with daily limits and leaderboard
- **Time capsules** — Scheduled message delivery
- **Memory wall** — AI-curated + user-pinned memories
- **Push notifications** — Web Push (VAPID)
- **PWA** — Service worker, offline shell, manifest
- **Magic link auth** — SMTP-based passwordless login
- **Per-device refresh tokens** — Rotation + revoke-all
