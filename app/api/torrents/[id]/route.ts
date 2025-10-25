import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { torrent, category, torrentFile, torrentTracker, eq, and, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const idParamsSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get and validate torrent ID
    const { id: torrentId } = await params;
    const validatedParams = idParamsSchema.parse({ id: torrentId });

    // Fetch torrent details
    const torrentDetails = await db
      .select({
        id: torrent.id,
        title: torrent.title,
        description: torrent.description,
        magnetLink: torrent.magnetLink,
        infoHash: torrent.infoHash,
        size: torrent.size,
        seeders: torrent.seeders,
        leechers: torrent.leechers,
        posterUrl: torrent.posterUrl,
        createdAt: torrent.createdAt,
        updatedAt: torrent.updatedAt,
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
        },
        fileCount: sql<number>`count(${torrentFile.id})`.mapWith(Number),
        totalSize: sql<number>`sum(${torrentFile.size})`.mapWith(Number),
      })
      .from(torrent)
      .leftJoin(category, eq(torrent.categoryId, category.id))
      .leftJoin(torrentFile, eq(torrent.id, torrentFile.torrentId))
      .where(and(eq(torrent.id, validatedParams.id), eq(torrent.isActive, true)))
      .groupBy(torrent.id, category.id);

    if (torrentDetails.length === 0) {
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

    const torrentData = torrentDetails[0];

    // Fetch files for this torrent
    const files = await db
      .select({
        id: torrentFile.id,
        name: torrentFile.name,
        path: torrentFile.path,
        size: torrentFile.size,
        index: torrentFile.index,
        isVideo: torrentFile.isVideo,
        createdAt: torrentFile.createdAt,
      })
      .from(torrentFile)
      .where(eq(torrentFile.torrentId, validatedParams.id))
      .orderBy(torrentFile.index);

    // Fetch trackers for this torrent
    const trackers = await db
      .select({
        id: torrentTracker.id,
        url: torrentTracker.url,
        isActive: torrentTracker.isActive,
        createdAt: torrentTracker.createdAt,
      })
      .from(torrentTracker)
      .where(and(
        eq(torrentTracker.torrentId, validatedParams.id),
        eq(torrentTracker.isActive, true)
      ));

    // Construct magnet link if infoHash is available but magnetLink is not
    let magnetLink = torrentData.magnetLink;
    if (!magnetLink && torrentData.infoHash) {
      const trackerUrls = trackers.map(t => t.url).join('&tr=');
      magnetLink = `magnet:?xt=urn:btih:${torrentData.infoHash}`;
      if (trackerUrls) {
        magnetLink += `&tr=${trackerUrls}`;
      }
    }

    // Format response
    return NextResponse.json({
      success: true,
      data: {
        ...torrentData,
        magnetLink,
        files: files.map(file => ({
          ...file,
          sizeFormatted: formatFileSize(file.size),
          extension: getFileExtension(file.name),
        })),
        trackers: trackers,
        stats: {
          totalFiles: files.length,
          videoFiles: files.filter(f => f.isVideo).length,
          totalSizeFormatted: formatFileSize(torrentData.totalSize || 0),
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