// Cloudflare KV caching module
// This module provides caching functionality for frequently accessed data

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  metadata?: Record<string, any>;
}

export interface CacheResult<T> {
  value: T | null;
  metadata?: Record<string, any>;
  cachedAt?: Date;
  expiresAt?: Date;
}

// Mock KV implementation for development
// In production, this would use actual Cloudflare KV bindings
export class KVCacheClient {
  private cache = new Map<string, { value: any; expiresAt: Date; metadata?: Record<string, any> }>();
  private defaultTTL: number = 3600; // 1 hour default

  constructor(
    private readonly config: {
      namespaceId?: string;
      defaultTTL?: number;
    } = {}
  ) {
    if (config.defaultTTL) {
      this.defaultTTL = config.defaultTTL;
    }
  }

  // Get a value from cache
  async get<T = any>(key: string): Promise<CacheResult<T>> {
    const cached = this.cache.get(key);

    if (!cached) {
      return { value: null };
    }

    // Check if the cache has expired
    if (cached.expiresAt.getTime() < Date.now()) {
      this.cache.delete(key);
      return { value: null };
    }

    return {
      value: cached.value,
      metadata: cached.metadata,
      cachedAt: new Date(cached.expiresAt.getTime() - this.defaultTTL * 1000),
      expiresAt: cached.expiresAt
    };
  }

  // Set a value in cache with optional TTL
  async put<T = any>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    this.cache.set(key, {
      value,
      expiresAt,
      metadata: options.metadata
    });
  }

  // Delete a value from cache
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  // Check if a key exists in cache (and hasn't expired)
  async exists(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result.value !== null;
  }

  // Get multiple values from cache
  async mget<T = any>(keys: string[]): Promise<Map<string, CacheResult<T>>> {
    const results = new Map<string, CacheResult<T>>();

    for (const key of keys) {
      results.set(key, await this.get<T>(key));
    }

    return results;
  }

  // Set multiple values in cache
  async mput<T = any>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    for (const { key, value, options } of entries) {
      await this.put(key, value, options);
    }
  }

  // Clear all cache (use with caution)
  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Delete expired entries (automatic cleanup)
  async cleanup(): Promise<number> {
    let deletedCount = 0;
    const now = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt.getTime() < now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  // Get cache statistics
  async stats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    sizeEstimate: number;
  }> {
    const now = Date.now();
    let expiredCount = 0;
    let sizeEstimate = 0;

    for (const cached of this.cache.values()) {
      if (cached.expiresAt.getTime() < now) {
        expiredCount++;
      }
      sizeEstimate += JSON.stringify(cached).length;
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries: expiredCount,
      sizeEstimate
    };
  }

  // Advanced caching methods for specific use cases

  // Cache with automatic refresh (stale-while-revalidate pattern)
  async getWithRefresh<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const result = await this.get<T>(key);

    if (result.value !== null) {
      // Return cached value immediately
      if (result.expiresAt && result.expiresAt.getTime() > Date.now()) {
        // Refresh in background if cache is getting stale
        const timeUntilExpiry = result.expiresAt.getTime() - Date.now();
        if (timeUntilExpiry < this.defaultTTL * 1000 * 0.1) { // Less than 10% of TTL remaining
          setTimeout(async () => {
            try {
              const freshValue = await refreshFn();
              await this.put(key, freshValue, options);
            } catch (error) {
              console.warn('Failed to refresh cache for key:', key, error);
            }
          }, 0);
        }
      }
      return result.value;
    }

    // No cache, fetch fresh value
    const freshValue = await refreshFn();
    await this.put(key, freshValue, options);
    return freshValue;
  }

  // Cache with fallback (try cache first, fallback to function if miss)
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const result = await this.get<T>(key);
    if (result.value !== null) {
      return result.value;
    }

    const freshValue = await fetchFn();
    await this.put(key, freshValue, options);
    return freshValue;
  }
}

