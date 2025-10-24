import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { torrent, category, torrentFile, torrentTracker, eq, and, ilike } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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

async function getOrCreateCategory(categoryName: string) {
  if (!categoryName) return null;

  // Try to find existing category by name (case-insensitive)
  let categoryRecord = await db
    .select()
    .from(category)
    .where(ilike(category.name, categoryName))
    .limit(1);

  if (categoryRecord.length === 0) {
    // Create new category
    const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newCategory = {
      id: crypto.randomUUID(),
      name: categoryName,
      slug: slug || crypto.randomUUID(),
      description: `Category for ${categoryName} torrents`,
    };

    await db.insert(category).values(newCategory);
    categoryRecord = await db
      .select()
      .from(category)
      .where(eq(category.id, newCategory.id));
  }

  return categoryRecord[0];
}

async function processTorrentData(torrentData: z.infer<typeof torrentDataSchema>): Promise<string> {
  const categoryId = torrentData.categoryName
    ? (await getOrCreateCategory(torrentData.categoryName))?.id
    : null;

  // Check if torrent already exists by infoHash or magnetLink
  let existingTorrent = null;
  if (torrentData.infoHash) {
    existingTorrent = await db
      .select()
      .from(torrent)
      .where(eq(torrent.infoHash, torrentData.infoHash))
      .limit(1);
  } else if (torrentData.magnetLink) {
    existingTorrent = await db
      .select()
      .from(torrent)
      .where(eq(torrent.magnetLink, torrentData.magnetLink))
      .limit(1);
  }

  const torrentId = existingTorrent?.[0]?.id || crypto.randomUUID();

  // Prepare torrent record
  const torrentRecord = {
    id: torrentId,
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

  // Insert or update torrent
  if (existingTorrent && existingTorrent.length > 0) {
    await db
      .update(torrent)
      .set({ ...torrentRecord, updatedAt: new Date() })
      .where(eq(torrent.id, torrentId));
  } else {
    await db.insert(torrent).values(torrentRecord);
  }

  // Process files if provided
  if (torrentData.files && torrentData.files.length > 0) {
    // Delete existing files for this torrent
    await db.delete(torrentFile).where(eq(torrentFile.torrentId, torrentId));

    // Insert new files
    const fileRecords = torrentData.files.map((file, index) => ({
      id: crypto.randomUUID(),
      torrentId,
      name: file.name,
      path: file.path,
      size: file.size,
      index: file.index ?? index,
      isVideo: file.isVideo || isVideoFile(file.name),
    }));

    await db.insert(torrentFile).values(fileRecords);
  }

  // Process trackers if provided
  if (torrentData.trackers && torrentData.trackers.length > 0) {
    // Delete existing trackers for this torrent
    await db.delete(torrentTracker).where(eq(torrentTracker.torrentId, torrentId));

    // Insert new trackers
    const trackerRecords = torrentData.trackers.map((tracker) => ({
      id: crypto.randomUUID(),
      torrentId,
      url: tracker.url,
      isActive: tracker.isActive,
    }));

    await db.insert(torrentTracker).values(trackerRecords);
  }

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

    const results = [];
    const errors = [];

    // Process each torrent in the batch
    for (const torrentData of validatedData.torrents) {
      try {
        const torrentId = await processTorrentData(torrentData);
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