import { NextRequest, NextResponse } from 'next/server';
import { createBinService } from '@/services/bin';
import { ApiResponse } from '@/types/api';
import { Bin } from '@/types/models';
import { isAppError } from '@/utils/errors';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const binService = createBinService();

// GET /api/bins
export async function GET(request: NextRequest) {
  try {
    // Get the current user from the session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const location = searchParams.get('location');
    const search = searchParams.get('search');

    const result = await binService.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      location: location || undefined,
      search: search || undefined,
      userId,
    });

    const response: ApiResponse<Bin[]> = {
      success: true,
      data: result.bins,
      meta: {
        pagination: result.pagination,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError' && isAppError(error)) {
      const appError = error;
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      };
      return NextResponse.json(response, { status: appError.httpStatus });
    }
    throw error;
  }
}

// POST /api/bins
export async function POST(request: NextRequest) {
  try {
    // Get the current user from the session
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // DEBUG INFO
    console.log('Session user information:', {
      id: userId,
      email: session.user.email,
      role: session.user.role
    });
    
    // Verify that the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    console.log('User found in database:', !!userExists);
    
    if (!userExists) {
      console.error(`User with ID ${userId} from session not found in database`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Your user account was not found in the database. Please log out and log in again.',
          },
        },
        { status: 404 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
          },
        },
        { status: 400 }
      );
    }

    // Add the user ID to the bin data
    const binData = {
      ...body,
      userId,
    };

    const bin = await binService.create(binData);
    
    const response: ApiResponse<Bin> = {
      success: true,
      data: bin,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in POST /api/bins:', error);
    
    if (error instanceof Error && error.name === 'AppError' && isAppError(error)) {
      const appError = error;
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      };
      return NextResponse.json(response, { status: appError.httpStatus });
    }
    
    // Check for Prisma errors
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'The referenced user does not exist. Please log out and log in again.',
        }
      }, { status: 400 });
    }
    
    throw error;
  }
} 