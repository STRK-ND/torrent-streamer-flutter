// Database module exports
// This file exports all database-related functionality for easy importing

export {
  R1DatabaseClient,
  getR1Client,
  initializeDatabase,
  type User,
  type Session,
  type Account,
  type Verification,
  type Category,
  type Torrent,
  type TorrentFile,
  type TorrentTracker,
  type UserTorrentActivity
} from './r1';

export {
  KVCacheClient,
  TorrentCacheManager,
  getKVClient,
  getTorrentCacheManager,
  withCache,
  invalidateCachePattern,
  CACHE_CONFIGS,
  CACHE_KEYS,
  type CacheOptions,
  type CacheResult,
  getCache,
  putCache,
  deleteCache,
  clearCache
} from './kv';

// Re-export for backward compatibility and convenience
export { randomUUID } from 'crypto';

// Initialize database connection (call this early in your app lifecycle)
export async function initializeDatabaseConnection() {
  try {
    const db = getR1Client();
    await initializeDatabase();
    console.log('Database connection initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    throw error;
  }
}

// Health check utility
export async function checkDatabaseHealth() {
  const db = getR1Client();
  const kv = getKVClient();

  try {
    const [dbHealth, kvStats] = await Promise.all([
      db.healthCheck(),
      kv.stats()
    ]);

    return {
      database: {
        healthy: dbHealth,
        connection: await db.getConnectionInfo()
      },
      cache: {
        healthy: true, // KV is always healthy in this mock implementation
        stats: kvStats
      },
      overall: dbHealth
    };
  } catch (error) {
    return {
      database: {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      cache: {
        healthy: true,
        stats: null
      },
      overall: false
    };
  }
}

// Default export containing all database utilities
export default {
  r1: {
    client: R1DatabaseClient,
    getClient: getR1Client,
    initialize: initializeDatabaseConnection,
    health: checkDatabaseHealth
  },
  kv: {
    client: KVCacheClient,
    getClient: getKVClient,
    manager: TorrentCacheManager,
    getManager: getTorrentCacheManager,
    utils: {
      withCache,
      invalidateCachePattern
    }
  }
};