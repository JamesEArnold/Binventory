import { NextRequest, NextResponse } from 'next/server';
import { createCategoryService } from '@/services/category';
import { ApiResponse } from '@/types/api';
import { Category } from '@prisma/client';
import { isAppError } from '@/utils/errors';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Export service for testing
export const categoryService = createCategoryService();

// GET /api/categories
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
    const categories = await categoryService.list(userId);

    const response: ApiResponse<Category[]> = {
      success: true,
      data: categories,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (isAppError(error)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
      return NextResponse.json(response, { status: error.httpStatus });
    }
    throw error;
  }
}

// POST /api/categories
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
    
    // Verify that the user exists in the database
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    if (!userExists) {
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

    // Add the user ID to the category data
    const categoryData = {
      ...body,
      userId,
    };

    const category = await categoryService.create(categoryData);
    
    const response: ApiResponse<Category> = {
      success: true,
      data: category,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
      return NextResponse.json(response, { status: error.httpStatus });
    }
    throw error;
  }
} 