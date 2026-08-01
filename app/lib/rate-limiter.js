// app/lib/rate-limiter.js
import redis from "./redis";

const memoryBuckets = globalThis.__rateLimitBuckets || new Map();
globalThis.__rateLimitBuckets = memoryBuckets;

function memoryRateLimit(identifier, limit, windowInSeconds) {
  const now = Date.now();
  const windowStart = now - windowInSeconds * 1000;
  const hits = (memoryBuckets.get(identifier) || []).filter((t) => t > windowStart);
  hits.push(now);
  memoryBuckets.set(identifier, hits);

  // Opportunistic cleanup so the map can't grow forever.
  if (memoryBuckets.size > 10000) {
    for (const [key, times] of memoryBuckets) {
      if (!times.length || times[times.length - 1] <= windowStart) memoryBuckets.delete(key);
    }
  }

  const isLimited = hits.length > limit;
  return {
    isLimited,
    remaining: Math.max(0, limit - hits.length),
    reset: new Date(hits[0] + windowInSeconds * 1000),
  };
}

/** Resets a limiter key (e.g. after a successful login). */
export async function clearRateLimit(identifier) {
  memoryBuckets.delete(identifier);
  if (redis) {
    try { await redis.del(`rate_limit:${identifier}`); } catch {}
  }
}

/**
 * Implements a sliding window rate limiter using Redis sorted sets.
 *
 * @param {string} identifier - A unique identifier for the entity being rate-limited (e.g., an IP address).
 * @param {number} limit - The maximum number of requests allowed within the window.
 * @param {number} windowInSeconds - The duration of the time window in seconds.
 * @returns {Promise<{isLimited: boolean, remaining: number, reset: Date}>} - An object indicating if the request is limited,
 *   the number of remaining requests, and the time when the limit will reset.
 */
export async function isRateLimited(identifier, limit, windowInSeconds) {
  // Without Redis (local dev / single instance), fall back to an in-memory
  // window instead of disabling rate limiting entirely.
  if (!redis) {
    return memoryRateLimit(identifier, limit, windowInSeconds);
  }

  const key = `rate_limit:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowInSeconds * 1000;

  // Use a MULTI/EXEC transaction to ensure atomicity
  const pipeline = redis.multi();

  // 1. Remove old timestamps from the sorted set
  pipeline.zremrangebyscore(key, 0, windowStart);

  // 2. Add the current timestamp
  pipeline.zadd(key, now, now.toString());

  // 3. Get the count of requests in the current window
  pipeline.zcard(key);
  
  // 4. Set the key to expire after the window to clean up old data
  pipeline.expire(key, windowInSeconds);

  // Execute the transaction
  const results = await pipeline.exec();

  // The result of zcard is the third command in the pipeline
  const requestCount = results[2][1];

  const isLimited = requestCount > limit;
  const remaining = isLimited ? 0 : limit - requestCount;
  
  // To calculate reset time, find the oldest request in the window
  const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
  let resetTime = new Date(now + windowInSeconds * 1000); // Fallback to full window
  if(oldestRequest && oldestRequest.length > 0) {
    const oldestTimestamp = parseInt(oldestRequest[1], 10);
    resetTime = new Date(oldestTimestamp + windowInSeconds * 1000);
  }

  return { isLimited, remaining, reset: resetTime };
}
