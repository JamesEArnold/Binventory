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

// Schema for batch permission management
const batchPermissionSchema = z.array(
  z.object({
    subjectType: z.nativeEnum(SubjectType),
    subjectId: z.string(),
    action: z.nativeEnum(Action)
  })
);

// Create permission service
const permissionService = createPermissionService();

/**
 * Helper to validate object type
 */
function validateObjectType(type: string): type is ObjectType {
  return Object.values(ObjectType).includes(type as ObjectType);
}

/**
 * GET /api/objects/[type]/[id]/permissions
 * Get permissions for a specific object
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Validate object type parameter
    if (!validateObjectType(params.type)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid object type' } },
        { status: 400 }
      );
    }

    const objectType = params.type as ObjectType;
    const objectId = params.id;

    // Check if user has read access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
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

    // Get permissions for the object
    const permissions = await permissionService.getPermissions({
      objectType,
      objectId
    });

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error getting object permissions:', error);
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
 * POST /api/objects/[type]/[id]/permissions
 * Batch set permissions for a specific object
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Validate object type parameter
    if (!validateObjectType(params.type)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid object type' } },
        { status: 400 }
      );
    }

    const objectType = params.type as ObjectType;
    const objectId = params.id;

    // Check if user has admin access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
      objectType,
      objectId,
      action: Action.ADMIN
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const validatedData = batchPermissionSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request data', details: validatedData.error.format() } },
        { status: 400 }
      );
    }

    // Process each permission in batch
    const permissions = [];
    for (const perm of validatedData.data) {
      const permissionData: CreatePermissionData = {
        objectType,
        objectId,
        ...perm,
        grantedBy: session.user.id
      };
      
      const permission = await permissionService.grant(permissionData);
      permissions.push(permission);
    }

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error setting object permissions:', error);
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
 * PUT /api/objects/[type]/[id]/permissions
 * Replace all permissions for a specific object
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Validate object type parameter
    if (!validateObjectType(params.type)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid object type' } },
        { status: 400 }
      );
    }

    const objectType = params.type as ObjectType;
    const objectId = params.id;

    // Check if user has admin access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
      objectType,
      objectId,
      action: Action.ADMIN
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const validatedData = batchPermissionSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid request data', details: validatedData.error.format() } },
        { status: 400 }
      );
    }

    // Get current permissions for the object
    const currentPermissions = await permissionService.getPermissions({
      objectType,
      objectId
    });

    // Delete all current permissions
    for (const perm of currentPermissions) {
      await permissionService.revoke({
        objectType: perm.objectType as ObjectType,
        objectId: perm.objectId,
        subjectType: perm.subjectType as SubjectType,
        subjectId: perm.subjectId,
        action: perm.action as Action
      });
    }

    // Add new permissions
    const permissions = [];
    for (const perm of validatedData.data) {
      const permissionData: CreatePermissionData = {
        objectType,
        objectId,
        ...perm,
        grantedBy: session.user.id
      };
      
      const permission = await permissionService.grant(permissionData);
      permissions.push(permission);
    }

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error replacing object permissions:', error);
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
 * DELETE /api/objects/[type]/[id]/permissions
 * Delete all permissions for a specific object
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    // Get authenticated user
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Validate object type parameter
    if (!validateObjectType(params.type)) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid object type' } },
        { status: 400 }
      );
    }

    const objectType = params.type as ObjectType;
    const objectId = params.id;

    // Check if user has admin access to the object
    const hasAccess = await permissionService.canAccess({
      userId: session.user.id,
      objectType,
      objectId,
      action: Action.ADMIN
    });

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: { message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Get current permissions for the object
    const currentPermissions = await permissionService.getPermissions({
      objectType,
      objectId
    });

    // Delete all current permissions
    for (const perm of currentPermissions) {
      await permissionService.revoke({
        objectType: perm.objectType as ObjectType,
        objectId: perm.objectId,
        subjectType: perm.subjectType as SubjectType,
        subjectId: perm.subjectId,
        action: perm.action as Action
      });
    }

    return NextResponse.json({
      success: true,
      data: null
    });
  } catch (error) {
    console.error('Error deleting object permissions:', error);
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