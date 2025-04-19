import { NextRequest, NextResponse } from 'next/server';
import { categoryService } from '../route';
import { ApiResponse } from '@/types/api';
import { Category } from '@prisma/client';
import { isAppError } from '@/utils/errors';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/api/auth/[...nextauth]/route';

// GET /api/categories/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the current user from the session
    const session = await getServerSession(authOptions);
    const id = await params.id;
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
    const category = await categoryService.get(id, userId);

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

// PUT /api/categories/:id
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const category = await categoryService.update(params.id, body, userId);

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
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    await categoryService.delete(params.id, userId);

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