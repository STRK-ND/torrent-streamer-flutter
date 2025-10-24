# Torrent Streamer API Documentation

This API provides endpoints for torrent metadata management, user authentication, and data ingestion for the Torrent Streamer application.

## Base URL

```
http://localhost:3000/api
```

## Authentication

The API uses token-based authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  }
}
```

## Success Response Format

Success responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

## API Endpoints

### Authentication

#### Sign In

**POST** `/auth/sign-in`

Authenticate a user and receive a token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "emailVerified": false,
      "image": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "session-token",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid input data
- `INVALID_CREDENTIALS` (401): Invalid email or password
- `INTERNAL_SERVER_ERROR` (500): Server error

#### Sign Up

**POST** `/auth/sign-up`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "emailVerified": false,
      "image": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "session-token",
    "expiresAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid input data
- `USER_ALREADY_EXISTS` (409): User with this email already exists
- `INTERNAL_SERVER_ERROR` (500): Server error

#### Get Current User

**GET** `/auth/me`

Get the current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "image": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Codes:**
- `MISSING_TOKEN` (401): Authorization token is required
- `INVALID_TOKEN` (401): Invalid or expired token
- `USER_NOT_FOUND` (404): User not found
- `INTERNAL_SERVER_ERROR` (500): Server error

#### Update Current User

**PUT** `/auth/me`

Update the current user's profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "image": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "name": "Jane Doe",
    "email": "user@example.com",
    "emailVerified": false,
    "image": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Codes:**
- `MISSING_TOKEN` (401): Authorization token is required
- `INVALID_TOKEN` (401): Invalid or expired token
- `VALIDATION_ERROR` (400): No valid fields to update
- `UPDATE_FAILED` (500): Failed to update user profile
- `INTERNAL_SERVER_ERROR` (500): Server error

### Torrent Management

#### Search Torrents

**GET** `/torrents/search`

Search for torrents by title or keywords.

**Query Parameters:**
- `q` (required): Search query
- `category` (optional): Category slug filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `sortBy` (optional): Sort field (createdAt, title, seeders, size)
- `sortOrder` (optional): Sort order (asc, desc)

**Example:**
```
GET /torrents/search?q=avengers&category=movies&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "torrents": [
      {
        "id": "torrent-uuid",
        "title": "Avengers: Endgame",
        "description": "The epic conclusion to the Infinity Saga",
        "magnetLink": "magnet:?xt=urn:btih:...",
        "infoHash": "abc123...",
        "size": 3221225472,
        "seeders": 150,
        "leechers": 25,
        "posterUrl": "https://example.com/poster.jpg",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "category": {
          "id": "category-uuid",
          "name": "Movies",
          "slug": "movies"
        },
        "fileCount": 3,
        "totalSize": 3221225472
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 95,
      "limit": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid query parameters
- `INTERNAL_SERVER_ERROR` (500): Server error

#### Get Latest Torrents

**GET** `/torrents/latest`

Get the most recently added torrents.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `category` (optional): Category slug filter
- `timeframe` (optional): Time filter (day, week, month, all)

**Example:**
```
GET /torrents/latest?page=1&limit=20&timeframe=week
```

**Response:**
```json
{
  "success": true,
  "data": {
    "torrents": [
      {
        "id": "torrent-uuid",
        "title": "New Movie Release",
        "description": "Description of the movie",
        "magnetLink": "magnet:?xt=urn:btih:...",
        "infoHash": "def456...",
        "size": 2147483648,
        "seeders": 89,
        "leechers": 12,
        "posterUrl": "https://example.com/poster2.jpg",
        "createdAt": "2024-01-02T00:00:00.000Z",
        "updatedAt": "2024-01-02T00:00:00.000Z",
        "category": {
          "id": "category-uuid",
          "name": "Movies",
          "slug": "movies"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 45,
      "limit": 20,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "timeframe": "week"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid query parameters
- `INTERNAL_SERVER_ERROR` (500): Server error

#### Get Torrent Details

**GET** `/torrents/{id}`

Get detailed information about a specific torrent.

**Path Parameters:**
- `id`: Torrent ID (UUID or string identifier)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "torrent-uuid",
    "title": "Avengers: Endgame",
    "description": "The epic conclusion to the Infinity Saga",
    "magnetLink": "magnet:?xt=urn:btih:...",
    "infoHash": "abc123...",
    "size": 3221225472,
    "seeders": 150,
    "leechers": 25,
    "posterUrl": "https://example.com/poster.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "category": {
      "id": "category-uuid",
      "name": "Movies",
      "slug": "movies",
      "description": "Full-length movies and films"
    },
    "fileCount": 3,
    "totalSize": 3221225472,
    "files": [
      {
        "id": "file-uuid",
        "name": "Avengers.Endgame.2019.1080p.BluRay.x264.mp4",
        "path": null,
        "size": 3221225472,
        "index": 0,
        "isVideo": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "sizeFormatted": "3.00 GB",
        "extension": "mp4"
      }
    ],
    "trackers": [
      {
        "id": "tracker-uuid",
        "url": "udp://tracker.example.com:1337",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "stats": {
      "totalFiles": 3,
      "videoFiles": 1,
      "totalSizeFormatted": "3.00 GB"
    }
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (400): Invalid torrent ID
- `TORRENT_NOT_FOUND` (404): Torrent not found or inactive
- `INTERNAL_SERVER_ERROR` (500): Server error

### Data Ingestion (Cloudflare Workers)

#### Ingest Torrent Data

**POST** `/ingest`

Batch ingest torrent data from external sources. This endpoint is secured with an API key.

**Headers:**
```
x-api-key: <ingest_api_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "torrents": [
    {
      "title": "Example Movie",
      "description": "A great movie",
      "magnetLink": "magnet:?xt=urn:btih:...",
      "infoHash": "abc123...",
      "size": 2147483648,
      "seeders": 100,
      "leechers": 20,
      "categoryName": "Movies",
      "posterUrl": "https://example.com/poster.jpg",
      "files": [
        {
          "name": "movie.mp4",
          "size": 2147483648,
          "index": 0,
          "isVideo": true
        }
      ],
      "trackers": [
        {
          "url": "udp://tracker.example.com:1337",
          "isActive": true
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 1,
    "errors": 0,
    "results": [
      {
        "success": true,
        "torrentId": "new-torrent-uuid",
        "title": "Example Movie"
      }
    ],
    "errors": []
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` (401): Invalid or missing API key
- `VALIDATION_ERROR` (400): Invalid request data
- `INTERNAL_SERVER_ERROR` (500): Server error

## Database Schema

### Categories

```sql
CREATE TABLE category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Torrents

```sql
CREATE TABLE torrent (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  magnet_link TEXT NOT NULL,
  info_hash TEXT UNIQUE,
  size INTEGER,
  seeders INTEGER DEFAULT 0,
  leechers INTEGER DEFAULT 0,
  category_id TEXT REFERENCES category(id),
  poster_url TEXT,
  added_by_user_id TEXT REFERENCES user(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Torrent Files

```sql
CREATE TABLE torrent_file (
  id TEXT PRIMARY KEY,
  torrent_id TEXT REFERENCES torrent(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT,
  size INTEGER NOT NULL,
  index INTEGER,
  is_video BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Torrent Trackers

```sql
CREATE TABLE torrent_tracker (
  id TEXT PRIMARY KEY,
  torrent_id TEXT REFERENCES torrent(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute per IP
- Search endpoints: 30 requests per minute per IP
- Data ingestion: 100 requests per minute per API key

## CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (development)
- `http://localhost:8080` (Flutter development)
- Production domains (to be configured)

## Examples

### Flutter Integration Example

```dart
// Search torrents
final response = await http.get(
  Uri.parse('http://localhost:3000/api/torrents/search?q=avengers'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
);

if (response.statusCode == 200) {
  final data = json.decode(response.body);
  final torrents = data['data']['torrents'];
}
```

### Cloudflare Worker Example

```javascript
// Ingest torrent data
const response = await fetch('http://localhost:3000/api/ingest', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INGEST_API_KEY,
  },
  body: JSON.stringify({
    torrents: scrapedTorrents,
  }),
});
```