// Predefined cache configurations and helper functions
export const CACHE_CONFIGS = {
  // Short-term cache for frequently changing data (5 minutes)
  SHORT_TERM: { ttl: 5 * 60 },

  // Medium-term cache for moderately changing data (1 hour)
  MEDIUM_TERM: { ttl: 60 * 60 },

  // Long-term cache for rarely changing data (24 hours)
  LONG_TERM: { ttl: 24 * 60 * 60 },

  // Extended cache for static data (7 days)
  EXTENDED: { ttl: 7 * 24 * 60 * 60 }
} as const;

// Cache key generators for consistent key naming
export const CACHE_KEYS = {
  // Torrent-related cache keys
  torrent: {
    byId: (id: string) => `torrent:${id}`,
    search: (query: string, limit: number, offset: number) =>
      `torrent:search:${encodeURIComponent(query)}:${limit}:${offset}`,
    latest: (limit: number, offset: number) => `torrent:latest:${limit}:${offset}`,
    byCategory: (categoryId: string, limit: number, offset: number) =>
      `torrent:category:${categoryId}:${limit}:${offset}`,
    metadata: (infoHash: string) => `torrent:metadata:${infoHash}`
  },

  // User-related cache keys
  user: {
    byId: (id: string) => `user:${id}`,
    byEmail: (email: string) => `user:email:${encodeURIComponent(email)}`,
    session: (token: string) => `session:${token}`,
    profile: (userId: string) => `user:profile:${userId}`,
    activities: (userId: string, limit: number, offset: number) =>
      `user:activities:${userId}:${limit}:${offset}`
  },

  // Category-related cache keys
  category: {
    byId: (id: string) => `category:${id}`,
    bySlug: (slug: string) => `category:slug:${encodeURIComponent(slug)}`,
    all: 'category:all'
  }
} as const;

// Specialized caching functions for the torrent application
export class TorrentCacheManager {
  constructor(private kv: KVCacheClient) {}

