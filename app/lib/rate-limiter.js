// app/lib/rate-limiter.js
import redis from "./redis";

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
  // If redis is not configured (e.g. in local dev), bypass rate limiting.
  if (!redis) {
    return { isLimited: false, remaining: limit, reset: new Date() };
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
