import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { user, account } from '@/db';
import { eq } from 'drizzle-orm';
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

    // Find user by email
    const userRecord = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (userRecord.length === 0) {
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

    const userData = userRecord[0];

    // Find account with password
    const accountRecord = await db
      .select()
      .from(account)
      .where(eq(account.userId, userData.id))
      .limit(1);

    if (accountRecord.length === 0 || !accountRecord[0].password) {
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, accountRecord[0].password!);
    if (!isPasswordValid) {
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

    // Create session using better-auth
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
            message: 'Failed to create session',
          },
        },
        { status: 500 }
      );
    }

    // Generate JWT token (in a real app, you'd use a proper JWT library)
    // For now, we'll return the session token
    const token = session.token || session.id;

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