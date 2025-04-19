import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { organizationService } from '@/services/organization';
import { ApiResponse } from '@/types/api';
import { AddOrganizationMemberData, OrgRole } from '@/types/organization';

// Schema for validating member addition request
const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(OrgRole).optional(),
});

/**
 * GET /api/organizations/[id]/members
 * List all members of an organization
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
          message: 'You must be logged in to access organization members',
        }
      }, { status: 401 });
    }
    
    const organizationWithMembers = await organizationService.listOrganizationMembers(
      params.id,
      session.user.id
    );
    
    return NextResponse.json<ApiResponse<typeof organizationWithMembers>>({
      success: true,
      data: organizationWithMembers,
    });
  } catch (error: unknown) {
    console.error('Error fetching organization members:', error);
    
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
        message: 'Failed to fetch organization members',
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a new member to the organization
 */
export async function POST(
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
          message: 'You must be logged in to add members to this organization',
        }
      }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = addMemberSchema.parse(body);
      
      const organizationWithMembers = await organizationService.addOrganizationMember(
        params.id,
        validatedData as AddOrganizationMemberData,
        session.user.id
      );
      
      return NextResponse.json<ApiResponse<typeof organizationWithMembers>>({
        success: true,
        data: organizationWithMembers,
      }, { status: 201 });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid member data',
            details: validationError.format(),
          }
        }, { status: 400 });
      }
      throw validationError;
    }
  } catch (error: unknown) {
    console.error('Error adding organization member:', error);
    
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
        message: 'Failed to add organization member',
      }
    }, { status: 500 });
  }
} 