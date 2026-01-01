// app/lib/redis.js
import IORedis from "ioredis";

let redis = null;

// This logic is now very strict. By default, Redis is disabled.
// It will only be enabled if it detects the specific production Docker environment.

// The `REDIS_HOST` environment variable is set to 'redis' in docker-compose.yml,
// so this condition will only be true when running inside Docker via `docker compose up`.
if (process.env.NODE_ENV === 'production' && process.env.REDIS_HOST === 'redis') {
  
  const redisOptions = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    maxRetriesPerRequest: null,
    // lazyConnect is crucial to prevent connection attempts during the build process.
    lazyConnect: true,
  };

  console.log("Production environment detected. Initializing Redis connection...");
  redis = new IORedis(redisOptions);

  redis.on('error', (err) => {
    console.error('Redis Connection Error:', err);
  });
  
} else {
  // In any other environment (like local `npm run dev`), `redis` remains `null`.
  console.log("Non-production or non-Docker environment detected. Redis is disabled.");
}

export default redis;
