// app/lib/redis.js
import IORedis from "ioredis";

// Centralized Redis client configuration
const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  // Add password if you have one set in your Redis config
  // password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Important for handling transient connection errors
};

let redis;

// This pattern ensures that in a serverless environment (like Vercel in production),
// a new connection is not created on every function invocation.
// The global object is not affected by hot-reloading in development.
if (process.env.NODE_ENV === "production") {
  redis = new IORedis(redisOptions);
} else {
  if (!global.redis) {
    global.redis = new IORedis(redisOptions);
  }
  redis = global.redis;
}

export default redis;
