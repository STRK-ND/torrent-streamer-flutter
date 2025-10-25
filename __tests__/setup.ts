import { beforeEach, afterEach } from 'vitest';

// Test setup file for database and cache tests

beforeEach(() => {
  // Set up test environment variables
  process.env.CF_ACCOUNT_ID = 'test-account-id';
  process.env.R1_DATABASE = 'test-database';
  process.env.R1_API_TOKEN = 'test-api-token';
  process.env.KV_NAMESPACE_ID = 'test-kv-namespace';
  process.env.INGEST_API_KEY = 'test-ingest-key';
});

afterEach(() => {
  // Clean up test environment variables
  delete process.env.CF_ACCOUNT_ID;
  delete process.env.R1_DATABASE;
  delete process.env.R1_API_TOKEN;
  delete process.env.KV_NAMESPACE_ID;
  delete process.env.INGEST_API_KEY;
});

// Global test utilities
export const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockTorrent = {
  id: 'test-torrent-123',
  title: 'Test Torrent',
  description: 'A test torrent for integration testing',
  magnetLink: 'magnet:?xt=urn:btih:test123456789',
  infoHash: 'test123456789',
  size: 1024 * 1024 * 1024, // 1GB
  seeders: 10,
  leechers: 5,
  categoryId: 'test-category-123',
  posterUrl: 'https://example.com/poster.jpg',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockCategory = {
  id: 'test-category-123',
  name: 'Test Category',
  slug: 'test-category',
  description: 'A test category for integration testing',
  createdAt: new Date(),
  updatedAt: new Date(),
};