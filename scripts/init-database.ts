#!/usr/bin/env tsx

/**
 * Database initialization script
 * This script sets up the R1 database with the required schema and sample data
 */

import { initializeDatabase, getR1Client, getTorrentCacheManager } from '../lib/db';
import { randomUUID } from 'crypto';

async function main() {
  console.log('🚀 Initializing database...');

  try {
    // Initialize database schema
    await initializeDatabase();
    console.log('✅ Database schema initialized');

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Check if we have any categories, if not create some default ones
    const existingCategories = await db.getAllCategories();
    if (existingCategories.length === 0) {
      console.log('📁 Creating default categories...');

      const defaultCategories = [
        { name: 'Movies', slug: 'movies', description: 'Full-length movies and films' },
        { name: 'TV Series', slug: 'tv-series', description: 'Television series and shows' },
        { name: 'Documentaries', slug: 'documentaries', description: 'Documentary films and series' },
        { name: 'Anime', slug: 'anime', description: 'Anime series and movies' },
        { name: 'Software', slug: 'software', description: 'Software applications and tools' },
        { name: 'Games', slug: 'games', description: 'Video games and interactive media' },
        { name: 'Music', slug: 'music', description: 'Music albums and tracks' },
        { name: 'Books', slug: 'books', description: 'E-books and audiobooks' },
        { name: 'Other', slug: 'other', description: 'Other content types' }
      ];

      for (const category of defaultCategories) {
        await db.createCategory(category);
      }

      console.log(`✅ Created ${defaultCategories.length} default categories`);

      // Cache the categories for performance
      const allCategories = await db.getAllCategories();
      await cacheManager.cacheCategories(allCategories);
      console.log('💾 Cached categories in KV');
    } else {
      console.log(`📁 Found ${existingCategories.length} existing categories`);
      // Cache existing categories
      await cacheManager.cacheCategories(existingCategories);
      console.log('💾 Cached existing categories in KV');
    }

    // Perform health check
    const health = await db.healthCheck();
    if (health) {
      console.log('✅ Database health check passed');
    } else {
      console.log('❌ Database health check failed');
    }

    // Get cache statistics
    const cacheStats = await cacheManager.getStats();
    console.log(`📊 Cache statistics: ${cacheStats.totalEntries} entries, ${cacheStats.expiredEntries} expired`);

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    // Clean up connections
    await getR1Client().disconnect();
    console.log('🔌 Database connections closed');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  try {
    await getR1Client().disconnect();
    console.log('🔌 Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await getR1Client().disconnect();
    console.log('🔌 Database connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}