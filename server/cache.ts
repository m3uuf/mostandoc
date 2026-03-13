/**
 * Simple in-memory cache with TTL support.
 * Used for frequently accessed, rarely changed data like
 * platform settings, templates, tracking scripts, etc.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60000) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Get cached value or fetch it with the provided function
   */
  async getOrSet<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const existing = this.store.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      return existing.data as T;
    }

    const data = await fetchFn();
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  }

  /**
   * Get cached value (returns undefined if expired/missing)
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  /**
   * Set a value with TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Invalidate a specific key or pattern
   */
  invalidate(keyOrPrefix: string): void {
    if (keyOrPrefix.endsWith("*")) {
      const prefix = keyOrPrefix.slice(0, -1);
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          this.store.delete(key);
        }
      }
    } else {
      this.store.delete(keyOrPrefix);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    let active = 0;
    let expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (entry.expiresAt > now) active++;
      else expired++;
    }
    return { active, expired, total: this.store.size };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// Common TTL constants
export const CACHE_TTL = {
  SHORT: 30 * 1000,          // 30 seconds — search results
  MEDIUM: 5 * 60 * 1000,     // 5 minutes — platform settings, templates
  LONG: 30 * 60 * 1000,      // 30 minutes — tracking scripts, rarely changed data
  HOUR: 60 * 60 * 1000,      // 1 hour
};
