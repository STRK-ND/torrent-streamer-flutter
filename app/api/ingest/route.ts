import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager } from '@/lib/db';

const ingestApiKey = process.env.INGEST_API_KEY;

const torrentDataSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  magnetLink: z.string().url().optional(),
  infoHash: z.string().optional(),
  size: z.number().int().min(0).optional(),
  seeders: z.number().int().min(0).default(0),
  leechers: z.number().int().min(0).default(0),
  categoryName: z.string().optional(),
  posterUrl: z.string().url().optional(),
  files: z.array(z.object({
    name: z.string().min(1),
    path: z.string().optional(),
    size: z.number().int().min(0),
    index: z.number().int().min(0).optional(),
    isVideo: z.boolean().default(false),
  })).optional(),
  trackers: z.array(z.object({
    url: z.string().url(),
    isActive: z.boolean().default(true),
  })).optional(),
});

const batchIngestSchema = z.object({
  torrents: z.array(torrentDataSchema).min(1).max(100), // Limit batch size
});

function isVideoFile(filename: string): boolean {
  const videoExtensions = [
    '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm',
    '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts'
  ];
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return videoExtensions.includes(ext);
}

async function getOrCreateCategory(categoryName: string, db: any) {
  if (!categoryName) return null;

  // Try to find existing category by name (case-insensitive)
  const allCategories = await db.getAllCategories();
  let category = allCategories.find(c =>
    c.name.toLowerCase() === categoryName.toLowerCase()
  );

  if (!category) {
    // Create new category
    const slug = categoryName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || crypto.randomUUID();

    const newCategory = await db.createCategory({
      name: categoryName,
      slug: slug,
      description: `Category for ${categoryName} torrents`,
    });

    category = newCategory;

    // Cache the new category
    const cacheManager = getTorrentCacheManager();
    await cacheManager.cacheCategoryBySlug(category.slug, category);
  }

  return category;
}

async function processTorrentData(torrentData: z.infer<typeof torrentDataSchema>, db: any, cacheManager: any): Promise<string> {
  const category = torrentData.categoryName
    ? await getOrCreateCategory(torrentData.categoryName, db)
    : null;

  const categoryId = category?.id || null;

  // Check if torrent already exists by infoHash or magnetLink
  let existingTorrent = null;
  if (torrentData.infoHash) {
    existingTorrent = await db.searchTorrents('', 1, 0)
      .then(torrents => torrents.find(t => t.infoHash === torrentData.infoHash));
  } else if (torrentData.magnetLink) {
    existingTorrent = await db.searchTorrents('', 1, 0)
      .then(torrents => torrents.find(t => t.magnetLink === torrentData.magnetLink));
  }

  const torrentId = existingTorrent?.id || crypto.randomUUID();

  // Prepare torrent record
  const torrentRecord = {
    title: torrentData.title,
    description: torrentData.description,
    magnetLink: torrentData.magnetLink || '',
    infoHash: torrentData.infoHash,
    size: torrentData.size,
    seeders: torrentData.seeders,
    leechers: torrentData.leechers,
    categoryId,
    posterUrl: torrentData.posterUrl,
    isActive: true,
  };

  // Insert or update torrent using R1
  if (existingTorrent) {
    await db.updateTorrent(torrentId, torrentRecord);
  } else {
    await db.createTorrent(torrentRecord);
  }

  // Invalidate relevant caches
  await cacheManager.invalidateCachePattern('latest:*');
  await cacheManager.invalidateCachePattern('search:*');
  if (categoryId) {
    await cacheManager.invalidateCachePattern(`category:${category.slug}:*`);
  }

  // For simplicity, we're not implementing files and trackers in this version
  // In a real implementation, you would:
  // 1. Create TorrentFile and TorrentTracker tables in R1
  // 2. Insert the provided files and trackers
  // 3. Update the torrent record with file counts

  return torrentId;
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== ingestApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing API key',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = batchIngestSchema.parse(body);

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    const results = [];
    const errors = [];

    // Process each torrent in batch
    for (const torrentData of validatedData.torrents) {
      try {
        const torrentId = await processTorrentData(torrentData, db, cacheManager);
        results.push({
          success: true,
          torrentId,
          title: torrentData.title,
        });
      } catch (error) {
        console.error(`Error processing torrent "${torrentData.title}":`, error);
        errors.push({
          success: false,
          title: torrentData.title,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Invalidate all torrent caches after ingest
    await cacheManager.invalidateCachePattern('latest:*');
    await cacheManager.invalidateCachePattern('search:*');

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error('Ingest error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred during data ingestion',
        },
      },
      { status: 500 }
    );
  }
}