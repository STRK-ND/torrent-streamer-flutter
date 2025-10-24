import { BaseScraper } from './base-scraper.js';
import { parseFileSize, cleanText } from '../utils/helpers.js';

/**
 * YTS (YIFY) scraper - example implementation for movie torrents
 */
export class YTSScraper extends BaseScraper {
  constructor() {
    super({
      name: 'YTS',
      baseUrl: 'https://yts.mx',
      delay: 2000, // 2 seconds delay between requests
      maxRetries: 3,
      headers: {
        'Referer': 'https://yts.mx/',
        'Origin': 'https://yts.mx',
      },
    });

    this.apiUrl = 'https://yts.mx/api/v2';
  }

  /**
   * Scrape movies from YTS API
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Array of torrent data
   */
  async scrapePages(options = {}) {
    const { maxPages = 5, query } = options;
    const torrents = [];

    try {
      // Use YTS API for more reliable data extraction
      if (query) {
        // Search movies
        await this.scrapeSearchResults(query, torrents, maxPages);
      } else {
        // Get latest movies
        await this.scrapeLatestMovies(torrents, maxPages);
      }
    } catch (error) {
      console.error('YTS scraping error:', error);
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
    const searchUrl = `${this.apiUrl}/list_movies.json?query_term=${encodeURIComponent(query)}&limit=50`;

    const response = await this.makeRequest(() => this.httpClient.get(searchUrl));

    if (!response.ok) {
      throw new Error(`YTS API search failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'ok' || !data.data || !data.data.movies) {
      console.log('No movies found for query:', query);
      return;
    }

    for (const movie of data.data.movies) {
      const torrentData = await this.parseMovieFromAPI(movie);
      if (torrentData) {
        torrents.push(torrentData);
      }
    }
  }

  /**
   * Scrape latest movies
   * @param {Array} torrents - Array to store results
   * @param {number} maxPages - Maximum pages to scrape
   */
  async scrapeLatestMovies(torrents, maxPages) {
    for (let page = 1; page <= maxPages; page++) {
      const latestUrl = `${this.apiUrl}/list_movies.json?sort_by=date_added&order_by=desc&limit=20&page=${page}`;

      const response = await this.makeRequest(() => this.httpClient.get(latestUrl));

      if (!response.ok) {
        console.error(`YTS API page ${page} failed: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.status !== 'ok' || !data.data || !data.data.movies) {
        console.log(`No movies found on page ${page}`);
        continue;
      }

      for (const movie of data.data.movies) {
        const torrentData = await this.parseMovieFromAPI(movie);
        if (torrentData) {
          torrents.push(torrentData);
        }
      }

      this.stats.totalPages++;
    }
  }

  /**
   * Parse movie data from YTS API response
   * @param {Object} movie - Movie data from API
   * @returns {Promise<Object|null>} Torrent data
   */
  async parseMovieFromAPI(movie) {
    try {
      if (!movie.title || !movie.torrents || movie.torrents.length === 0) {
        return null;
      }

      // Get the best quality torrent (prefer 1080p, then 720p)
      const sortedTorrents = movie.torrents.sort((a, b) => {
        const qualityOrder = { '1080p': 3, '720p': 2, '480p': 1 };
        const aQuality = qualityOrder[a.quality] || 0;
        const bQuality = qualityOrder[b.quality] || 0;
        return bQuality - aQuality;
      });

      const bestTorrent = sortedTorrents[0];

      const torrentData = {
        title: `${movie.title} (${movie.year})`,
        description: movie.description_full || movie.summary,
        magnetLink: bestTorrent.url,
        size: parseFileSize(bestTorrent.size),
        seeders: bestTorrent.seeds || 0,
        leechers: bestTorrent.peers || 0,
        categoryName: 'Movies',
        posterUrl: movie.medium_cover_image || movie.large_cover_image,
        files: [{
          name: `${movie.title}.${movie.year}.${bestTorrent.quality}.mp4`,
          size: parseFileSize(bestTorrent.size),
          isVideo: true,
        }],
        trackers: [
          'udp://open.demonii.com:1337/announce',
          'udp://tracker.openbittorrent.com:80',
          'udp://tracker.coppersurfer.tk:6969',
          'udp://glotorrents.pw:6969/announce',
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://torrent.gresille.org:80/announce',
          'udp://p4p.arenabg.com:1337',
          'udp://tracker.leechers-paradise.org:6969',
        ],
        tags: [movie.year.toString(), ...movie.genres || []],
      };

      return this.validateAndNormalizeTorrent(torrentData);
    } catch (error) {
      console.error('Error parsing YTS movie:', error);
      return null;
    }
  }

  /**
   * Extract additional movie details
   * @param {string} movieUrl - Movie details URL
   * @returns {Promise<Object>} Additional details
   */
  async extractMovieDetails(movieUrl) {
    try {
      const response = await this.makeRequest(() => this.httpClient.get(movieUrl));

      if (!response.ok) {
        return {};
      }

      const html = await response.text();
      // Additional parsing can be done here if needed
      return {};
    } catch (error) {
      console.error('Error extracting movie details:', error);
      return {};
    }
  }
}