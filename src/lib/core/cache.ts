interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateExact(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const queryCache = new QueryCache();

// Helper function to use with cached queries
export const withCache = async <T>(
  cacheKey: string,
  queryFunction: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const skipCache = process.env.SKIP_CACHE === 'true' || process.env.SKIP_CACHE === '1';
  const debugCache = process.env.NODE_ENV === 'development' && process.env.DEBUG_CACHE === 'true';

  if (skipCache) {
    if (debugCache) {
      console.log(`Cache bypassed (SKIP_CACHE) for key: ${cacheKey}`);
    }
    return queryFunction();
  }
  // Try to get from cache first
  const cached = queryCache.get<T>(cacheKey);
  if (cached) {
    if (debugCache) {
      console.log(`Cache hit for key: ${cacheKey}`);
    }
    return cached;
  }

  // If not in cache, execute query and cache result
  if (debugCache) {
    console.log(`Cache miss for key: ${cacheKey}`);
  }

  const result = await queryFunction();
  queryCache.set(cacheKey, result, ttl);
  return result;
};