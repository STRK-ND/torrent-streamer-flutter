import { NextRequest, NextResponse } from 'next/server';
import { getR1Client, getTorrentCacheManager } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // First try to get session from cache
    const cachedSession = await cacheManager.getUserSession(token);

    if (!cachedSession) {
      // Not in cache, try better-auth session validation
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session || !session.user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired token',
            },
          },
          { status: 401 }
        );
      }

      // Cache the session for future requests
      const newToken = session.token || session.id;
      if (newToken) {
        await cacheManager.cacheUserSession(newToken, {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expiresAt,
        });
      }
    }

    // Get fresh user data (first try cache)
    let userData = await cacheManager.getUser(cachedSession?.userId || '');

    if (!userData) {
      // Not in cache, get from database
      const db = getR1Client();

      // Extract user ID from session - in real implementation, this would come from better-auth
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session || !session.user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired token',
            },
          },
          { status: 401 }
        );
      }

      userData = await db.findUserById(session.user.id);

      if (!userData) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
            },
          },
          { status: 404 }
        );
      }

      // Cache user data for future requests
      await cacheManager.cacheUser(userData.id, userData);
    }

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Get user error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching user data',
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    // Verify session using better-auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body for fields to update
    const body = await request.json();
    const allowedFields = ['name', 'image'];
    const updateData: any = {};
    let hasValidFields = false;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
        hasValidFields = true;
      }
    }

    if (!hasValidFields) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields to update',
          },
        },
        { status: 400 }
      );
    }

    // Update user data using better-auth (this will use our R1 adapter)
    const updatedUser = await auth.api.updateUser({
      body: updateData,
    });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update user profile',
          },
        },
        { status: 500 }
      );
    }

    // Invalidate cache for this user so fresh data is loaded next time
    const cacheManager = getTorrentCacheManager();
    await cacheManager.invalidateUserCache(session.user.id, session.user.email);

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while updating user data',
        },
      },
      { status: 500 }
    );
  }
}