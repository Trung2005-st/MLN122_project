import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. Xem .env.example"
      );
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

export const KEYS = {
  room: (code: string) => `room:${code.toUpperCase()}`,
  roomLock: (code: string) => `lock:${code.toUpperCase()}`,
  leaderboard: "leaderboard:global",
  playerSession: (playerId: string) => `session:${playerId}`,
};

export async function withRoomLock<T>(
  code: string,
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  const r = getRedis();
  const lockKey = KEYS.roomLock(code);
  for (let i = 0; i < maxRetries; i++) {
    const acquired = await r.set(lockKey, Date.now().toString(), {
      nx: true,
      ex: 5,
    });
    if (acquired) {
      try {
        return await fn();
      } finally {
        await r.del(lockKey);
      }
    }
    await new Promise((res) => setTimeout(res, 50 + Math.random() * 100));
  }
  throw new Error("Phòng đang bận, thử lại sau");
}
