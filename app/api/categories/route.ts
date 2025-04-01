import { NextRequest, NextResponse } from 'next/server';
import { createCategoryService } from '@/services/category';
import { ApiResponse } from '@/types/api';
import { Category } from '@prisma/client';
import { isAppError } from '@/utils/errors';

// Export service for testing
export const categoryService = createCategoryService();

// GET /api/categories
export async function GET() {
  try {
    const categories = await categoryService.list();

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

    const category = await categoryService.create(body);
    
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