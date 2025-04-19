import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/api/auth/[...nextauth]/route';
import { organizationService } from '@/services/organization';
import { ApiResponse } from '@/types/api';
import { UpdateOrganizationMemberData, OrgRole } from '@/types/organization';

// Schema for validating member role update
const updateMemberSchema = z.object({
  role: z.nativeEnum(OrgRole),
});

/**
 * PATCH /api/organizations/[id]/members/[memberId]
 * Update a member's role in the organization
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to update member roles',
        }
      }, { status: 401 });
    }
    
    // Parse and validate request body
    const body = await request.json();
    
    try {
      const validatedData = updateMemberSchema.parse(body);
      
      const organizationWithMembers = await organizationService.updateOrganizationMember(
        params.id,
        params.memberId,
        validatedData as UpdateOrganizationMemberData,
        session.user.id
      );
      
      return NextResponse.json<ApiResponse<typeof organizationWithMembers>>({
        success: true,
        data: organizationWithMembers,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid role data',
            details: validationError.format(),
          }
        }, { status: 400 });
      }
      throw validationError;
    }
  } catch (error: unknown) {
    console.error('Error updating organization member:', error);
    
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
        message: 'Failed to update organization member',
      }
    }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]/members/[memberId]
 * Remove a member from the organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to remove members',
        }
      }, { status: 401 });
    }
    
    await organizationService.removeOrganizationMember(
      params.id,
      params.memberId,
      session.user.id
    );
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error: unknown) {
    console.error('Error removing organization member:', error);
    
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
        message: 'Failed to remove organization member',
      }
    }, { status: 500 });
  }
} 