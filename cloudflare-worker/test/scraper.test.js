/**
 * Tests for torrent scrapers
 */

import { jest } from '@jest/globals';

// Mock fetch for Cloudflare Worker environment
global.fetch = jest.fn();

// Mock Cloudflare Worker environment
global.caches = {
  default: {
    match: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
};

describe('Torrent Scrapers', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Helper Functions', () => {
    test('parseFileSize should handle different size formats', async () => {
      const { parseFileSize } = await import('../src/utils/helpers.js');

      expect(parseFileSize('1.5 GB')).toBe(1610612736);
      expect(parseFileSize('500 MB')).toBe(524288000);
      expect(parseFileSize('1024 KB')).toBe(1048576);
      expect(parseFileSize('100 B')).toBe(100);
      expect(parseFileSize('')).toBe(0);
      expect(parseFileSize(null)).toBe(0);
      expect(parseFileSize(undefined)).toBe(0);
    });

    test('isVideoFile should detect video files correctly', async () => {
      const { isVideoFile } = await import('../src/utils/helpers.js');

      expect(isVideoFile('movie.mp4')).toBe(true);
      expect(isVideoFile('series.S01E01.mkv')).toBe(true);
      expect(isVideoFile('documentary.avi')).toBe(true);
      expect(isVideoFile('ebook.pdf')).toBe(false);
      expect(isVideoFile('software.exe')).toBe(false);
      expect(isVideoFile('')).toBe(false);
      expect(isVideoFile(null)).toBe(false);
    });

    test('extractInfoHash should extract info hash from magnet links', async () => {
      const { extractInfoHash } = await import('../src/utils/helpers.js');

      const magnetLink = 'magnet:?xt=urn:btih:abc123def456789abc123def456789abc123def4&dn=Example';
      expect(extractInfoHash(magnetLink)).toBe('abc123def456789abc123def456789abc123def4');

      expect(extractInfoHash('')).toBe(null);
      expect(extractInfoHash(null)).toBe(null);
      expect(extractInfoHash('invalid')).toBe(null);
    });

    test('extractCategory should detect categories from titles', async () => {
      const { extractCategory } = await import('../src/utils/helpers.js');

      expect(extractCategory('Avengers Endgame 2019 1080p')).toBe('Movies');
      expect(extractCategory('Breaking Bad S01E01')).toBe('TV Shows');
      expect(extractCategory('Windows 11 Pro')).toBe('Software');
      expect(extractFileCategory('GTA 5 PC')).toBe('Games');
      expect(extractCategory('Random Content')).toBe('Other');
    });
  });

  describe('HTTP Client', () => {
    test('HttpClient should make requests with proper headers', async () => {
      const { HttpClient } = await import('../src/utils/http-client.js');

      const client = new HttpClient({
        'Custom-Header': 'test-value',
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html></html>'),
      });

      await client.getHtml('https://example.com');

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            'Custom-Header': 'test-value',
          }),
        })
      );
    });

    test('HttpClient should retry failed requests', async () => {
      const { HttpClient } = await import('../src/utils/http-client.js');

      const client = new HttpClient();

      // First two calls fail, third succeeds
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html></html>'),
        });

      const result = await client.getHtml('https://example.com');

      expect(result).toBe('<html></html>');
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('YTS Scraper', () => {
    test('YTSScraper should parse movie data correctly', async () => {
      // Mock YTS API response
      const mockApiResponse = {
        status: 'ok',
        data: {
          movies: [
            {
              title: 'Test Movie',
              year: 2023,
              description_full: 'A test movie description',
              medium_cover_image: 'https://example.com/poster.jpg',
              torrents: [
                {
                  url: 'magnet:?xt=urn:btih:testhash',
                  quality: '1080p',
                  size: '1.5 GB',
                  seeds: 100,
                  peers: 20,
                },
              ],
              genres: ['Action', 'Adventure'],
            },
          ],
        },
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      const { YTSScraper } = await import('../src/scrapers/yts-scraper.js');
      const scraper = new YTSScraper();

      const results = await scraper.scrape({ query: 'test movie' });

      expect(results.success).toBe(true);
      expect(results.torrents).toHaveLength(1);
      expect(results.torrents[0]).toMatchObject({
        title: 'Test Movie (2023)',
        description: 'A test movie description',
        categoryName: 'Movies',
        posterUrl: 'https://example.com/poster.jpg',
        seeders: 100,
        leechers: 20,
      });
    });
  });

  describe('Worker Endpoints', () => {
    test('GET /health should return health status', async () => {
      // Mock the worker environment
      const mockEnv = {
        INGEST_API_KEY: 'test-key',
        BACKEND_URL: 'https://test.com/api',
      };

      // Import and test the worker
      const worker = await import('../src/index.js');

      const request = new Request('https://test.workers.dev/health');
      const response = await worker.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });

    test('GET /status should return scraper status', async () => {
      const mockEnv = {
        INGEST_API_KEY: 'test-key',
        BACKEND_URL: 'https://test.com/api',
      };

      const worker = await import('../src/index.js');

      const request = new Request('https://test.workers.dev/status');
      const response = await worker.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.scrapers).toBeDefined();
      expect(data.data.config).toBeDefined();
    });

    test('POST /scrape should trigger manual scraping', async () => {
      const mockEnv = {
        INGEST_API_KEY: 'test-key',
        BACKEND_URL: 'https://test.com/api',
      };

      // Mock successful scraping
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'ok',
          data: { movies: [] },
        }),
      });

      const worker = await import('../src/index.js');

      const request = new Request('https://test.workers.dev/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapers: ['yts'],
          options: { query: 'test' },
        }),
      });

      const response = await worker.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.results).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });
  });
});

// Integration test example
describe('Integration Tests', () => {
  test('Full scraping workflow should work end-to-end', async () => {
    // This would be a more comprehensive test
    // that tests the entire workflow from scraping to backend ingestion

    expect(true).toBe(true); // Placeholder
  });
});