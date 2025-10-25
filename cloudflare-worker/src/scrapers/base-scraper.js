import { HttpClient } from '../utils/http-client.js';
import { parseFileSize, isVideoFile, extractInfoHash, cleanText, extractCategory, generateId, delay, retry } from '../utils/helpers.js';

/**
 * Base scraper class with common functionality
 */
export class BaseScraper {
  /**
   * @param {Object} config - Scraper configuration
   * @param {string} config.name - Scraper name
   * @param {string} config.baseUrl - Base URL
   * @param {number} [config.delay] - Delay between requests
   * @param {number} [config.maxRetries] - Maximum retry attempts
   * @param {Object} [config.headers] - Custom headers
   */
  constructor(config) {
    this.config = config;
    this.httpClient = new HttpClient(config.headers);
    this.stats = {
      totalPages: 0,
      totalTorrents: 0,
      successful: 0,
      failed: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Scrape torrents from the site
   * @param {Object} [options] - Scraping options
   * @param {string} [options.query] - Search query
   * @param {number} [options.maxPages] - Maximum pages to scrape
   * @returns {Promise<ScrapingResult>} Scraping result
   */
  async scrape(options = {}) {
    this.stats.startTime = new Date();

    try {
      const torrents = await this.scrapePages(options);
      this.stats.totalTorrents = torrents.length;
      this.stats.successful = torrents.length;

      this.stats.endTime = new Date();
      const duration = this.stats.endTime - this.stats.startTime;

      console.log(`${this.config.name}: Scraped ${torrents.length} torrents in ${duration}ms`);

      return {
        success: true,
        site: this.config.name,
        torrents,
        stats: this.stats,
      };
    } catch (error) {
      this.stats.failed = 1;
      this.stats.endTime = new Date();

      console.error(`${this.config.name}: Scraping failed:`, error.message);

      return {
        success: false,
        site: this.config.name,
        torrents: [],
        error: error.message,
        stats: this.stats,
      };
    }
  }

  /**
   * Scrape multiple pages (to be implemented by subclasses)
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Array of torrent data
   */
  async scrapePages(options) {
    throw new Error('scrapePages must be implemented by subclass');
  }

  /**
   * Parse torrent data from element (to be implemented by subclasses)
   * @param {Element} element - DOM element to parse
   * @returns {Object|null} Torrent data or null if parsing failed
   */
  parseTorrentFromElement(element) {
    throw new Error('parseTorrentFromElement must be implemented by subclass');
  }

  /**
   * Extract torrent files from details page
   * @param {string} detailsUrl - URL of details page
   * @returns {Promise<Array>} Array of file data
   */
  async extractFiles(detailsUrl) {
    // Default implementation - can be overridden by subclasses
    return [];
  }

  /**
   * Extract trackers from details page
   * @param {string} detailsUrl - URL of details page
   * @returns {Promise<Array>} Array of tracker URLs
   */
  async extractTrackers(detailsUrl) {
    // Default implementation - can be overridden by subclasses
    return [];
  }

  /**
   * Validate and normalize torrent data
   * @param {Object} torrentData - Raw torrent data
   * @returns {Object|null} Normalized torrent data or null if invalid
   */
  validateAndNormalizeTorrent(torrentData) {
    if (!torrentData || !torrentData.title) {
      return null;
    }

    // Normalize data
    const normalized = {
      id: generateId(),
      title: cleanText(torrentData.title),
      description: torrentData.description ? cleanText(torrentData.description) : null,
      magnetLink: torrentData.magnetLink || null,
      infoHash: torrentData.infoHash || (torrentData.magnetLink ? extractInfoHash(torrentData.magnetLink) : null),
      size: torrentData.size || 0,
      seeders: Math.max(0, parseInt(torrentData.seeders) || 0),
      leechers: Math.max(0, parseInt(torrentData.leechers) || 0),
      categoryName: torrentData.categoryName || extractCategory(torrentData.title, torrentData.tags),
      posterUrl: torrentData.posterUrl || null,
      files: torrentData.files || [],
      trackers: torrentData.trackers || [],
    };

    // Validate required fields
    if (!normalized.title || normalized.title.length < 3) {
      return null;
    }

    // Ensure we have either magnet link or info hash
    if (!normalized.magnetLink && !normalized.infoHash) {
      return null;
    }

    // Validate file data
    if (normalized.files && Array.isArray(normalized.files)) {
      normalized.files = normalized.files
        .filter(file => file && file.name && file.size > 0)
        .map(file => ({
          id: generateId(),
          name: cleanText(file.name),
          path: file.path || null,
          size: file.size || 0,
          index: file.index || null,
          isVideo: file.isVideo || isVideoFile(file.name),
        }));
    }

    // Validate tracker data
    if (normalized.trackers && Array.isArray(normalized.trackers)) {
      normalized.trackers = normalized.trackers
        .filter(tracker => tracker && tracker.url && this.isValidTrackerUrl(tracker.url))
        .map(tracker => ({
          url: tracker.url.trim(),
          isActive: tracker.isActive !== false,
        }));
    }

    return normalized;
  }

  /**
   * Check if tracker URL is valid
   * @param {string} url - Tracker URL
   * @returns {boolean} Whether URL is valid
   */
  isValidTrackerUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const urlObj = new URL(url);
      const validProtocols = ['http:', 'https:', 'udp:', 'ws:', 'wss:'];
      return validProtocols.includes(urlObj.protocol);
    } catch (e) {
      return false;
    }
  }

  /**
   * Make request with delay and retry logic
   * @param {Function} requestFn - Request function
   * @returns {Promise<*>} Request result
   */
  async makeRequest(requestFn) {
    // Add delay if configured
    if (this.config.delay && this.config.delay > 0) {
      await delay(this.config.delay);
    }

    // Add retry logic
    const maxRetries = this.config.maxRetries || 3;
    return retry(requestFn, maxRetries, 1000);
  }

  /**
   * Get scraping statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalPages: 0,
      totalTorrents: 0,
      successful: 0,
      failed: 0,
      startTime: null,
      endTime: null,
    };
  }
}