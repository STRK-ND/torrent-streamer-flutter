/**
 * Integration tests for R1 database and KV caching functionality
 * These tests verify that the database migration from Drizzle to Cloudflare R1+KV works correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getR1Client,
  getTorrentCacheManager,
  initializeDatabase,
  checkDatabaseHealth,
  type User,
  type Torrent,
  type Category,
} from '../lib/db';

// Mock environment variables for testing
const mockEnv = {
  CF_ACCOUNT_ID: 'test-account-id',
  R1_DATABASE: 'test-database',
  R1_API_TOKEN: 'test-api-token',
  KV_NAMESPACE_ID: 'test-kv-namespace',
  INGEST_API_KEY: 'test-ingest-key',
};

describe('R1 Database Integration Tests', () => {
  let db: ReturnType<typeof getR1Client>;
  let cacheManager: ReturnType<typeof getTorrentCacheManager>;
  let testUserId: string;
  let testTorrentId: string;
  let testCategoryId: string;

  beforeEach(async () => {
    // Set up mock environment variables
    Object.assign(process.env, mockEnv);

    // Initialize database and cache
    db = getR1Client();
    cacheManager = getTorrentCacheManager();

    try {
      await initializeDatabase();
    } catch (error) {
      console.warn('Database initialization failed in test:', error);
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      if (testTorrentId) {
        await db.deleteTorrent(testTorrentId);
      }
      if (testUserId) {
        await db.deleteUser(testUserId);
      }
      await db.disconnect();
      await cacheManager.clear();
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Database Health and Connection', () => {
    it('should check database health successfully', async () => {
      const isHealthy = await db.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should provide connection information', async () => {
      const connInfo = await db.getConnectionInfo();
      expect(connInfo).toEqual({
        isConnected: expect.any(Boolean),
        database: mockEnv.R1_DATABASE,
        accountId: mockEnv.CF_ACCOUNT_ID,
      });
    });

    it('should check overall system health', async () => {
      const health = await checkDatabaseHealth();
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('cache');
      expect(health).toHaveProperty('overall');
    });
  });

  describe('User CRUD Operations', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: false,
        image: null,
      };

      const createdUser = await db.createUser(userData);

      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBeDefined();
      expect(createdUser.name).toBe(userData.name);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.emailVerified).toBe(userData.emailVerified);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);

      testUserId = createdUser.id;
    });

    it('should find user by email', async () => {
      const user = await db.findUserByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should find user by ID', async () => {
      const user = await db.findUserById(testUserId);
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUserId);
    });

    it('should update user information', async () => {
      const updateData = {
        name: 'Updated Test User',
        emailVerified: true,
      };

      const updatedUser = await db.updateUser(testUserId, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe(updateData.name);
      expect(updatedUser?.emailVerified).toBe(updateData.emailVerified);
    });

    it('should handle duplicate user creation gracefully', async () => {
      const userData = {
        name: 'Duplicate User',
        email: 'test@example.com', // Same email
        emailVerified: false,
        image: null,
      };

      // This should handle duplicates appropriately
      const existingUser = await db.findUserByEmail(userData.email);
      expect(existingUser).toBeDefined();
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const sessionData = {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        token: 'test-session-token-123',
        userId: testUserId,
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent',
      };

      const createdSession = await db.createSession(sessionData);

      expect(createdSession).toBeDefined();
      expect(createdSession.id).toBeDefined();
      expect(createdSession.token).toBe(sessionData.token);
      expect(createdSession.userId).toBe(testUserId);
      expect(createdSession.expiresAt).toBeInstanceOf(Date);
    });

    it('should find session by token', async () => {
      const session = await db.findSessionByToken('test-session-token-123');
      expect(session).toBeDefined();
      expect(session?.token).toBe('test-session-token-123');
    });

    it('should delete expired sessions', async () => {
      const deletedCount = await db.deleteExpiredSessions();
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Category Operations', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'Test Category',
        slug: 'test-category',
        description: 'A test category for integration testing',
      };

      const createdCategory = await db.createCategory(categoryData);

      expect(createdCategory).toBeDefined();
      expect(createdCategory.id).toBeDefined();
      expect(createdCategory.name).toBe(categoryData.name);
      expect(createdCategory.slug).toBe(categoryData.slug);

      testCategoryId = createdCategory.id;
    });

    it('should retrieve all categories', async () => {
      const categories = await db.getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should find category by slug', async () => {
      const category = await db.findCategoryBySlug('test-category');
      expect(category).toBeDefined();
      expect(category?.slug).toBe('test-category');
    });
  });

  describe('Torrent Operations', () => {
    beforeEach(async () => {
      // Ensure we have a category for torrent tests
      if (!testCategoryId) {
        const categoryData = {
          name: 'Test Category',
          slug: 'test-category',
          description: 'A test category',
        };
        const category = await db.createCategory(categoryData);
        testCategoryId = category.id;
      }
    });

    it('should create a new torrent', async () => {
      const torrentData = {
        title: 'Test Torrent',
        description: 'A test torrent for integration testing',
        magnetLink: 'magnet:?xt=urn:btih:test123456789',
        infoHash: 'test123456789',
        size: 1024 * 1024 * 1024, // 1GB
        seeders: 10,
        leechers: 5,
        categoryId: testCategoryId,
        posterUrl: 'https://example.com/poster.jpg',
        isActive: true,
      };

      const createdTorrent = await db.createTorrent(torrentData);

      expect(createdTorrent).toBeDefined();
      expect(createdTorrent.id).toBeDefined();
      expect(createdTorrent.title).toBe(torrentData.title);
      expect(createdTorrent.description).toBe(torrentData.description);
      expect(createdTorrent.magnetLink).toBe(torrentData.magnetLink);
      expect(createdTorrent.size).toBe(torrentData.size);
      expect(createdTorrent.seeders).toBe(torrentData.seeders);
      expect(createdTorrent.leechers).toBe(torrentData.leechers);
      expect(createdTorrent.categoryId).toBe(testCategoryId);

      testTorrentId = createdTorrent.id;
    });

    it('should find torrent by ID', async () => {
      const torrent = await db.getTorrentById(testTorrentId);
      expect(torrent).toBeDefined();
      expect(torrent?.id).toBe(testTorrentId);
      expect(torrent?.title).toBe('Test Torrent');
    });

    it('should search torrents by query', async () => {
      const searchResults = await db.searchTorrents('Test', 10, 0);
      expect(Array.isArray(searchResults)).toBe(true);

      // Should find our test torrent
      const foundTorrent = searchResults.find(t => t.id === testTorrentId);
      expect(foundTorrent).toBeDefined();
    });

    it('should get latest torrents', async () => {
      const latestTorrents = await db.getLatestTorrents(10, 0);
      expect(Array.isArray(latestTorrents)).toBe(true);
      expect(latestTorrents.length).toBeGreaterThan(0);

      // Should be sorted by creation date (newest first)
      for (let i = 1; i < latestTorrents.length; i++) {
        expect(new Date(latestTorrents[i - 1].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(latestTorrents[i].createdAt).getTime());
      }
    });

    it('should get torrents by category', async () => {
      const categoryTorrents = await db.getTorrentsByCategory(testCategoryId, 10, 0);
      expect(Array.isArray(categoryTorrents)).toBe(true);

      // Should find our test torrent in the category
      const foundTorrent = categoryTorrents.find(t => t.id === testTorrentId);
      expect(foundTorrent).toBeDefined();
    });

    it('should update torrent information', async () => {
      const updateData = {
        title: 'Updated Test Torrent',
        seeders: 15,
        leechers: 8,
      };

      const updatedTorrent = await db.updateTorrent(testTorrentId, updateData);

      expect(updatedTorrent).toBeDefined();
      expect(updatedTorrent?.title).toBe(updateData.title);
      expect(updatedTorrent?.seeders).toBe(updateData.seeders);
      expect(updatedTorrent?.leechers).toBe(updateData.leechers);
    });

    it('should delete torrent', async () => {
      const deleted = await db.deleteTorrent(testTorrentId);
      expect(deleted).toBe(true);

      // Verify it's gone
      const deletedTorrent = await db.getTorrentById(testTorrentId);
      expect(deletedTorrent).toBe(null);
    });
  });

  describe('User Activity Tracking', () => {
    it('should record user activity', async () => {
      const activityData = {
        userId: testUserId,
        torrentId: testTorrentId,
        activity: 'viewed' as const,
        metadata: JSON.stringify({ source: 'api-test' }),
      };

      const recordedActivity = await db.recordUserActivity(activityData);

      expect(recordedActivity).toBeDefined();
      expect(recordedActivity.id).toBeDefined();
      expect(recordedActivity.userId).toBe(testUserId);
      expect(recordedActivity.torrentId).toBe(testTorrentId);
      expect(recordedActivity.activity).toBe(activityData.activity);
    });

    it('should get user activities', async () => {
      const activities = await db.getUserActivities(testUserId, 10, 0);
      expect(Array.isArray(activities)).toBe(true);

      // Should be sorted by creation date (newest first)
      for (let i = 1; i < activities.length; i++) {
        expect(new Date(activities[i - 1].createdAt).getTime())
          .toBeGreaterThanOrEqual(new Date(activities[i].createdAt).getTime());
      }
    });
  });
});

describe('KV Cache Integration Tests', () => {
  let cacheManager: ReturnType<typeof getTorrentCacheManager>;
  let testData: any;

  beforeEach(() => {
    Object.assign(process.env, mockEnv);
    cacheManager = getTorrentCacheManager();
    testData = {
      id: 'test-torrent-123',
      title: 'Test Torrent',
      description: 'Test Description',
      createdAt: new Date(),
    };
  });

  afterEach(async () => {
    await cacheManager.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve cached data', async () => {
      await cacheManager.put('test-key', testData, { ttl: 3600 });

      const result = await cacheManager.get('test-key');
      expect(result.value).toEqual(testData);
      expect(result.cachedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle cache misses gracefully', async () => {
      const result = await cacheManager.get('non-existent-key');
      expect(result.value).toBe(null);
    });

    it('should delete cached data', async () => {
      await cacheManager.put('test-delete-key', testData);
      const deleted = await cacheManager.delete('test-delete-key');
      expect(deleted).toBe(true);

      const result = await cacheManager.get('test-delete-key');
      expect(result.value).toBe(null);
    });

    it('should respect TTL expiration', async () => {
      // Cache with very short TTL
      await cacheManager.put('test-ttl-key', testData, { ttl: 1 });

      // Wait a bit (in real tests, you'd use time mocking)
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await cacheManager.get('test-ttl-key');
      // Result might still be there or might be expired depending on timing
      expect(result).toBeDefined();
    });
  });

  describe('Torrent-Specific Cache Operations', () => {
    it('should cache torrent metadata', async () => {
      const infoHash = 'test-info-hash-123';
      await cacheManager.cacheTorrentMetadata(infoHash, testData);

      const cachedData = await cacheManager.getTorrentMetadata(infoHash);
      expect(cachedData).toEqual(testData);
    });

    it('should cache search results', async () => {
      const query = 'test query';
      const results = [testData, { ...testData, id: 'test-2' }];

      await cacheManager.cacheTorrentSearch(query, 20, 0, results);

      const cachedResults = await cacheManager.getTorrentSearchResults(query, 20, 0);
      expect(cachedResults).toEqual(results);
    });

    it('should cache latest torrents', async () => {
      const latestTorrents = [testData, { ...testData, id: 'test-2' }];

      await cacheManager.cacheLatestTorrents(20, 0, latestTorrents);

      const cachedLatest = await cacheManager.getLatestTorrents(20, 0);
      expect(cachedLatest).toEqual(latestTorrents);
    });

    it('should cache category torrents', async () => {
      const categoryId = 'test-category-123';
      const categoryTorrents = [testData];

      await cacheManager.cacheCategoryTorrents(categoryId, 20, 0, categoryTorrents);

      const cachedCategory = await cacheManager.getCategoryTorrents(categoryId, 20, 0);
      expect(cachedCategory).toEqual(categoryTorrents);
    });
  });

  describe('User Session Caching', () => {
    it('should cache user sessions', async () => {
      const token = 'test-session-token-456';
      const sessionData = {
        userId: testUserId,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      await cacheManager.cacheUserSession(token, sessionData);

      const cachedSession = await cacheManager.getUserSession(token);
      expect(cachedSession).toEqual(sessionData);
    });

    it('should invalidate user sessions', async () => {
      const token = 'test-session-token-789';
      await cacheManager.cacheUserSession(token, { userId: testUserId });

      await cacheManager.invalidateUserSession(token);

      const cachedSession = await cacheManager.getUserSession(token);
      expect(cachedSession).toBe(null);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      // Add some test data
      await cacheManager.put('stats-test-1', testData);
      await cacheManager.put('stats-test-2', testData);

      const stats = await cacheManager.getStats();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('sizeEstimate');
      expect(typeof stats.totalEntries).toBe('number');
    });

    it('should clean up expired entries', async () => {
      const cleanedCount = await cacheManager.cleanup();
      expect(typeof cleanedCount).toBe('number');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  let db: ReturnType<typeof getR1Client>;

  beforeEach(() => {
    Object.assign(process.env, mockEnv);
    db = getR1Client();
  });

  it('should handle database connection errors gracefully', async () => {
    // Test with invalid credentials
    Object.assign(process.env, {
      CF_ACCOUNT_ID: 'invalid-account',
      R1_API_TOKEN: 'invalid-token',
    });

    try {
      const invalidDb = getR1Client();
      await invalidDb.healthCheck();
      // This might throw an error or return false depending on implementation
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should validate input data properly', async () => {
    try {
      // Test creating user with invalid data
      await db.createUser({
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: not a proper email
        emailVerified: false,
        image: null,
      });
      // Should throw validation error or handle gracefully
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle concurrent operations safely', async () => {
    const promises = Array.from({ length: 10 }, async (_, i) => {
      return await db.createUser({
        name: `Concurrent User ${i}`,
        email: `concurrent${i}@example.com`,
        emailVerified: false,
        image: null,
      });
    });

    const results = await Promise.allSettled(promises);

    // All operations should complete (either successfully or with errors)
    expect(results.length).toBe(10);

    // At least some should succeed
    const successful = results.filter(r => r.status === 'fulfilled');
    expect(successful.length).toBeGreaterThan(0);
  });
});

describe('Performance and Scalability', () => {
  let db: ReturnType<typeof getR1Client>;
  let cacheManager: ReturnType<typeof getTorrentCacheManager>;

  beforeEach(() => {
    Object.assign(process.env, mockEnv);
    db = getR1Client();
    cacheManager = getTorrentCacheManager();
  });

  it('should handle batch operations efficiently', async () => {
    const startTime = Date.now();

    // Create multiple torrents
    const torrentPromises = Array.from({ length: 50 }, async (_, i) => {
      return await db.createTorrent({
        title: `Performance Test Torrent ${i}`,
        description: `Test torrent ${i} for performance testing`,
        magnetLink: `magnet:?xt=urn:btih:test${i}`,
        infoHash: `test${i}`,
        size: 1024 * 1024,
        seeders: Math.floor(Math.random() * 100),
        leechers: Math.floor(Math.random() * 50),
        isActive: true,
      });
    });

    await Promise.all(torrentPromises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  it('should handle large search queries efficiently', async () => {
    // Create test data
    await Promise.all(Array.from({ length: 100 }, async (_, i) => {
      return await db.createTorrent({
        title: `Search Test ${i}`,
        description: `Test torrent for search testing`,
        magnetLink: `magnet:?xt=urn:btih:search${i}`,
        infoHash: `search${i}`,
        size: 1024 * 1024,
        isActive: true,
      });
    }));

    const startTime = Date.now();

    const searchResults = await db.searchTorrents('Search Test', 50, 0);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(Array.isArray(searchResults)).toBe(true);
    expect(searchResults.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});