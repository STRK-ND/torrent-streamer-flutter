import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager, withCache, CACHE_CONFIGS } from '@/lib/db';
import { auth } from '@/lib/auth';

const idParamsSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
});

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
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
  }

  return category;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get and validate torrent ID
    const { id: torrentId } = await params;
    const validatedParams = idParamsSchema.parse({ id: torrentId });

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Try to get torrent from cache first
    const cachedTorrent = await withCache(
      `torrent:${validatedParams.id}`,
      async () => {
        const torrent = await db.getTorrentById(validatedParams.id);

        if (torrent) {
          // Cache the torrent metadata
          if (torrent.infoHash) {
            await cacheManager.cacheTorrentMetadata(torrent.infoHash, {
              id: torrent.id,
              title: torrent.title,
              description: torrent.description,
              size: torrent.size,
              seeders: torrent.seeders,
              leechers: torrent.leechers,
              posterUrl: torrent.posterUrl,
              createdAt: torrent.createdAt,
            });
          }
        }

        return torrent;
      },
      { ...CACHE_CONFIGS.MEDIUM_TERM, metadata: { type: 'torrent_details' } }
    );

    if (!cachedTorrent) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TORRENT_NOT_FOUND',
            message: 'Torrent not found or inactive',
          },
        },
        { status: 404 }
      );
    }

    // For this implementation, we'll simulate files and trackers data
    // In a real implementation, you'd have separate tables and queries for these
    const files = []; // Would come from db.getTorrentFiles(torrentId)
    const trackers = []; // Would come from db.getTorrentTrackers(torrentId)

    // Construct magnet link if infoHash is available but magnetLink is not
    let magnetLink = cachedTorrent.magnetLink;
    if (!magnetLink && cachedTorrent.infoHash) {
      const trackerUrls = trackers.map(t => t.url).join('&tr=');
      magnetLink = `magnet:?xt=urn:btih:${cachedTorrent.infoHash}`;
      if (trackerUrls) {
        magnetLink += `&tr=${trackerUrls}`;
      }
    }

    // Record user activity if authenticated
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await cacheManager.getUserSession(token);

      if (session) {
        // Record that the user viewed this torrent
        await db.recordUserActivity({
          userId: session.userId,
          torrentId: cachedTorrent.id,
          activity: 'viewed',
        });
      }
    }

    // Format response
    return NextResponse.json({
      success: true,
      data: {
        ...cachedTorrent,
        magnetLink,
        files: files.map(file => ({
          ...file,
          sizeFormatted: formatFileSize(file.size || 0),
          extension: getFileExtension(file.name || ''),
        })),
        trackers,
        stats: {
          totalFiles: files.length,
          videoFiles: files.filter(f => f.isVideo).length,
          totalSizeFormatted: formatFileSize(cachedTorrent.size || 0),
        },
      },
    });
  } catch (error) {
    console.error('Torrent details error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid torrent ID',
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
          message: 'An error occurred while fetching torrent details',
        },
      },
      { status: 500 }
    );
  }
}