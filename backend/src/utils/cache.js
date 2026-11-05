import { getRedisClient } from '../config/redis.js';

// ============================================================================
// TIER 1: HIGH-SPEED IN-PROCESS MEMORY CACHE (0.01ms lookup, zero internet hop)
// ============================================================================
const l1Cache = new Map();

const getFromL1 = (key) => {
  const entry = l1Cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    l1Cache.delete(key);
    return null;
  }
  return entry.value;
};

const setToL1 = (key, value, ttlSeconds) => {
  // Cap L1 memory cache size to 2,000 keys to prevent excessive RAM usage
  if (l1Cache.size >= 2000) {
    const oldestKey = l1Cache.keys().next().value;
    l1Cache.delete(oldestKey);
  }
  // Keep in fast L1 memory for up to 60 seconds (or ttlSeconds if shorter)
  const effectiveL1Ttl = Math.min(ttlSeconds, 60);
  l1Cache.set(key, {
    value,
    expiry: Date.now() + effectiveL1Ttl * 1000,
  });
};

const deleteFromL1 = (key) => {
  l1Cache.delete(key);
};

const deletePatternFromL1 = (pattern) => {
  try {
    const regexStr = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    for (const k of l1Cache.keys()) {
      if (regex.test(k)) {
        l1Cache.delete(k);
      }
    }
  } catch (err) {
    l1Cache.clear();
  }
};

// ============================================================================
// TIER 2: DISTRIBUTED REDIS CACHE (Multi-tier Cache-Aside)
// ============================================================================

/**
 * Multi-Tier Cache-Aside:
 * 1. Checks Tier 1 In-Memory Cache (0.01ms, instant)
 * 2. Checks Tier 2 Redis Cloud Store (1-2ms local / remote ping)
 * 3. Falls back to MongoDB on cache miss and warms both tiers
 *
 * @param {string} key - Unique cache key
 * @param {number} ttlSeconds - Cache expiration time in seconds
 * @param {Function} fetchFn - Async function returning fresh data on miss
 * @returns {Promise<any>}
 */
export const getOrSetCache = async (key, ttlSeconds, fetchFn) => {
  // 1. Check L1 In-Memory Cache first (Instant, zero network delay)
  const l1Data = getFromL1(key);
  if (l1Data !== null) {
    return l1Data;
  }

  // 2. Check L2 Redis Cache
  const redis = getRedisClient();
  if (redis) {
    try {
      const cachedData = await redis.get(key);
      if (cachedData !== null) {
        const parsed = JSON.parse(cachedData);
        // Populate L1 cache so next call is instant
        setToL1(key, parsed, ttlSeconds);
        return parsed;
      }
    } catch (err) {
      console.warn(`Redis GET failed for key "${key}":`, err.message);
    }
  }

  // 3. Cache MISS: Fetch fresh data from MongoDB
  const freshData = await fetchFn();

  if (freshData !== undefined && freshData !== null) {
    // Populate Tier 1
    setToL1(key, freshData, ttlSeconds);

    // Populate Tier 2 Redis with jitter
    if (redis) {
      try {
        const jitter = Math.floor(Math.random() * 20);
        const effectiveTtl = Math.max(10, ttlSeconds + jitter);
        await redis.set(key, JSON.stringify(freshData), 'EX', effectiveTtl);
      } catch (err) {
        console.warn(`Redis SET failed for key "${key}":`, err.message);
      }
    }
  }

  return freshData;
};

/**
 * Invalidate one or more specific cache keys across both L1 and L2 tiers.
 *
 * @param {...string} keys - Cache keys to delete
 */
export const invalidateCache = async (...keys) => {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  // Evict from L1 Memory immediately
  for (const k of validKeys) {
    deleteFromL1(k);
  }

  // Evict from L2 Redis
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(...validKeys);
    } catch (err) {
      console.warn('Redis DEL failed for keys:', validKeys, err.message);
    }
  }
};

/**
 * Invalidate all cache keys matching a pattern across both L1 and L2 tiers.
 *
 * @param {string} pattern - Key pattern (e.g., 'activecap:tasks:user123:*')
 */
export const invalidatePattern = async (pattern) => {
  if (!pattern) return;

  // Evict matching keys from L1 Memory immediately
  deletePatternFromL1(pattern);

  // Evict matching keys from L2 Redis using safe SCAN
  const redis = getRedisClient();
  if (!redis) return;

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