  // Cache torrent metadata
  async cacheTorrentMetadata(infoHash: string, metadata: any): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.torrent.metadata(infoHash),
      metadata,
      { ...CACHE_CONFIGS.LONG_TERM, metadata: { type: 'torrent_metadata' } }
    );
  }

  // Get cached torrent metadata
  async getTorrentMetadata(infoHash: string): Promise<any | null> {
    const result = await this.kv.get(CACHE_KEYS.torrent.metadata(infoHash));
    return result.value;
  }

  // Cache torrent search results
  async cacheTorrentSearch(
    query: string,
    limit: number,
    offset: number,
    results: any[]
  ): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.torrent.search(query, limit, offset),
      results,
      { ...CACHE_CONFIGS.SHORT_TERM, metadata: { type: 'search_results', query, limit, offset } }
    );
  }

  // Get cached torrent search results
  async getTorrentSearchResults(
    query: string,
    limit: number,
    offset: number
  ): Promise<any[] | null> {
    const result = await this.kv.get(CACHE_KEYS.torrent.search(query, limit, offset));
    return result.value;
  }

  // Cache latest torrents
  async cacheLatestTorrents(limit: number, offset: number, torrents: any[]): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.torrent.latest(limit, offset),
      torrents,
      { ...CACHE_CONFIGS.SHORT_TERM, metadata: { type: 'latest_torrents', limit, offset } }
    );
  }

  // Get cached latest torrents
  async getLatestTorrents(limit: number, offset: number): Promise<any[] | null> {
    const result = await this.kv.get(CACHE_KEYS.torrent.latest(limit, offset));
    return result.value;
  }

  // Cache category torrents
  async cacheCategoryTorrents(
    categoryId: string,
    limit: number,
    offset: number,
    torrents: any[]
  ): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.torrent.byCategory(categoryId, limit, offset),
      torrents,
      {
        ...CACHE_CONFIGS.MEDIUM_TERM,
        metadata: { type: 'category_torrents', categoryId, limit, offset }
      }
    );
  }

  // Get cached category torrents
  async getCategoryTorrents(
    categoryId: string,
    limit: number,
    offset: number
  ): Promise<any[] | null> {
    const result = await this.kv.get(CACHE_KEYS.torrent.byCategory(categoryId, limit, offset));
    return result.value;
  }

  // Cache user session
  async cacheUserSession(token: string, sessionData: any): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.user.session(token),
      sessionData,
      { ...CACHE_CONFIGS.MEDIUM_TERM, metadata: { type: 'user_session' } }
    );
  }

  // Get cached user session
  async getUserSession(token: string): Promise<any | null> {
    const result = await this.kv.get(CACHE_KEYS.user.session(token));
    return result.value;
  }

  // Invalidate user session (logout)
  async invalidateUserSession(token: string): Promise<void> {
    await this.kv.delete(CACHE_KEYS.user.session(token));
  }

  // Cache user data
  async cacheUser(userId: string, userData: any): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.user.byId(userId),
      userData,
      { ...CACHE_CONFIGS.MEDIUM_TERM, metadata: { type: 'user_data' } }
    );
  }

  // Get cached user data
  async getUser(userId: string): Promise<any | null> {
    const result = await this.kv.get(CACHE_KEYS.user.byId(userId));
    return result.value;
  }

  // Invalidate user cache (when user data changes)
  async invalidateUserCache(userId: string, email?: string): Promise<void> {
    await this.kv.delete(CACHE_KEYS.user.byId(userId));
    if (email) {
      await this.kv.delete(CACHE_KEYS.user.byEmail(email));
    }
  }

  // Cache all categories
  async cacheCategories(categories: any[]): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.category.all,
      categories,
      { ...CACHE_CONFIGS.LONG_TERM, metadata: { type: 'categories' } }
    );
  }

  // Get cached categories
  async getCategories(): Promise<any[] | null> {
    const result = await this.kv.get(CACHE_KEYS.category.all);
    return result.value;
  }

  // Cache category by slug
  async cacheCategoryBySlug(slug: string, categoryData: any): Promise<void> {
    await this.kv.put(
      CACHE_KEYS.category.bySlug(slug),
      categoryData,
      { ...CACHE_CONFIGS.LONG_TERM, metadata: { type: 'category' } }
    );
  }

  // Get cached category by slug
  async getCategoryBySlug(slug: string): Promise<any | null> {
    const result = await this.kv.get(CACHE_KEYS.category.bySlug(slug));
    return result.value;
  }

  // Perform cache cleanup
  async cleanup(): Promise<number> {
    return await this.kv.cleanup();
  }

  // Get cache statistics
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    sizeEstimate: number;
  }> {
    return await this.kv.stats();
  }
}

// Singleton instances
let kvClient: KVCacheClient | null = null;
let torrentCacheManager: TorrentCacheManager | null = null;

export function getKVClient(): KVCacheClient {
  if (!kvClient) {
    kvClient = new KVCacheClient({
      namespaceId: process.env.KV_NAMESPACE_ID,
      defaultTTL: 3600 // 1 hour default
    });
  }
  return kvClient;
}

export function getTorrentCacheManager(): TorrentCacheManager {
  if (!torrentCacheManager) {
    torrentCacheManager = new TorrentCacheManager(getKVClient());
  }
  return torrentCacheManager;
}

// Helper functions for common caching patterns
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {},
  kv: KVCacheClient = getKVClient()
): Promise<T> {
  return await kv.getOrFetch(key, fetchFn, options);
}

export async function invalidateCachePattern(
  pattern: string,
  kv: KVCacheClient = getKVClient()
): Promise<number> {
  // Note: In a real implementation, you might want to use key prefix listing
  // For now, this is a placeholder for cache invalidation logic
  console.warn(`Cache invalidation for pattern "${pattern}" not implemented`);
  return 0;
}

// Export convenience functions
export {
  getCache: (key: string) => getKVClient().get(key),
  putCache: (key: string, value: any, options?: CacheOptions) =>
    getKVClient().put(key, value, options),
  deleteCache: (key: string) => getKVClient().delete(key),
  clearCache: () => getKVClient().clear()
};