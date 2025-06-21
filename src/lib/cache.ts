type CacheItem<T> = {
  data: T;
  expiresAt: number;
  timestamp: number; // When the item was added to cache
};

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 3 hours)
}

interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTtl: number = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

  constructor() {
    // Run cleanup every 3 hours
    setInterval(() => this.cleanup(), 3 * 60 * 60 * 1000);
  }

  /**
   * Get data from cache if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Get data and metadata from cache
   */
  getWithMetadata<T>(key: string): { data: T, timestamp: number } | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return { 
      data: item.data as T,
      timestamp: item.timestamp
    };
  }

  /**
   * Set data in cache with a TTL (time to live)
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTtl;
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
      timestamp: now
    });
  }

  /**
   * Remove a specific item from cache
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove all items from cache that match a prefix
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get metadata about a cached item
   */
  getMetadata(key: string): CacheMetadata | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    return {
      timestamp: item.timestamp,
      expiresAt: item.expiresAt
    };
  }

  /**
   * Check if an item exists in the cache and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove an item from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export a singleton instance
export const cacheManager = new CacheManager(); 