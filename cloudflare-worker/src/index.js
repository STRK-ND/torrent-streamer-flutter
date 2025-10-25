import { YTSScraper } from './scrapers/yts-scraper.js';
import { Scraper1337x } from './scrapers/1337x-scraper.js';

/**
 * Cloudflare Worker for torrent scraping
 */

// Configuration
const CONFIG = {
  // Backend API URL
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000/api',

  // Ingest API key
  ingestApiKey: process.env.INGEST_API_KEY || '',

  // Scraping settings
  maxConcurrentScrapers: 2,
  batchSize: 50, // Maximum torrents per batch request

  // Default scrapers to run
  defaultScrapers: ['yts', '1337x'],

  // Rate limiting
  maxRequestsPerMinute: 60,

  // Retry settings
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

// Initialize scrapers
const scrapers = {
  yts: new YTSScraper(),
  '1337x': new Scraper1337x(),
};

/**
 * Main event handler for scheduled triggers
 */
export async function scheduled(event, env, ctx) {
  console.log('Starting scheduled torrent scraping...');

  try {
    const results = await runScrapers(CONFIG.defaultScrapers);
    await sendToBackend(results);

    console.log('Scheduled scraping completed successfully');
  } catch (error) {
    console.error('Scheduled scraping failed:', error);

    // Optionally send error notification
    await sendErrorNotification(error);
  }
}

/**
 * Main event handler for HTTP requests
 */
export async function fetch(request, env, ctx) {
  const url = new URL(request.url);

  // Handle different routes
  switch (url.pathname) {
    case '/scrape':
      return handleScrapeRequest(request, env);
    case '/status':
      return handleStatusRequest();
    case '/health':
      return handleHealthRequest();
    default:
      return new Response('Not Found', { status: 404 });
  }
}

/**
 * Handle manual scraping requests
 */
async function handleScrapeRequest(request, env) {
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { scrapers = CONFIG.defaultScrapers, options = {} } = body;

    console.log(`Manual scraping request for scrapers: ${scrapers.join(', ')}`);

    const results = await runScrapers(scrapers, options);

    // Send to backend if requested
    if (body.sendToBackend !== false) {
      await sendToBackend(results);
    }

    return Response.json({
      success: true,
      data: {
        results,
        summary: generateSummary(results),
      },
    });
  } catch (error) {
    console.error('Manual scraping failed:', error);

    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * Handle status requests
 */
async function handleStatusRequest() {
  const scraperStatus = {};

  for (const [name, scraper] of Object.entries(scrapers)) {
    scraperStatus[name] = {
      config: scraper.config,
      stats: scraper.getStats(),
    };
  }

  return Response.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
      scrapers: scraperStatus,
      config: CONFIG,
    },
  });
}

/**
 * Handle health checks
 */
async function handleHealthRequest() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Date.now() - globalThis.startTime,
  });
}

/**
 * Run multiple scrapers
 */
async function runScrapers(scraperNames, options = {}) {
  const results = [];

  // Limit concurrent scrapers
  const concurrentScrapers = scraperNames.slice(0, CONFIG.maxConcurrentScrapers);

  console.log(`Running scrapers: ${concurrentScrapers.join(', ')}`);

  const promises = concurrentScrapers.map(async (scraperName) => {
    try {
      const scraper = scrapers[scraperName];
      if (!scraper) {
        throw new Error(`Scraper '${scraperName}' not found`);
      }

      console.log(`Starting scraper: ${scraperName}`);
      const result = await scraper.scrape(options);

      console.log(`Scraper ${scraperName} completed: ${result.torrents.length} torrents`);
      return result;
    } catch (error) {
      console.error(`Scraper ${scraperName} failed:`, error);

      return {
        success: false,
        site: scraperName,
        torrents: [],
        error: error.message,
      };
    }
  });

  const scraperResults = await Promise.all(promises);
  results.push(...scraperResults);

  return results;
}

/**
 * Send scraped data to backend API
 */
async function sendToBackend(scraperResults) {
  if (!CONFIG.ingestApiKey || !CONFIG.backendUrl) {
    console.warn('Missing backend configuration, skipping data send');
    return;
  }

  // Collect all torrents from successful scrapers
  const allTorrents = [];

  for (const result of scraperResults) {
    if (result.success && result.torrents && result.torrents.length > 0) {
      allTorrents.push(...result.torrents);
    }
  }

  if (allTorrents.length === 0) {
    console.log('No torrents to send to backend');
    return;
  }

  console.log(`Sending ${allTorrents.length} torrents to backend`);

  try {
    // Send in batches to avoid large payloads
    for (let i = 0; i < allTorrents.length; i += CONFIG.batchSize) {
      const batch = allTorrents.slice(i, i + CONFIG.batchSize);

      await sendBatchWithRetry(batch, 0);

      // Add delay between batches
      if (i + CONFIG.batchSize < allTorrents.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Successfully sent ${allTorrents.length} torrents to backend`);
  } catch (error) {
    console.error('Failed to send data to backend:', error);
    throw error;
  }
}

/**
 * Send batch to backend with retry logic
 */
async function sendBatchWithRetry(batch, retryCount) {
  try {
    const response = await fetch(`${CONFIG.backendUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ingestApiKey,
        'User-Agent': 'Torrent-Scraper-Worker/1.0',
      },
      body: JSON.stringify({
        torrents: batch,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Backend API error: ${result.error?.message || 'Unknown error'}`);
    }

    console.log(`Batch sent successfully: ${batch.length} torrents, processed: ${result.data.processed}, errors: ${result.data.errors}`);

  } catch (error) {
    console.error(`Batch send failed (attempt ${retryCount + 1}):`, error.message);

    if (retryCount < CONFIG.maxRetries) {
      console.log(`Retrying batch send in ${CONFIG.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
      return sendBatchWithRetry(batch, retryCount + 1);
    } else {
      throw error;
    }
  }
}

/**
 * Generate summary of scraping results
 */
function generateSummary(results) {
  const summary = {
    totalScrapers: results.length,
    successfulScrapers: 0,
    failedScrapers: 0,
    totalTorrents: 0,
    sites: [],
    duration: 0,
    startTime: null,
    endTime: new Date().toISOString(),
  };

  let earliestTime = null;
  let latestTime = null;

  for (const result of results) {
    if (result.success) {
      summary.successfulScrapers++;
      summary.totalTorrents += result.torrents?.length || 0;

      if (result.stats?.startTime) {
        if (!earliestTime || new Date(result.stats.startTime) < new Date(earliestTime)) {
          earliestTime = result.stats.startTime;
        }
        if (!latestTime || new Date(result.stats.endTime) > new Date(latestTime)) {
          latestTime = result.stats.endTime;
        }
      }
    } else {
      summary.failedScrapers++;
    }

    summary.sites.push({
      name: result.site,
      success: result.success,
      torrentCount: result.torrents?.length || 0,
      error: result.error || null,
      stats: result.stats || null,
    });
  }

  if (earliestTime && latestTime) {
    summary.duration = new Date(latestTime) - new Date(earliestTime);
    summary.startTime = earliestTime;
  }

  return summary;
}

/**
 * Send error notification (placeholder for future implementation)
 */
async function sendErrorNotification(error) {
  console.error('Error notification would be sent here:', error);

  // Future: Send to Discord, Slack, email, etc.
  // For now, just log the error
}

// Initialize worker start time
globalThis.startTime = Date.now();