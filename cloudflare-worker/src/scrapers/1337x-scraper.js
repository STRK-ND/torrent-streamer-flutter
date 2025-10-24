import { BaseScraper } from './base-scraper.js';
import { parseFileSize, cleanText } from '../utils/helpers.js';

/**
 * 1337x scraper - example implementation for various torrent types
 * Note: This is a simplified example for demonstration purposes
 */
export class Scraper1337x extends BaseScraper {
  constructor() {
    super({
      name: '1337x',
      baseUrl: 'https://1337x.to',
      delay: 3000, // 3 seconds delay to avoid being blocked
      maxRetries: 5,
      headers: {
        'Referer': 'https://1337x.to/',
        'Origin': 'https://1337x.to',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  /**
   * Scrape torrents from 1337x
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Array of torrent data
   */
  async scrapePages(options = {}) {
    const { maxPages = 3, query } = options;
    const torrents = [];

    try {
      if (query) {
        await this.scrapeSearchResults(query, torrents, maxPages);
      } else {
        await this.scrapePopularTorrents(torrents, maxPages);
      }
    } catch (error) {
      console.error('1337x scraping error:', error);
      throw error;
    }

    return torrents;
  }

  /**
   * Scrape search results
   * @param {string} query - Search query
   * @param {Array} torrents - Array to store results
   * @param {number} maxPages - Maximum pages to scrape
   */
  async scrapeSearchResults(query, torrents, maxPages) {
    for (let page = 1; page <= maxPages; page++) {
      const searchUrl = `${this.config.baseUrl}/search/${encodeURIComponent(query)}/${page}/`;

      const response = await this.makeRequest(() => this.httpClient.get(searchUrl));

      if (!response.ok) {
        console.error(`1337x search page ${page} failed: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const pageTorrents = await this.parseTorrentList(html);

      for (const torrentData of pageTorrents) {
        if (torrentData) {
          torrents.push(torrentData);
        }
      }

      this.stats.totalPages++;

      // If no results found, break
      if (pageTorrents.length === 0) {
        break;
      }
    }
  }

  /**
   * Scrape popular torrents
   * @param {Array} torrents - Array to store results
   * @param {number} maxPages - Maximum pages to scrape
   */
  async scrapePopularTorrents(torrents, maxPages) {
    const categories = [
      { name: 'Movies', url: '/movies' },
      { name: 'TV', url: '/tv' },
      { name: 'Games', url: '/games' },
      { name: 'Applications', url: '/apps' },
      { name: 'Music', url: '/music' },
      { name: 'Documentaries', url: '/documentaries' },
      { name: 'Anime', url: '/anime' },
      { name: 'Other', url: '/other' },
    ];

    for (const category of categories) {
      try {
        const categoryUrl = `${this.config.baseUrl}${category.url}/`;
        const response = await this.makeRequest(() => this.httpClient.get(categoryUrl));

        if (!response.ok) {
          console.error(`1337x category ${category.name} failed: ${response.status}`);
          continue;
        }

        const html = await response.text();
        const categoryTorrents = await this.parseTorrentList(html, category.name);

        for (const torrentData of categoryTorrents) {
          if (torrentData) {
            torrents.push(torrentData);
          }
        }
      } catch (error) {
        console.error(`Error scraping ${category.name}:`, error);
      }
    }
  }

  /**
   * Parse torrent list from HTML
   * @param {string} html - HTML content
   * @param {string} [categoryName] - Category name
   * @returns {Promise<Array>} Array of torrent data
   */
  async parseTorrentList(html, categoryName = null) {
    const torrents = [];

    try {
      // Note: In a real implementation, you would use a proper HTML parser
      // Since we're in a Cloudflare Worker, we'll use regex for simplicity
      // In production, you might want to use a different approach

      // Extract table rows with torrent data
      const rowRegex = /<tr>.*?<\/tr>/gs;
      const rows = html.match(rowRegex) || [];

      for (const row of rows.slice(0, 25)) { // Limit to first 25 results
        const torrentData = await this.parseTorrentFromRow(row, categoryName);
        if (torrentData) {
          torrents.push(torrentData);
        }
      }
    } catch (error) {
      console.error('Error parsing torrent list:', error);
    }

    return torrents;
  }

  /**
   * Parse torrent data from table row
   * @param {string} row - HTML row content
   * @param {string} [categoryName] - Category name
   * @returns {Promise<Object|null>} Torrent data
   */
  async parseTorrentFromRow(row, categoryName = null) {
    try {
      // Extract title
      const titleMatch = row.match(/<a[^>]*href="\/torrent\/(\d+)\/([^"]*)"[^>]*>([^<]*)<\/a>/i);
      if (!titleMatch) return null;

      const torrentId = titleMatch[1];
      const title = cleanText(titleMatch[3]);

      // Extract seeders, leechers, and size
      const seedersMatch = row.match(/<td[^>]*class="seeders"[^>]*>(\d+)<\/td>/i);
      const leechersMatch = row.match(/<td[^>]*class="leechers"[^>]*>(\d+)<\/td>/i);
      const sizeMatch = row.match(/<td[^>]*class="size"[^>]*>([^<]*)<\/td>/i);

      const seeders = seedersMatch ? parseInt(seedersMatch[1]) : 0;
      const leechers = leechersMatch ? parseInt(leechersMatch[1]) : 0;
      const size = sizeMatch ? parseFileSize(sizeMatch[1]) : 0;

      // Get detailed information from torrent page
      const detailUrl = `${this.config.baseUrl}/torrent/${torrentId}/`;
      const details = await this.extractTorrentDetails(detailUrl);

      const torrentData = {
        title,
        description: details.description,
        magnetLink: details.magnetLink,
        infoHash: details.infoHash,
        size,
        seeders,
        leechers,
        categoryName: categoryName || details.categoryName,
        posterUrl: details.posterUrl,
        files: details.files,
        trackers: details.trackers,
      };

      return this.validateAndNormalizeTorrent(torrentData);
    } catch (error) {
      console.error('Error parsing torrent row:', error);
      return null;
    }
  }

  /**
   * Extract detailed information from torrent page
   * @param {string} detailUrl - Torrent detail page URL
   * @returns {Promise<Object>} Detailed torrent information
   */
  async extractTorrentDetails(detailUrl) {
    try {
      const response = await this.makeRequest(() => this.httpClient.get(detailUrl));

      if (!response.ok) {
        return {};
      }

      const html = await response.text();

      // Extract magnet link
      const magnetMatch = html.match(/<a[^>]*href="(magnet:[^"]*)"[^>]*>/i);
      const magnetLink = magnetMatch ? magnetMatch[1] : null;

      // Extract description
      const descMatch = html.match(/<div[^>]*class="description"[^>]*>([\s\S]*?)<\/div>/i);
      const description = descMatch ? cleanText(descMatch[1].replace(/<[^>]*>/g, '')) : null;

      // Extract poster
      const posterMatch = html.match(/<img[^>]*class="torrent-poster"[^>]*src="([^"]*)"[^>]*>/i);
      const posterUrl = posterMatch ? posterMatch[1] : null;

      // Extract category from title or breadcrumbs
      const categoryMatch = html.match(/<ul[^>]*class="breadcrumb"[^>]*>.*<li[^>]*class="active"[^>]*>([^<]*)<\/li>/i);
      const categoryName = categoryMatch ? cleanText(categoryMatch[1]) : null;

      // Extract file list (simplified)
      const files = await this.extractFilesFromHtml(html);

      return {
        magnetLink,
        description,
        posterUrl,
        categoryName,
        files,
        trackers: [], // Trackers are usually in the magnet link
      };
    } catch (error) {
      console.error('Error extracting torrent details:', error);
      return {};
    }
  }

  /**
   * Extract file list from HTML
   * @param {string} html - HTML content
   * @returns {Array} Array of file data
   */
  async extractFilesFromHtml(html) {
    const files = [];

    try {
      // This is a simplified implementation
      // In a real scraper, you would parse the file list table
      const fileRegex = /<tr[^>]*class="file-row"[^>]*>.*?<\/tr>/gs;
      const fileRows = html.match(fileRegex) || [];

      for (const row of fileRows) {
        const nameMatch = row.match(/<td[^>]*class="file-name"[^>]*>([^<]*)<\/td>/i);
        const sizeMatch = row.match(/<td[^>]*class="file-size"[^>]*>([^<]*)<\/td>/i);

        if (nameMatch && sizeMatch) {
          files.push({
            name: cleanText(nameMatch[1]),
            size: parseFileSize(sizeMatch[1]),
            isVideo: nameMatch[1].match(/\.(mp4|avi|mkv|mov|wmv|flv|webm|m4v)$/i) !== null,
          });
        }
      }
    } catch (error) {
      console.error('Error extracting files:', error);
    }

    return files;
  }
}