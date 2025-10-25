import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { torrent, category, sql, and, eq, desc, ilike } from 'drizzle-orm';

const latestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('all'),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      category: searchParams.get('category') || undefined,
      timeframe: searchParams.get('timeframe') || 'all',
    };

    // Validate query parameters
    const validatedQuery = latestQuerySchema.parse(queryParams);

    // Build conditions
    const conditions = [
      eq(torrent.isActive, true),
    ];

    // Add category filter if provided
    if (validatedQuery.category) {
      conditions.push(ilike(category.slug, validatedQuery.category));
    }

    // Add timeframe filter
    let timeCondition;
    const now = new Date();
    switch (validatedQuery.timeframe) {
      case 'day':
        timeCondition = sql`${torrent.createdAt} >= ${new Date(now.getTime() - 24 * 60 * 60 * 1000)}`;
        break;
      case 'week':
        timeCondition = sql`${torrent.createdAt} >= ${new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)}`;
        break;
      case 'month':
        timeCondition = sql`${torrent.createdAt} >= ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)}`;
        break;
      case 'all':
      default:
        timeCondition = null;
        break;
    }

    if (timeCondition) {
      conditions.push(timeCondition);
    }

    // Calculate pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;

    // Execute query
    const latestTorrents = await db
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
        },
      })
      .from(torrent)
      .leftJoin(category, eq(torrent.categoryId, category.id))
      .where(and(...conditions))
      .orderBy(desc(torrent.createdAt))
      .limit(validatedQuery.limit)
      .offset(offset);

    // Get total count
    const totalCountResult = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(torrent)
      .leftJoin(category, eq(torrent.categoryId, category.id))
      .where(and(...conditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Format response
    const totalPages = Math.ceil(totalCount / validatedQuery.limit);
    const hasNextPage = validatedQuery.page < totalPages;
    const hasPreviousPage = validatedQuery.page > 1;

    return NextResponse.json({
      success: true,
      data: {
        torrents: latestTorrents,
        pagination: {
          currentPage: validatedQuery.page,
          totalPages,
          totalCount,
          limit: validatedQuery.limit,
          hasNextPage,
          hasPreviousPage,
        },
        timeframe: validatedQuery.timeframe,
      },
    });
  } catch (error) {
    console.error('Latest torrents error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
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
          message: 'An error occurred while fetching latest torrents',
        },
      },
      { status: 500 }
    );
  }
}