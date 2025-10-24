/**
 * HTTP client for making requests with proper headers and error handling
 */

/**
 * HTTP client class
 */
export class HttpClient {
  constructor(defaultHeaders = {}) {
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...defaultHeaders,
    };
  }

  /**
   * Make HTTP GET request
   * @param {string} url - URL to fetch
   * @param {Object} [options] - Request options
   * @returns {Promise<Response>} Fetch response
   */
  async get(url, options = {}) {
    const requestOptions = {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options,
    };

    return fetch(url, requestOptions);
  }

  /**
   * Make HTTP POST request
   * @param {string} url - URL to fetch
   * @param {Object} [data] - Request body data
   * @param {Object} [options] - Request options
   * @returns {Promise<Response>} Fetch response
   */
  async post(url, data = null, options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    if (data) {
      if (typeof data === 'string') {
        requestOptions.body = data;
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    }

    return fetch(url, requestOptions);
  }

  /**
   * Get HTML content with error handling and retries
   * @param {string} url - URL to fetch
   * @param {number} [retries=3] - Number of retries
   * @returns {Promise<string>} HTML content
   */
  async getHtml(url, retries = 3) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await this.get(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error;

        if (i < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if URL is accessible
   * @param {string} url - URL to check
   * @returns {Promise<boolean>} Whether URL is accessible
   */
  async isAccessible(url) {
    try {
      const response = await this.get(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}