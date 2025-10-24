/**
 * @typedef {Object} TorrentFile
 * @property {string} name - File name
 * @property {number} size - File size in bytes
 * @property {number} [index] - File index in torrent
 * @property {string} [path] - File path
 * @property {boolean} isVideo - Whether file is a video
 */

/**
 * @typedef {Object} TorrentTracker
 * @property {string} url - Tracker URL
 * @property {boolean} [isActive=true] - Whether tracker is active
 */

/**
 * @typedef {Object} TorrentData
 * @property {string} title - Torrent title
 * @property {string} [description] - Torrent description
 * @property {string} [magnetLink] - Magnet link
 * @property {string} [infoHash] - Info hash
 * @property {number} [size] - Total size in bytes
 * @property {number} [seeders] - Number of seeders
 * @property {number} [leechers] - Number of leechers
 * @property {string} [categoryName] - Category name
 * @property {string} [posterUrl] - Poster image URL
 * @property {TorrentFile[]} [files] - List of files
 * @property {TorrentTracker[]} [trackers] - List of trackers
 */

/**
 * @typedef {Object} ScrapingResult
 * @property {boolean} success - Whether scraping was successful
 * @property {string} site - Site name
 * @property {TorrentData[]} torrents - Array of torrent data
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} ScraperConfig
 * @property {string} name - Scraper name
 * @property {string} baseUrl - Base URL of the site
 * @property {string} searchPath - Search path template
 * @property {string[]} selectors - CSS selectors for data extraction
 * @property {Object<string, string>} [headers] - Custom headers
 * @property {number} [delay] - Delay between requests in ms
 * @property {number} [maxPages] - Maximum pages to scrape
 */

export {};