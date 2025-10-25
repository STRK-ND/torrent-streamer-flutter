import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getR1Client, getTorrentCacheManager } from '@/lib/db';
import { auth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password, name } = signUpSchema.parse(body);

    const db = getR1Client();
    const cacheManager = getTorrentCacheManager();

    // Check if user already exists (first try cache)
    const cachedUser = await cacheManager.getUser(email);
    if (cachedUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'A user with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Check in database
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      // Cache the user to prevent future database hits
      await cacheManager.cacheUser(existingUser.id, existingUser);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_ALREADY_EXISTS',
            message: 'A user with this email already exists',
          },
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user using better-auth (this will use our R1 adapter)
    const newUser = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!newUser || !newUser.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_CREATION_FAILED',
            message: 'Failed to create user account',
          },
        },
        { status: 500 }
      );
    }

    // Cache the new user for faster access
    await cacheManager.cacheUser(newUser.user.id, newUser.user);

    // Create session
    const session = await auth.api.session({
      body: {
        email,
        password,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SESSION_CREATION_FAILED',
            message: 'Account created but failed to create session',
          },
        },
        { status: 500 }
      );
    }

    // Cache the session in KV for faster access
    const token = session.token || session.id;
    if (token) {
      await cacheManager.cacheUserSession(token, {
        userId: newUser.user.id,
        email: newUser.user.email,
        expiresAt: session.expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: newUser.user,
        token,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);

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
          message: 'An error occurred during sign up',
        },
      },
      { status: 500 }
    );
  }
}