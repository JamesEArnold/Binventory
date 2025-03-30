import { NextRequest, NextResponse } from 'next/server';
import { createBinService, BinService } from '@/services/bin';
import { ApiResponse } from '@/types/api';
import { Bin } from '@/types/models';
import { AppError } from '@/utils/errors';

const defaultBinService = createBinService();

// GET /api/bins
export async function GET(request: NextRequest, binService: BinService = defaultBinService) {
  try {
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
    if (error instanceof Error && error.name === 'AppError') {
      const appError = error as AppError;
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
export async function POST(request: NextRequest, binService: BinService = defaultBinService) {
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

    const bin = await binService.create(body);
    
    const response: ApiResponse<Bin> = {
      success: true,
      data: bin,
    };
    
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'AppError') {
      const appError = error as AppError;
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