import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPermissionService } from '@/services/permission';
import { getSession } from '@/lib/auth';
import { 
  ObjectType, 
  SubjectType, 
  Action,
  CreatePermissionData
} from '@/types/permission';

// Schema for granting permission
const grantPermissionSchema = z.object({
  objectType: z.nativeEnum(ObjectType),
  objectId: z.string().uuid(),
  subjectType: z.nativeEnum(SubjectType),
  subjectId: z.string(),
  action: z.nativeEnum(Action)
});

// Schema for revoking permission
const revokePermissionSchema = grantPermissionSchema;

// Create permission service
const permissionService = createPermissionService();

/**
 * GET /api/permissions
 * List permissions based on query parameters
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType') as ObjectType | undefined;
    const objectId = searchParams.get('objectId') || undefined;
    const subjectType = searchParams.get('subjectType') as SubjectType | undefined;
    const subjectId = searchParams.get('subjectId') || undefined;
    const action = searchParams.get('action') as Action | undefined;

    // Validate query parameters
    if (objectType && !Object.values(ObjectType).includes(objectType)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid objectType' } },
        { status: 400 }
      );
    }

    if (subjectType && !Object.values(SubjectType).includes(subjectType)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid subjectType' } },
        { status: 400 }
      );
    }

    if (action && !Object.values(Action).includes(action)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid action' } },
        { status: 400 }
      );
    }

    // Get permissions
    const permissions = await permissionService.getPermissions({
      objectType,
      objectId,
      subjectType,
      subjectId,
      action
    });

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
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

/**
 * POST /api/permissions
 * Grant a permission
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const validatedData = grantPermissionSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request data', details: validatedData.error.format() } },
        { status: 400 }
      );
    }

    // Check if user has admin access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
      objectType: validatedData.data.objectType,
      objectId: validatedData.data.objectId,
      action: Action.ADMIN
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Grant permission
    const permissionData: CreatePermissionData = {
      ...validatedData.data,
      grantedBy: session.user.id
    };
    
    const permission = await permissionService.grant(permissionData);

    return NextResponse.json({
      success: true,
      data: permission
    });
  } catch (error) {
    console.error('Error granting permission:', error);
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

/**
 * DELETE /api/permissions
 * Revoke a permission
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const objectType = searchParams.get('objectType') as ObjectType;
    const objectId = searchParams.get('objectId');
    const subjectType = searchParams.get('subjectType') as SubjectType;
    const subjectId = searchParams.get('subjectId');
    const action = searchParams.get('action') as Action;

    // Validate parameters
    const validatedData = revokePermissionSchema.safeParse({
      objectType,
      objectId,
      subjectType,
      subjectId,
      action
    });

    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request data', details: validatedData.error.format() } },
        { status: 400 }
      );
    }

    // Check if user has admin access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
      objectType: validatedData.data.objectType,
      objectId: validatedData.data.objectId,
      action: Action.ADMIN
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Revoke permission
    await permissionService.revoke(validatedData.data);

    return NextResponse.json({
      success: true,
      data: null
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
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