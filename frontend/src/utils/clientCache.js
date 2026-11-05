// Client-side in-memory cache for instant 0ms page switching (Stale-While-Revalidate)
const memoryStore = new Map();

export const clientCache = {
  /**
   * Get cached data if present and unexpired
   * @param {string} key
   * @returns {any|null}
   */
  get: (key) => {
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      memoryStore.delete(key);
      return null;
    }
    return entry.data;
  },

  /**
   * Store data in client cache with TTL
   * @param {string} key
   * @param {any} data
   * @param {number} ttlSeconds - Default 60 seconds
   */
  set: (key, data, ttlSeconds = 60) => {
    memoryStore.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  /**
   * Invalidate specific keys or keys matching a prefix
   * @param {string} [prefix]
   */
  invalidate: (prefix) => {
    if (!prefix) {
      memoryStore.clear();
      return;
    }
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }
  },

  /**
   * Clear all client cache entries
   */
  clear: () => {
    memoryStore.clear();
  },
};

