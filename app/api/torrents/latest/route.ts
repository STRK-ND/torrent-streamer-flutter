import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager, withCache, CACHE_CONFIGS } from '@/lib/db';

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

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Try to get results from cache first
    const cacheKey = `latest:${validatedQuery.category || 'all'}:${validatedQuery.timeframe}:${validatedQuery.page}:${validatedQuery.limit}`;

    const cachedResults = await withCache(
      cacheKey,
      async () => {
        let torrents = [];

        // Build query based on filters
        if (validatedQuery.category) {
          // Get category-specific torrents
          const category = await db.getAllCategories()
            .then(categories => categories.find(c => c.slug === validatedQuery.category));

          if (category) {
            torrents = await db.getTorrentsByCategory(
              category.id,
              validatedQuery.limit,
              (validatedQuery.page - 1) * validatedQuery.limit
            );
          }
        } else {
          // Get all latest torrents
          torrents = await db.getLatestTorrents(
            validatedQuery.limit,
            (validatedQuery.page - 1) * validatedQuery.limit
          );
        }

        // Apply timeframe filtering (client-side for simplicity)
        const now = new Date();
        let filteredTorrents = torrents;

        switch (validatedQuery.timeframe) {
          case 'day':
            filteredTorrents = torrents.filter(t =>
              new Date(t.createdAt) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
            );
            break;
          case 'week':
            filteredTorrents = torrents.filter(t =>
              new Date(t.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            );
            break;
          case 'month':
            filteredTorrents = torrents.filter(t =>
              new Date(t.createdAt) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            );
            break;
          case 'all':
          default:
            // No filtering
            break;
        }

        // Cache the results
        if (validatedQuery.category) {
          await cacheManager.cacheCategoryTorrents(
            validatedQuery.category,
            validatedQuery.limit,
            (validatedQuery.page - 1) * validatedQuery.limit,
            filteredTorrents
          );
        } else {
          await cacheManager.cacheLatestTorrents(
            validatedQuery.limit,
            (validatedQuery.page - 1) * validatedQuery.limit,
            filteredTorrents
          );
        }

        return filteredTorrents;
      },
      { ...CACHE_CONFIGS.SHORT_TERM, metadata: { type: 'latest_torrents', timeframe: validatedQuery.timeframe } }
    );

    // For simplicity, estimate total count
    const totalCount = cachedResults.length >= validatedQuery.limit ?
      ((validatedQuery.page - 1) * validatedQuery.limit) + cachedResults.length + 200 : // Estimate
      ((validatedQuery.page - 1) * validatedQuery.limit) + cachedResults.length;

    // Format response
    const totalPages = Math.ceil(totalCount / validatedQuery.limit);
    const hasNextPage = validatedQuery.page < totalPages;
    const hasPreviousPage = validatedQuery.page > 1;

    return NextResponse.json({
      success: true,
      data: {
        torrents: cachedResults,
        pagination: {
          currentPage: validatedQuery.page,
          totalPages,
          totalCount,
          limit: validatedQuery.limit,
          hasNextPage,
          hasPreviousPage,
        },
        filters: {
          category: validatedQuery.category,
          timeframe: validatedQuery.timeframe,
        },
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