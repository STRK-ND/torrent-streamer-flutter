import { NextRequest, NextResponse } from 'next/server';
import { getTorrentCacheManager } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required',
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const cacheManager = getTorrentCacheManager();

    // Revoke session using better-auth
    const revokedSession = await auth.api.signOut({
      headers: request.headers,
    });

    // Invalidate cached session
    await cacheManager.invalidateUserSession(token);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Successfully logged out',
        revokedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred during logout',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Alternative HTTP method for logout
  return POST(request);
}