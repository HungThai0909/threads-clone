import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
}).on("error", (err) => console.error("Redis Error:", err));

redisClient
  .connect()
  .then(() => console.log("Redis Connected Successfully"))
  .catch((err) => console.error("Redis Connection Failed:", err));

export const redis = {
  get: (key: string) => redisClient.get(key),
  del: (key: string) => redisClient.del(key),
  exists: (key: string) => redisClient.exists(key),
  set: (key: string, value: string, ttl?: number) =>
    ttl ? redisClient.setEx(key, ttl, value) : redisClient.set(key, value),

  blacklistToken: (jti: string, ttlSeconds: number) =>
    redisClient.setEx(`blacklist:${jti}`, ttlSeconds, "1"),

  isBlacklisted: async (jti: string): Promise<boolean> => {
    const v = await redisClient.get(`blacklist:${jti}`);
    return v !== null;
  },
};
