/**
 * Utility functions for torrent scraping
 */

/**
 * Parse file size string to bytes
 * @param {string} sizeStr - Size string (e.g., "1.5 GB", "500 MB")
 * @returns {number} Size in bytes
 */
export function parseFileSize(sizeStr) {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;

  const cleanStr = sizeStr.toUpperCase().trim();
  const match = cleanStr.match(/^([\d.,]+)\s*([KMGT]?B?)$/);

  if (!match) return 0;

  const [, number, unit] = match;
  const value = parseFloat(number.replace(',', ''));

  const multipliers = {
    'B': 1,
    'KB': 1024,
    'K': 1024,
    'MB': 1024 * 1024,
    'M': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024,
  };

  return Math.floor(value * (multipliers[unit] || 1));
}

/**
 * Check if file is a video based on extension
 * @param {string} filename - File name
 * @returns {boolean} Whether file is a video
 */
export function isVideoFile(filename) {
  if (!filename || typeof filename !== 'string') return false;

  const videoExtensions = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts',
    '.mp4v', '.mov', '.hevc', '.h264', '.xvid', '.divx'
  ];

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return videoExtensions.includes(ext);
}

/**
 * Extract info hash from magnet link
 * @param {string} magnetLink - Magnet link
 * @returns {string|null} Info hash or null if not found
 */
export function extractInfoHash(magnetLink) {
  if (!magnetLink || typeof magnetLink !== 'string') return null;

  const match = magnetLink.match(/btih:([a-fA-F0-9]{40})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Generate magnet link from info hash and trackers
 * @param {string} infoHash - Info hash
 * @param {string[]} [trackers] - List of tracker URLs
 * @returns {string} Magnet link
 */
export function generateMagnetLink(infoHash, trackers = []) {
  if (!infoHash) return '';

  let magnet = `magnet:?xt=urn:btih:${infoHash}`;

  if (trackers.length > 0) {
    magnet += trackers.map(tracker => `&tr=${encodeURIComponent(tracker)}`).join('');
  }

  return magnet;
}

/**
 * Clean and normalize text
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim();
}

/**
 * Delay execution for specified time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract category from title or tags
 * @param {string} title - Torrent title
 * @param {string[]} [tags] - List of tags
 * @returns {string|null} Category name
 */
export function extractCategory(title, tags = []) {
  if (!title) return null;

  const titleLower = title.toLowerCase();
  const allTags = [titleLower, ...tags.map(tag => tag.toLowerCase())];

  // Category keywords
  const categories = {
    'Movies': ['movie', 'film', 'cinema', 'theatrical', 'dvdrip', 'bdrip', 'webrip', '720p', '1080p', '4k'],
    'TV Shows': ['season', 'episode', 'series', 'tv', 'show', 's01', 'e01', 'complete'],
    'Documentaries': ['documentary', 'docu', 'document'],
    'Anime': ['anime', 'manga', 'ova', 'animated'],
    'Software': ['software', 'app', 'application', 'windows', 'mac', 'linux', 'program'],
    'Games': ['game', 'gaming', 'pc game', 'ps4', 'xbox', 'switch', 'steam'],
    'Music': ['album', 'music', 'mp3', 'flac', 'soundtrack', 'audio'],
    'Books': ['ebook', 'book', 'novel', 'pdf', 'epub', 'mobi', 'audiobook'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => allTags.some(tag => tag.includes(keyword)))) {
      return category;
    }
  }

  return 'Other';
}

/**
 * Sanitize URL by removing unwanted parameters
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';

  try {
    const urlObj = new URL(url);
    // Remove common tracking parameters
    const paramsToRemove = ['ref', 'source', 'utm_source', 'utm_medium', 'utm_campaign'];

    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Generate unique ID
 * @returns {string} UUID-like ID
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<*>} Function result
 */
export async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}