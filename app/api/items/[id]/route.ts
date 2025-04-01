import { NextRequest, NextResponse } from 'next/server';
import { itemService } from '../route';
import { ApiResponse } from '@/types/api';
import { Item } from '@prisma/client';
import { isAppError } from '@/utils/errors';

// GET /api/items/:id
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await itemService.get(params.id);

    const response: ApiResponse<Item> = {
      success: true,
      data: item,
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

// PATCH /api/items/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    const item = await itemService.update(params.id, body);

    const response: ApiResponse<Item> = {
      success: true,
      data: item,
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

// DELETE /api/items/:id
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await itemService.delete(params.id);

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