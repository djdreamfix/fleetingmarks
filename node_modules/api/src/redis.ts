import { Redis } from "@upstash/redis";
export const redis = Redis.fromEnv();
// Keys:
// mark:{id} -> HASH-like via JSON (stored as string)
// marks_by_expiry -> ZSET score = expiresAt (ms)
// push:subs -> SET of JSON strings or a LIST
