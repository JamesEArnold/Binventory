import { NextRequest, NextResponse } from 'next/server';
import { createPermissionService } from '@/services/permission';
import { getSession } from '@/lib/auth';
import { 
  ObjectType, 
  SubjectType,
  Action
} from '@/types/permission';

// Create permission service
const permissionService = createPermissionService();

/**
 * Helper to validate object type
 */
function validateObjectType(type: string): type is ObjectType {
  return Object.values(ObjectType).includes(type as ObjectType);
}

/**
 * GET /api/objects/[type]/[id]/shared-status
 * Check if an object is shared with users/organizations outside the owner
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Validate object type parameter
    if (!validateObjectType(type)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid object type' } },
        { status: 400 }
      );
    }

    const objectType = type as ObjectType;
    const objectId = id;
    const userId = session.user.id;

    // Check if user has access to the object
    const hasAccess = await permissionService.canAccess({
      userId,
      objectType,
      objectId,
      action: Action.READ
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Get all permissions for this object
    const permissions = await permissionService.getPermissions({
      objectType,
      objectId
    });

    // Get the searchParams for organization context
    const { searchParams } = new URL(req.url);
    const contextType = searchParams.get('contextType') || 'personal';
    const organizationId = searchParams.get('organizationId') || undefined;

    // Determine if the object is shared based on context
    let isShared = false;

    if (contextType === 'organization' && organizationId) {
      // In organization context, check if shared outside this organization
      isShared = permissions.some(perm => 
        // Shared with other users directly
        (perm.subjectType === SubjectType.USER && perm.subjectId !== userId) ||
        // Shared with other organizations
        (perm.subjectType === SubjectType.ORGANIZATION && perm.subjectId !== organizationId)
      );
    } else {
      // In personal context, check if shared with anyone else
      isShared = permissions.some(perm => 
        // Shared with other users
        (perm.subjectType === SubjectType.USER && perm.subjectId !== userId) ||
        // Shared with any organization
        perm.subjectType === SubjectType.ORGANIZATION
      );
    }

    return NextResponse.json({
      success: true,
      data: { isShared }
    });
  } catch (error) {
    console.error('Error checking shared status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: (error as { code?: string })?.code || 'UNKNOWN_ERROR',
          message: (error as Error).message || 'An unexpected error occurred' 
        } 
      },
      { status: (error as { httpStatus?: number })?.httpStatus || 500 }
    );
  }
} 