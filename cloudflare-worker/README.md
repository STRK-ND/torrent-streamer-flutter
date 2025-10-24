# Torrent Scraper Cloudflare Worker

A Cloudflare Worker that scrapes torrent metadata from various sources and sends it to the backend API for ingestion.

## Features

- **Multi-site Scraping**: Supports multiple torrent sites with extensible scraper architecture
- **Rate Limiting**: Built-in rate limiting and delays to avoid being blocked
- **Error Handling**: Comprehensive error handling with retry logic
- **Batch Processing**: Efficient batch processing to handle large amounts of data
- **Scheduled Execution**: Automatic scraping on a schedule using Cloudflare Cron Triggers
- **Manual Triggering**: HTTP endpoints for manual scraping and status checks
- **Health Monitoring**: Built-in health checks and status monitoring

## Architecture

```
src/
├── index.js              # Main worker entry point
├── scrapers/
│   ├── base-scraper.js   # Base scraper class with common functionality
│   ├── yts-scraper.js    # YTS (YIFY) scraper implementation
│   └── 1337x-scraper.js  # 1337x scraper implementation
├── utils/
│   ├── helpers.js        # Utility functions
│   └── http-client.js    # HTTP client with retry logic
└── types/
    └── torrent.js        # Type definitions
```

## Supported Sites

### YTS (YIFY)
- **Type**: API-based
- **Content**: Movies
- **Features**: Reliable data extraction, multiple quality options
- **URL**: https://yts.mx

### 1337x
- **Type**: Web scraping
- **Content**: Movies, TV Shows, Games, Apps, Music, Anime
- **Features**: Comprehensive category support
- **URL**: https://1337x.to

## Configuration

The worker is configured using environment variables and `wrangler.toml`:

### Environment Variables

- `INGEST_API_KEY`: API key for the backend ingest endpoint
- `BACKEND_URL`: URL of the backend API (e.g., `https://your-backend.com/api`)

### Worker Configuration

```toml
name = "torrent-scraper-worker"
main = "src/index.js"
compatibility_date = "2024-08-01"

[vars]
INGEST_API_KEY = "your_api_key_here"
BACKEND_URL = "https://your-backend.com/api"

# Scheduled execution every 6 hours
[[triggers]]
crons = ["0 */6 * * *"]
```

## API Endpoints

### Manual Scraping

**POST** `/scrape`

Manually trigger scraping for specific sites.

**Request Body:**
```json
{
  "scrapers": ["yts", "1337x"],
  "options": {
    "maxPages": 3,
    "query": "avengers"
  },
  "sendToBackend": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "success": true,
        "site": "YTS",
        "torrents": [...],
        "stats": {...}
      }
    ],
    "summary": {
      "totalScrapers": 2,
      "successfulScrapers": 2,
      "totalTorrents": 150,
      "duration": 45000
    }
  }
}
```

### Status Check

**GET** `/status`

Get the current status and statistics of all scrapers.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "scrapers": {
      "yts": {
        "config": {...},
        "stats": {
          "totalPages": 5,
          "totalTorrents": 100,
          "successful": 100,
          "failed": 0
        }
      }
    },
    "config": {...}
  }
}
```

### Health Check

**GET** `/health`

Simple health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600000
}
```

## Scraping Options

### Common Options

- `query` (string): Search query for targeted scraping
- `maxPages` (number): Maximum number of pages to scrape per site
- `category` (string): Specific category to scrape
- `minSeeders` (number): Minimum number of seeders required

### Example Requests

#### Search for specific content
```bash
curl -X POST https://your-worker.workers.dev/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "scrapers": ["yts"],
    "options": {
      "query": "christopher nolan",
      "maxPages": 2
    }
  }'
```

#### Scrape latest content
```bash
curl -X POST https://your-worker.workers.dev/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "scrapers": ["1337x"],
    "options": {
      "maxPages": 3
    }
  }'
```

## Adding New Scrapers

To add a new torrent site scraper:

1. **Create a new scraper class** extending `BaseScraper`:

```javascript
// src/scrapers/new-site-scraper.js
import { BaseScraper } from './base-scraper.js';

export class NewSiteScraper extends BaseScraper {
  constructor() {
    super({
      name: 'NewSite',
      baseUrl: 'https://newsite.com',
      delay: 2000,
      maxRetries: 3,
    });
  }

  async scrapePages(options) {
    // Implement scraping logic
    const torrents = [];
    // ... scraping code ...
    return torrents;
  }

  parseTorrentFromElement(element) {
    // Implement parsing logic
    return null;
  }
}
```

2. **Register the scraper** in `src/index.js`:

```javascript
import { NewSiteScraper } from './scrapers/new-site-scraper.js';

const scrapers = {
  yts: new YTSScraper(),
  '1337x': new Scraper1337x(),
  'newsite': new NewSiteScraper(), // Add this line
};
```

3. **Add to default scrapers** (optional):

```javascript
const CONFIG = {
  defaultScrapers: ['yts', '1337x', 'newsite'], // Add here
  // ...
};
```

## Deployment

### Prerequisites

- Node.js 18+
- Wrangler CLI
- Cloudflare account

### Installation

```bash
cd cloudflare-worker
npm install
```

### Development

```bash
npm run dev
```

### Deployment

```bash
# Set environment variables
wrangler secret put INGEST_API_KEY
wrangler secret put BACKEND_URL

# Deploy to Cloudflare
npm run deploy
```

### Environment Variables

Set the following secrets using Wrangler:

```bash
# API key for backend authentication
wrangler secret put INGEST_API_KEY

# Backend API URL
wrangler secret put BACKEND_URL
```

## Monitoring and Logging

### Logs

Access worker logs through the Cloudflare dashboard or using Wrangler:

```bash
wrangler tail
```

### Metrics

The worker automatically tracks:
- Scrape success/failure rates
- Number of torrents processed
- Response times
- Error rates

### Error Handling

The worker includes comprehensive error handling:

- **Retry Logic**: Automatic retries for failed requests
- **Rate Limiting**: Built-in delays to avoid being blocked
- **Dead Letter Queue**: Failed batches are logged for manual review
- **Circuit Breaker**: Temporarily stops scraping sites that consistently fail

## Security Considerations

- **API Key Protection**: Ingest API key is stored as a Cloudflare secret
- **Request Validation**: All inputs are validated before processing
- **Rate Limiting**: Built-in rate limiting prevents abuse
- **Error Information**: Sensitive information is not exposed in error messages

## Performance Optimization

- **Concurrent Scraping**: Multiple scrapers run in parallel
- **Batch Processing**: Large datasets are processed in batches
- **Caching**: HTTP responses are cached when appropriate
- **Connection Reuse**: HTTP connections are reused for efficiency

## Legal Considerations

⚠️ **Important**: This scraper is designed for legal content only. Ensure you have:

1. **Permission** to scrape the target websites
2. **Rights** to distribute the content being scraped
3. **Compliance** with the websites' terms of service
4. **Respect** for robots.txt files and rate limits

The authors are not responsible for misuse of this software.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your new scraper or improvement
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details