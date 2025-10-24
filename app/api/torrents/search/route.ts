import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { torrent, category, torrentFile, sql, and, ilike, desc, eq, isNull } from 'drizzle-orm';
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

    // Build search conditions
    const searchConditions = [
      ilike(torrent.title, `%${validatedQuery.query}%`),
      eq(torrent.isActive, true),
    ];

    // Add category filter if provided
    if (validatedQuery.category) {
      searchConditions.push(ilike(category.slug, validatedQuery.category));
    }

    // Calculate pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;

    // Build sort order
    let orderBy;
    switch (validatedQuery.sortBy) {
      case 'title':
        orderBy = validatedQuery.sortOrder === 'asc'
          ? torrent.title
          : desc(torrent.title);
        break;
      case 'seeders':
        orderBy = validatedQuery.sortOrder === 'asc'
          ? torrent.seeders
          : desc(torrent.seeders);
        break;
      case 'size':
        orderBy = validatedQuery.sortOrder === 'asc'
          ? torrent.size
          : desc(torrent.size);
        break;
      case 'createdAt':
      default:
        orderBy = validatedQuery.sortOrder === 'asc'
          ? torrent.createdAt
          : desc(torrent.createdAt);
        break;
    }

    // Execute search query with pagination
    const searchResults = await db
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
        fileCount: sql<number>`count(${torrentFile.id})`.mapWith(Number),
        totalSize: sql<number>`sum(${torrentFile.size})`.mapWith(Number),
      })
      .from(torrent)
      .leftJoin(category, eq(torrent.categoryId, category.id))
      .leftJoin(torrentFile, eq(torrent.id, torrentFile.torrentId))
      .where(and(...searchConditions))
      .groupBy(torrent.id, category.id)
      .orderBy(orderBy)
      .limit(validatedQuery.limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(torrent)
      .leftJoin(category, eq(torrent.categoryId, category.id))
      .where(and(...searchConditions));

    const totalCount = totalCountResult[0]?.count || 0;

    // Format response
    const totalPages = Math.ceil(totalCount / validatedQuery.limit);
    const hasNextPage = validatedQuery.page < totalPages;
    const hasPreviousPage = validatedQuery.page > 1;

    return NextResponse.json({
      success: true,
      data: {
        torrents: searchResults,
        pagination: {
          currentPage: validatedQuery.page,
          totalPages,
          totalCount,
          limit: validatedQuery.limit,
          hasNextPage,
          hasPreviousPage,
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