import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager } from '@/lib/db';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password } = signInSchema.parse(body);

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Find user by email (first try cache)
    let userData = await cacheManager.getUser(email);

    if (!userData) {
      // Not in cache, try database
      userData = await db.findUserByEmail(email);

      if (!userData) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          },
          { status: 401 }
        );
      }

      // Cache user for future requests
      await cacheManager.cacheUser(userData.id, userData);
    }

    // For this implementation, we're using better-auth's built-in password handling
    // In a real implementation with separate password storage, you would:
    // 1. Fetch password hash from an accounts table
    // 2. Verify it using bcrypt.compare()
    // For now, let better-auth handle the password verification

    // Create session using better-auth (this will use our R1 adapter)
    const session = await auth.api.session({
      body: {
        email,
        password,
      },
      headers: {
        // Add request metadata for security
        'x-forwarded-for': request.headers.get('x-forwarded-for') || undefined,
        'user-agent': request.headers.get('user-agent') || undefined,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_CREATION_FAILED',
            message: 'Failed to create session',
          },
        },
        { status: 500 }
      );
    }

    // Generate token
    const token = session.token || session.id;

    // Cache session in KV for faster access
    if (token) {
      await cacheManager.cacheUserSession(token, {
        userId: userData.id,
        email: userData.email,
        expiresAt: session.expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Sign in error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
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
          message: 'An error occurred during sign in',
        },
      },
      { status: 500 }
    );
  }
}