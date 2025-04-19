import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { organizationService } from '@/services/organization';
import { ApiResponse } from '@/types/api';
import { CreateOrganizationData } from '@/types/organization';

// Schema for validating organization creation request
const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
});

/**
 * GET /api/organizations
 * Get all organizations the current user is a member of
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access organizations',
        }
      }, { status: 401 });
    }
    
    const organizations = await organizationService.listUserOrganizations(session.user.id);
    
    return NextResponse.json<ApiResponse<typeof organizations>>({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch organizations',
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to create an organization',
        }
      }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = createOrganizationSchema.parse(body);
      
      const organization = await organizationService.createOrganization(
        validatedData as CreateOrganizationData,
        session.user.id
      );
      
      return NextResponse.json<ApiResponse<typeof organization>>({
        success: true,
        data: organization,
      }, { status: 201 });
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
    console.error('Error creating organization:', error);
    
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
        message: 'Failed to create organization',
      }
    }, { status: 500 });
  }
} 