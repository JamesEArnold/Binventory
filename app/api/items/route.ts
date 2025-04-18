import { NextRequest, NextResponse } from 'next/server';
import { createItemService } from '@/services/item';
import { ApiResponse } from '@/types/api';
import { Item } from '@prisma/client';
import { isAppError } from '@/utils/errors';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Export service for testing
export const itemService = createItemService();

// GET /api/items
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
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');

    const result = await itemService.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
      userId
    });

    const response: ApiResponse<Item[]> = {
      success: true,
      data: result.items,
      meta: {
        pagination: result.pagination,
      },
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

// POST /api/items
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
    } catch (err) {
      console.error('Invalid JSON in request body:', err);
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

    // Add the user ID to the item data
    const itemData = {
      ...body,
      userId,
    };

    const item = await itemService.create(itemData);
    
    const response: ApiResponse<Item> = {
      success: true,
      data: item,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
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