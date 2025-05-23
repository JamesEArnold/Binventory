import { NextRequest, NextResponse } from 'next/server';
import { createBinService, BinService } from '@/services/bin';
import { ApiResponse } from '@/types/api';
import { Bin } from '@/types/models';
import { isAppError } from '@/utils/errors';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/api/auth/[...nextauth]/route';

const defaultBinService = createBinService();

// GET /api/bins/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
  binService: BinService = defaultBinService
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        },
        { status: 400 }
      );
    }

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
    const bin = await binService.get(params.id, userId);
    const response: ApiResponse<Bin> = {
      success: true,
      data: bin,
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

// PUT /api/bins/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
  binService: BinService = defaultBinService
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        },
        { status: 400 }
      );
    }

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

    const bin = await binService.update(params.id, body, userId);
    const response: ApiResponse<Bin> = {
      success: true,
      data: bin,
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

// DELETE /api/bins/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
  binService: BinService = defaultBinService
) {
  try {
    if (!params?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: 'Missing id parameter',
          },
        },
        { status: 400 }
      );
    }

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
    
    await binService.delete(params.id, userId);
    const response: ApiResponse<null> = {
      success: true,
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