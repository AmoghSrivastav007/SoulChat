import rateLimit from "express-rate-limit";
import { redis } from "../lib/redis";

// Redis-backed store for rate limiting (falls back to memory if Redis unavailable)
function makeStore() {
  if (!redis) return undefined; // express-rate-limit uses memory store by default

  // Simple Redis store compatible with express-rate-limit v7
  const prefix = "rl:";
  return {
    async increment(key: string) {
      try {
        const redisKey = `${prefix}${key}`;
        const current = await redis.incr(redisKey);
        if (current === 1) {
          await redis.expire(redisKey, 60);
        }
        const ttl = await redis.ttl(redisKey);
        return {
          totalHits: current,
          resetTime: new Date(Date.now() + ttl * 1000)
        };
      } catch (error) {
        // Fallback to memory store behavior
        return {
          totalHits: 1,
          resetTime: new Date(Date.now() + 60000)
        };
      }
    },
    async decrement(key: string) {
      try {
        await redis.decr(`${prefix}${key}`);
      } catch {
        // Ignore errors
      }
    },
    async resetKey(key: string) {
      try {
        await redis.del(`${prefix}${key}`);
      } catch {
        // Ignore errors
      }
    }
  };
}

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
  // Use default memory store (makeStore() removed since Redis isn't running)
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." }
});

export const magicLinkRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many magic link requests." }
});
