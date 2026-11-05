import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient = null;
let isRedisReady = false;
let hasLoggedOfflineWarning = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1, // Do not stall HTTP requests if Redis is unreachable
    enableOfflineQueue: false, // Immediately reject commands when disconnected
    retryStrategy(times) {
      // Reconnect with backoff up to 3 seconds
      const delay = Math.min(times * 200, 3000);
      return delay;
    },
    lazyConnect: true, // Explicit connection during app initialization
    connectTimeout: 5000,
  });

  redisClient.on('connect', () => {
    console.log('⚡ Redis connecting...');
  });

  redisClient.on('ready', () => {
    isRedisReady = true;
    hasLoggedOfflineWarning = false;
    console.log('⚡ Redis connected and ready.');
  });

  redisClient.on('error', (err) => {
    isRedisReady = false;
    if (!hasLoggedOfflineWarning) {
      console.warn('⚠️  Redis Client Warning (running in DB fallback mode):', err.message);
      hasLoggedOfflineWarning = true;
    }
  });

  redisClient.on('close', () => {
    isRedisReady = false;
  });

  redisClient.on('end', () => {
    isRedisReady = false;
  });
} catch (error) {
  console.error('Failed to initialize Redis client instance:', error.message);
  redisClient = null;
  isRedisReady = false;
}

/**
 * Initialize connection to Redis server.
 * Gracefully catches errors so server stays operational even if Redis is offline.
 */
export const connectRedis = async () => {
  if (!redisClient) return;
  try {
    await redisClient.connect();
  } catch (err) {
    if (!hasLoggedOfflineWarning) {
      console.warn('⚠️  Redis initial connection failed. Running in DB-only mode:', err.message);
      hasLoggedOfflineWarning = true;
    }
  }
};

/**
 * Get active Redis client instance if ready, otherwise null.
 */
export const getRedisClient = () => {
  return isRedisReady && redisClient && redisClient.status === 'ready' ? redisClient : null;
};

export { isRedisReady };
export default redisClient;

