import { Client as PostgreSQLClient } from 'pg';
import { randomUUID } from 'crypto';

// TypeScript interfaces for our data models
export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  userId: string;
}

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Torrent {
  id: string;
  title: string;
  description?: string;
  magnetLink: string;
  infoHash?: string;
  size?: number;
  seeders: number;
  leechers: number;
  categoryId?: string;
  posterUrl?: string;
  addedByUserId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TorrentFile {
  id: string;
  torrentId: string;
  name: string;
  path?: string;
  size: number;
  index?: number;
  isVideo: boolean;
  createdAt: Date;
}

export interface TorrentTracker {
  id: string;
  torrentId: string;
  url: string;
  isActive: boolean;
  createdAt: Date;
}

export interface UserTorrentActivity {
  id: string;
  userId: string;
  torrentId: string;
  activity: 'viewed' | 'downloaded' | 'streamed';
  metadata?: string;
  createdAt: Date;
}

// R1 Database Client class
export class R1DatabaseClient {
  private client: PostgreSQLClient | null = null;
  private isConnected: boolean = false;

  constructor(
    private readonly config: {
      accountId: string;
      database: string;
      apiToken: string;
    }
  ) {}

  private async ensureConnection(): Promise<PostgreSQLClient> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }
    if (!this.client) {
      throw new Error('Failed to connect to R1 database');
    }
    return this.client;
  }

  async connect(): Promise<void> {
    try {
      // For Cloudflare R1, we need to use the connection string format
      // that includes the account ID, database name, and API token
      const connectionString = `postgresql://token:${this.config.apiToken}@aws.connect.psdb.cloud/${this.config.database}?sslmode=require&application_name=${this.config.accountId}`;

      this.client = new PostgreSQLClient({
        connectionString,
        // Add connection pool settings for better performance
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      await this.client.query('SELECT 1');
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to R1 database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Generic query helper with prepared statements
  private async query<T = any>(text: string, params: any[] = []): Promise<T[]> {
    const client = await this.ensureConnection();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Generic single query helper
  private async queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(text, params);
    return results.length > 0 ? results[0] : null;
  }

  // User operations
  async findUserByEmail(email: string): Promise<User | null> {
    const text = 'SELECT * FROM "user" WHERE email = $1';
    return this.queryOne<User>(text, [email]);
  }

  async findUserById(id: string): Promise<User | null> {
    const text = 'SELECT * FROM "user" WHERE id = $1';
    return this.queryOne<User>(text, [id]);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const text = `
      INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      id,
      userData.name,
      userData.email,
      userData.emailVerified,
      userData.image || null,
      now,
      now
    ];

    const result = await this.queryOne<User>(text, params);
    if (!result) throw new Error('Failed to create user');
    return result;
  }

  async updateUser(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (userData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(userData.name);
    }
    if (userData.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(userData.email);
    }
    if (userData.emailVerified !== undefined) {
      fields.push(`email_verified = $${paramIndex++}`);
      params.push(userData.emailVerified);
    }
    if (userData.image !== undefined) {
      fields.push(`image = $${paramIndex++}`);
      params.push(userData.image);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const text = `UPDATE "user" SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    return this.queryOne<User>(text, params);
  }

  async deleteUser(id: string): Promise<boolean> {
    const text = 'DELETE FROM "user" WHERE id = $1';
    const client = await this.ensureConnection();
    const result = await client.query(text, [id]);
    return result.rowCount > 0;
  }

  // Session operations
  async createSession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const text = `
      INSERT INTO session (id, expires_at, token, created_at, updated_at, ip_address, user_agent, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      id,
      sessionData.expiresAt,
      sessionData.token,
      now,
      now,
      sessionData.ipAddress || null,
      sessionData.userAgent || null,
      sessionData.userId
    ];

    const result = await this.queryOne<Session>(text, params);
    if (!result) throw new Error('Failed to create session');
    return result;
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const text = 'SELECT * FROM session WHERE token = $1 AND expires_at > NOW()';
    return this.queryOne<Session>(text, [token]);
  }

  async deleteSession(id: string): Promise<boolean> {
    const text = 'DELETE FROM session WHERE id = $1';
    const client = await this.ensureConnection();
    const result = await client.query(text, [id]);
    return result.rowCount > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const text = 'DELETE FROM session WHERE expires_at <= NOW()';
    const client = await this.ensureConnection();
    const result = await client.query(text);
    return result.rowCount || 0;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    const text = 'SELECT * FROM category ORDER BY name';
    return this.query<Category>(text);
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    const text = 'SELECT * FROM category WHERE slug = $1';
    return this.queryOne<Category>(text, [slug]);
  }

  async createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const id = randomUUID();
    const now = new Date();
    const text = `
      INSERT INTO category (id, name, slug, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      id,
      categoryData.name,
      categoryData.slug,
      categoryData.description || null,
      now,
      now
    ];

    const result = await this.queryOne<Category>(text, params);
    if (!result) throw new Error('Failed to create category');
    return result;
  }

  // Torrent operations
  async getTorrentById(id: string): Promise<Torrent | null> {
    const text = `
      SELECT t.*, c.name as category_name
      FROM torrent t
      LEFT JOIN category c ON t.category_id = c.id
      WHERE t.id = $1 AND t.is_active = true
    `;
    return this.queryOne<Torrent>(text, [id]);
  }

  async searchTorrents(query: string, limit: number = 20, offset: number = 0): Promise<Torrent[]> {
    const searchPattern = `%${query}%`;
    const text = `
      SELECT t.*, c.name as category_name
      FROM torrent t
      LEFT JOIN category c ON t.category_id = c.id
      WHERE t.is_active = true
      AND (t.title ILIKE $1 OR t.description ILIKE $1)
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.query<Torrent>(text, [searchPattern, limit, offset]);
  }

  async getLatestTorrents(limit: number = 20, offset: number = 0): Promise<Torrent[]> {
    const text = `
      SELECT t.*, c.name as category_name
      FROM torrent t
      LEFT JOIN category c ON t.category_id = c.id
      WHERE t.is_active = true
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return this.query<Torrent>(text, [limit, offset]);
  }

  async getTorrentsByCategory(categoryId: string, limit: number = 20, offset: number = 0): Promise<Torrent[]> {
    const text = `
      SELECT t.*, c.name as category_name
      FROM torrent t
      LEFT JOIN category c ON t.category_id = c.id
      WHERE t.category_id = $1 AND t.is_active = true
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.query<Torrent>(text, [categoryId, limit, offset]);
  }

  async createTorrent(torrentData: Omit<Torrent, 'id' | 'createdAt' | 'updatedAt' | 'seeders' | 'leechers'>): Promise<Torrent> {
    const id = randomUUID();
    const now = new Date();
    const text = `
      INSERT INTO torrent (
        id, title, description, magnet_link, info_hash, size,
        category_id, poster_url, added_by_user_id, is_active,
        seeders, leechers, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const params = [
      id,
      torrentData.title,
      torrentData.description || null,
      torrentData.magnetLink,
      torrentData.infoHash || null,
      torrentData.size || null,
      torrentData.categoryId || null,
      torrentData.posterUrl || null,
      torrentData.addedByUserId || null,
      torrentData.isActive !== undefined ? torrentData.isActive : true,
      0, // seeders
      0, // leechers
      now,
      now
    ];

    const result = await this.queryOne<Torrent>(text, params);
    if (!result) throw new Error('Failed to create torrent');
    return result;
  }

  async updateTorrent(id: string, torrentData: Partial<Omit<Torrent, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Torrent | null> {
    const fields = [];
    const params = [];
    let paramIndex = 1;

    if (torrentData.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(torrentData.title);
    }
    if (torrentData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(torrentData.description);
    }
    if (torrentData.magnetLink !== undefined) {
      fields.push(`magnet_link = $${paramIndex++}`);
      params.push(torrentData.magnetLink);
    }
    if (torrentData.infoHash !== undefined) {
      fields.push(`info_hash = $${paramIndex++}`);
      params.push(torrentData.infoHash);
    }
    if (torrentData.size !== undefined) {
      fields.push(`size = $${paramIndex++}`);
      params.push(torrentData.size);
    }
    if (torrentData.seeders !== undefined) {
      fields.push(`seeders = $${paramIndex++}`);
      params.push(torrentData.seeders);
    }
    if (torrentData.leechers !== undefined) {
      fields.push(`leechers = $${paramIndex++}`);
      params.push(torrentData.leechers);
    }
    if (torrentData.categoryId !== undefined) {
      fields.push(`category_id = $${paramIndex++}`);
      params.push(torrentData.categoryId);
    }
    if (torrentData.posterUrl !== undefined) {
      fields.push(`poster_url = $${paramIndex++}`);
      params.push(torrentData.posterUrl);
    }
    if (torrentData.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      params.push(torrentData.isActive);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const text = `UPDATE torrent SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    return this.queryOne<Torrent>(text, params);
  }

  async deleteTorrent(id: string): Promise<boolean> {
    const text = 'DELETE FROM torrent WHERE id = $1';
    const client = await this.ensureConnection();
    const result = await client.query(text, [id]);
    return result.rowCount > 0;
  }

  // User Activity operations
  async recordUserActivity(activityData: Omit<UserTorrentActivity, 'id' | 'createdAt'>): Promise<UserTorrentActivity> {
    const id = randomUUID();
    const now = new Date();
    const text = `
      INSERT INTO user_torrent_activity (id, user_id, torrent_id, activity, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      id,
      activityData.userId,
      activityData.torrentId,
      activityData.activity,
      activityData.metadata || null,
      now
    ];

    const result = await this.queryOne<UserTorrentActivity>(text, params);
    if (!result) throw new Error('Failed to record user activity');
    return result;
  }

  async getUserActivities(userId: string, limit: number = 50, offset: number = 0): Promise<UserTorrentActivity[]> {
    const text = `
      SELECT uta.*, t.title as torrent_title
      FROM user_torrent_activity uta
      JOIN torrent t ON uta.torrent_id = t.id
      WHERE uta.user_id = $1
      ORDER BY uta.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    return this.query<UserTorrentActivity>(text, [userId, limit, offset]);
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{ isConnected: boolean; database: string; accountId: string }> {
    return {
      isConnected: this.isConnected,
      database: this.config.database,
      accountId: this.config.accountId
    };
  }
}

// Singleton instance for the application
let r1Client: R1DatabaseClient | null = null;

export function getR1Client(): R1DatabaseClient {
  if (!r1Client) {
    const config = {
      accountId: process.env.CF_ACCOUNT_ID!,
      database: process.env.R1_DATABASE!,
      apiToken: process.env.R1_API_TOKEN!
    };

    if (!config.accountId || !config.database || !config.apiToken) {
      throw new Error('Missing required Cloudflare R1 environment variables');
    }

    r1Client = new R1DatabaseClient(config);
  }
  return r1Client;
}

// Helper function to create database tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  const client = getR1Client();

  try {
    await client.connect();

    // Create user table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      )
    `);

    // Create category table
    await client.query(`
      CREATE TABLE IF NOT EXISTS category (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create torrent table
    await client.query(`
      CREATE TABLE IF NOT EXISTS torrent (
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
        added_by_user_id TEXT REFERENCES "user"(id),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_token ON session(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_expires_at ON session(expires_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_category_slug ON category(slug)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_torrent_title ON torrent(title)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_torrent_info_hash ON torrent(info_hash)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_torrent_category_id ON torrent(category_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_torrent_created_at ON torrent(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_torrent_is_active ON torrent(is_active)');

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}