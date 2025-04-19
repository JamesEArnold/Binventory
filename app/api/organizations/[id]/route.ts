import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { organizationService } from '@/services/organization';
import { ApiResponse } from '@/types/api';
import { UpdateOrganizationData } from '@/types/organization';

// Schema for validating organization update request
const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

/**
 * GET /api/organizations/[id]
 * Get a specific organization by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this organization',
        }
      }, { status: 401 });
    }
    
    const organization = await organizationService.getOrganization(
      params.id,
      session.user.id
    );
    
    return NextResponse.json<ApiResponse<typeof organization>>({
      success: true,
      data: organization,
    });
  } catch (error: unknown) {
    console.error('Error fetching organization:', error);
    
    // Handle specific error types from the service
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      const typedError = error as { code: string; message: string; httpStatus?: number };
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: typedError.code,
          message: typedError.message,
        }
      }, { status: typedError.httpStatus || 500 });
    }
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch organization',
      }
    }, { status: 500 });
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update a specific organization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to update this organization',
        }
      }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = updateOrganizationSchema.parse(body);
      
      const organization = await organizationService.updateOrganization(
        params.id,
        validatedData as UpdateOrganizationData,
        session.user.id
      );
      
      return NextResponse.json<ApiResponse<typeof organization>>({
        success: true,
        data: organization,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid organization data',
            details: validationError.format(),
          }
        }, { status: 400 });
      }
      throw validationError;
    }
  } catch (error: unknown) {
    console.error('Error updating organization:', error);
    
    // Handle specific error types from the service
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      const typedError = error as { code: string; message: string; httpStatus?: number };
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: typedError.code,
          message: typedError.message,
        }
      }, { status: typedError.httpStatus || 500 });
    }
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update organization',
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete a specific organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to delete this organization',
        }
      }, { status: 401 });
    }
    
    await organizationService.deleteOrganization(
      params.id,
      session.user.id
    );
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error: unknown) {
    console.error('Error deleting organization:', error);
    
    // Handle specific error types from the service
    if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
      const typedError = error as { code: string; message: string; httpStatus?: number };
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: typedError.code,
          message: typedError.message,
        }
      }, { status: typedError.httpStatus || 500 });
    }
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete organization',
      }
    }, { status: 500 });
  }
} 