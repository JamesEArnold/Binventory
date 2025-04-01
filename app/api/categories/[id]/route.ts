import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '../route';
import { ApiResponse } from '@/types/api';
import { Category } from '@prisma/client';
import { isAppError } from '@/utils/errors';

// GET /api/categories/:id
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const category = await categoryService.get(params.id);

    const response: ApiResponse<Category> = {
      success: true,
      data: category,
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

// PATCH /api/categories/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const category = await categoryService.update(params.id, body);

    const response: ApiResponse<Category> = {
      success: true,
      data: category,
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

// DELETE /api/categories/:id
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await categoryService.delete(params.id);

    return NextResponse.json({ success: true }, { status: 200 });
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