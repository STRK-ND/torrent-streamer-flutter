import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager, withCache, CACHE_CONFIGS } from '@/lib/db';
import { auth } from '@/lib/auth';

const searchQuerySchema = z.object({
  query: z.string().min(1).max(255),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'title', 'seeders', 'size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      query: searchParams.get('q') || '',
      category: searchParams.get('category') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    // Validate query parameters
    const validatedQuery = searchQuerySchema.parse(queryParams);

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Try to get results from cache first (short-term cache for search results)
    const cacheKey = `search:${validatedQuery.query}:${validatedQuery.category || 'all'}:${validatedQuery.page}:${validatedQuery.limit}:${validatedQuery.sortBy}:${validatedQuery.sortOrder}`;

    const cachedResults = await withCache(
      cacheKey,
      async () => {
        let torrents = [];

        // Build search query based on filters
        if (validatedQuery.category) {
          // Search within specific category
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
          // Search all torrents
          torrents = await db.searchTorrents(
            validatedQuery.query,
            validatedQuery.limit,
            (validatedQuery.page - 1) * validatedQuery.limit
          );
        }

        // Apply additional sorting if needed (client-side since R1 implementation might be simpler)
        if (validatedQuery.sortBy !== 'createdAt') {
          torrents = torrents.sort((a, b) => {
            const aValue = a[validatedQuery.sortBy];
            const bValue = b[validatedQuery.sortBy];

            if (aValue === undefined || bValue === undefined) return 0;

            if (validatedQuery.sortOrder === 'asc') {
              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
          });
        }

        // Cache the search results
        await cacheManager.cacheTorrentSearch(
          validatedQuery.query,
          validatedQuery.limit,
          (validatedQuery.page - 1) * validatedQuery.limit,
          torrents
        );

        return torrents;
      },
      { ...CACHE_CONFIGS.SHORT_TERM, metadata: { type: 'search_results', query: validatedQuery } }
    );

    // For simplicity, we'll implement basic pagination count
    // In a real implementation, you'd want to do a separate count query
    const totalCount = cachedResults.length >= validatedQuery.limit ?
      ((validatedQuery.page - 1) * validatedQuery.limit) + cachedResults.length + 100 : // Estimate
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
          query: validatedQuery.query,
          category: validatedQuery.category,
          sortBy: validatedQuery.sortBy,
          sortOrder: validatedQuery.sortOrder,
        },
      },
    });
  } catch (error) {
    console.error('Torrent search error:', error);

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
          message: 'An error occurred while searching torrents',
        },
      },
      { status: 500 }
    );
  }
}