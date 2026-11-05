import { getRedisClient } from '../config/redis.js';

/**
 * Fetch data from Redis cache or execute fetchFn and store the result.
 * Implements Cache-Aside (Lazy Loading) pattern with TTL jitter.
 *
 * @param {string} key - Unique Redis cache key
 * @param {number} ttlSeconds - Cache expiration time in seconds
 * @param {Function} fetchFn - Async function returning fresh data on cache miss
 * @returns {Promise<any>} Cached or fresh data
 */
export const getOrSetCache = async (key, ttlSeconds, fetchFn) => {
  const redis = getRedisClient();

  // If Redis is unavailable, gracefully bypass cache and fetch directly from DB
  if (!redis) {
    return await fetchFn();
  }

  try {
    const cachedData = await redis.get(key);
    if (cachedData !== null) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.warn(`Redis GET failed for key "${key}":`, err.message);
  }

  // Cache MISS: Fetch fresh data from MongoDB
  const freshData = await fetchFn();

  if (freshData !== undefined && freshData !== null) {
    try {
      // Add a small jitter (0-20s) to prevent thundering herd / synchronized expiration
      const jitter = Math.floor(Math.random() * 20);
      const effectiveTtl = Math.max(10, ttlSeconds + jitter);

      await redis.set(key, JSON.stringify(freshData), 'EX', effectiveTtl);
    } catch (err) {
      console.warn(`Redis SET failed for key "${key}":`, err.message);
    }
  }

  return freshData;
};

/**
 * Invalidate one or more specific cache keys.
 *
 * @param {...string} keys - Cache keys to delete
 */
export const invalidateCache = async (...keys) => {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length > 0) {
      await redis.del(...validKeys);
    }
  } catch (err) {
    console.warn('Redis DEL failed for keys:', keys, err.message);
  }
};

/**
 * Invalidate all cache keys matching a pattern using non-blocking SCAN.
 * NEVER use KEYS * in production as it blocks the Redis thread.
 *
 * @param {string} pattern - Key pattern (e.g., 'activecap:tasks:user123:*')
 */
export const invalidatePattern = async (pattern) => {
  const redis = getRedisClient();
  if (!redis || !pattern) return;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn(`Redis SCAN/DEL pattern "${pattern}" failed:`, err.message);
  }
};

