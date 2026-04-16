import Redis from "ioredis";

let inMemoryStore = new Map<string, { value: string; expiresAt?: number }>();

const redisUrl = process.env.REDIS_URL;

export const redis =
  redisUrl && redisUrl.length > 0
    ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
    : null;

if (redis) {
  redis.on("error", () => {
    /* suppress unhandled errors */
  });
}

export async function setValue(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (redis) {
    try {
      if (ttlSeconds) {
        await redis.set(key, value, "EX", ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return;
    } catch {
      /* fall through to in-memory */
    }
  }
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
  inMemoryStore.set(key, { value, expiresAt });
  if (ttlSeconds) {
    setTimeout(() => inMemoryStore.delete(key), ttlSeconds * 1000);
  }
}

export async function getValue(key: string): Promise<string | null> {
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      /* fall through */
    }
  }
  const entry = inMemoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    inMemoryStore.delete(key);
    return null;
  }
  return entry.value;
}

export async function deleteValue(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch {
      /* fall through */
    }
  }
  inMemoryStore.delete(key);
}

export async function deletePattern(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
      return;
    } catch {
      /* fall through */
    }
  }
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of inMemoryStore.keys()) {
    if (regex.test(key)) inMemoryStore.delete(key);
  }
}

export async function setHashField(key: string, field: string, value: string): Promise<void> {
  if (redis) {
    try {
      await redis.hset(key, field, value);
      return;
    } catch {
      /* fall through */
    }
  }
  const existing = inMemoryStore.get(key);
  const map: Record<string, string> = existing ? JSON.parse(existing.value) : {};
  map[field] = value;
  inMemoryStore.set(key, { value: JSON.stringify(map) });
}

export async function getHashAll(key: string): Promise<Record<string, string>> {
  if (redis) {
    try {
      return await redis.hgetall(key);
    } catch {
      /* fall through */
    }
  }
  const entry = inMemoryStore.get(key);
  if (!entry) return {};
  return JSON.parse(entry.value) as Record<string, string>;
}

export async function deleteHashField(key: string, field: string): Promise<void> {
  if (redis) {
    try {
      await redis.hdel(key, field);
      return;
    } catch {
      /* fall through */
    }
  }
  const entry = inMemoryStore.get(key);
  if (!entry) return;
  const map = JSON.parse(entry.value) as Record<string, string>;
  delete map[field];
  inMemoryStore.set(key, { value: JSON.stringify(map) });
}
