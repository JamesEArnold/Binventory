import { prisma } from '@/lib/prisma';
import { PrismaClient, Permission } from '@prisma/client';
import { createAppError } from '@/utils/errors';
import { 
  ObjectType, 
  SubjectType, 
  Action, 
  CreatePermissionData, 
  GetPermissionsQuery,
  PermissionCheckParams
} from '@/types/permission';
import { OrgRole } from '@/types/organization';
import { Prisma } from '@prisma/client';

export interface PermissionService {
  /**
   * Check if a user has permission to perform an action on an object
   */
  canAccess(params: PermissionCheckParams): Promise<boolean>;

  /**
   * Grant a permission to a subject
   */
  grant(data: CreatePermissionData): Promise<Permission>;

  /**
   * Revoke a permission from a subject
   */
  revoke(data: Omit<CreatePermissionData, 'grantedBy'>): Promise<void>;

  /**
   * Get all permissions for an object
   */
  getPermissions(query: GetPermissionsQuery): Promise<Permission[]>;

  /**
   * Create default permissions for a new object
   */
  createDefaultPermissions(
    objectType: ObjectType,
    objectId: string,
    ownerId: string,
    organizationId?: string
  ): Promise<void>;
}

export function createPermissionService(
  prismaClient: PrismaClient = prisma
): PermissionService {
  return {
    async canAccess({ userId, objectType, objectId, action }) {
      // Get the user to check their role
      const user = await prismaClient.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return false;
      }

      // Admin users always have access
      if (user.role === 'ADMIN') {
        return true;
      }

      // Check if there's a direct permission for this user
      const userPermission = await prismaClient.permission.findUnique({
        where: {
          objectType_objectId_subjectType_subjectId_action: {
            objectType,
            objectId,
            subjectType: SubjectType.USER,
            subjectId: userId,
            action
          }
        }
      });

      if (userPermission) {
        return true;
      }

      // Get organizations the user is a member of
      const userOrganizations = await prismaClient.organizationMember.findMany({
        where: {
          userId
        },
        select: {
          organizationId: true,
          role: true
        }
      });

      // Check organization-level permissions
      for (const org of userOrganizations) {
        // Check if there's a permission for this organization
        const orgPermission = await prismaClient.permission.findUnique({
          where: {
            objectType_objectId_subjectType_subjectId_action: {
              objectType,
              objectId,
              subjectType: SubjectType.ORGANIZATION,
              subjectId: org.organizationId,
              action
            }
          }
        });

        if (orgPermission) {
          return true;
        }

        // Check if this is an organization-owned object
        // For example, if the bin belongs to the organization
        if (objectType === ObjectType.BIN) {
          const bin = await prismaClient.bin.findUnique({
            where: { id: objectId }
          });

          if (bin?.organizationId === org.organizationId) {
            // Organization members have read access to organization's bins
            if (action === Action.READ) {
              return true;
            }

            // Organization owners and admins have write and admin access
            if ((action === Action.WRITE || action === Action.ADMIN) && 
                (org.role === OrgRole.OWNER || org.role === OrgRole.ADMIN)) {
              return true;
            }
          }
        } else if (objectType === ObjectType.ITEM) {
          const item = await prismaClient.item.findUnique({
            where: { id: objectId }
          });

          if (item?.organizationId === org.organizationId) {
            // Organization members have read access to organization's items
            if (action === Action.READ) {
              return true;
            }

            // Organization owners and admins have write and admin access
            if ((action === Action.WRITE || action === Action.ADMIN) && 
                (org.role === OrgRole.OWNER || org.role === OrgRole.ADMIN)) {
              return true;
            }
          }
        } else if (objectType === ObjectType.CATEGORY) {
          const category = await prismaClient.category.findUnique({
            where: { id: objectId }
          });

          if (category?.organizationId === org.organizationId) {
            // Organization members have read access to organization's categories
            if (action === Action.READ) {
              return true;
            }

            // Organization owners and admins have write and admin access
            if ((action === Action.WRITE || action === Action.ADMIN) && 
                (org.role === OrgRole.OWNER || org.role === OrgRole.ADMIN)) {
              return true;
            }
          }
        }
      }

      // Check if there's a permission for the user's role
      const rolePermission = await prismaClient.permission.findUnique({
        where: {
          objectType_objectId_subjectType_subjectId_action: {
            objectType,
            objectId,
            subjectType: SubjectType.ROLE,
            subjectId: user.role,
            action
          }
        }
      });

      if (rolePermission) {
        return true;
      }

      // Check ownership
      if (objectType === ObjectType.BIN) {
        const bin = await prismaClient.bin.findUnique({
          where: { id: objectId }
        });
        
        // Object owners have all permissions
        if (bin?.userId === userId) {
          return true;
        }
      } else if (objectType === ObjectType.ITEM) {
        const item = await prismaClient.item.findUnique({
          where: { id: objectId }
        });
        
        // Object owners have all permissions
        if (item?.userId === userId) {
          return true;
        }
      } else if (objectType === ObjectType.CATEGORY) {
        const category = await prismaClient.category.findUnique({
          where: { id: objectId }
        });
        
        // Object owners have all permissions
        if (category?.userId === userId) {
          return true;
        }
      }

      return false;
    },

    async grant({ objectType, objectId, subjectType, subjectId, action, grantedBy }) {
      // Validate that the object exists
      if (objectType === ObjectType.BIN) {
        const bin = await prismaClient.bin.findUnique({
          where: { id: objectId }
        });
        
        if (!bin) {
          throw createAppError({
            code: 'OBJECT_NOT_FOUND',
            message: 'Bin not found',
            httpStatus: 404
          });
        }
      } else if (objectType === ObjectType.ITEM) {
        const item = await prismaClient.item.findUnique({
          where: { id: objectId }
        });
        
        if (!item) {
          throw createAppError({
            code: 'OBJECT_NOT_FOUND',
            message: 'Item not found',
            httpStatus: 404
          });
        }
      } else if (objectType === ObjectType.CATEGORY) {
        const category = await prismaClient.category.findUnique({
          where: { id: objectId }
        });
        
        if (!category) {
          throw createAppError({
            code: 'OBJECT_NOT_FOUND',
            message: 'Category not found',
            httpStatus: 404
          });
        }
      }

      // Validate that the subject exists
      if (subjectType === SubjectType.USER) {
        const user = await prismaClient.user.findUnique({
          where: { id: subjectId }
        });
        
        if (!user) {
          throw createAppError({
            code: 'SUBJECT_NOT_FOUND',
            message: 'User not found',
            httpStatus: 404
          });
        }
      } else if (subjectType === SubjectType.ORGANIZATION) {
        const organization = await prismaClient.organization.findUnique({
          where: { id: subjectId }
        });
        
        if (!organization) {
          throw createAppError({
            code: 'SUBJECT_NOT_FOUND',
            message: 'Organization not found',
            httpStatus: 404
          });
        }
      } else if (subjectType === SubjectType.ROLE) {
        // Validate the role
        if (subjectId !== 'ADMIN' && subjectId !== 'USER') {
          throw createAppError({
            code: 'INVALID_ROLE',
            message: 'Invalid role',
            httpStatus: 400
          });
        }
      }

      // Create or update the permission
      return prismaClient.permission.upsert({
        where: {
          objectType_objectId_subjectType_subjectId_action: {
            objectType,
            objectId,
            subjectType,
            subjectId,
            action
          }
        },
        update: {
          grantedBy,
          grantedAt: new Date()
        },
        create: {
          objectType,
          objectId,
          subjectType,
          subjectId,
          action,
          grantedBy
        }
      });
    },

    async revoke({ objectType, objectId, subjectType, subjectId, action }) {
      // Find the permission
      const permission = await prismaClient.permission.findUnique({
        where: {
          objectType_objectId_subjectType_subjectId_action: {
            objectType,
            objectId,
            subjectType,
            subjectId,
            action
          }
        }
      });

      if (!permission) {
        throw createAppError({
          code: 'PERMISSION_NOT_FOUND',
          message: 'Permission not found',
          httpStatus: 404
        });
      }

      // Delete the permission
      await prismaClient.permission.delete({
        where: {
          id: permission.id
        }
      });
    },

    async getPermissions(query) {
      // Build the query conditions
      const where: Prisma.PermissionWhereInput = {};
      
      if (query.objectType) {
        where.objectType = query.objectType;
      }
      
      if (query.objectId) {
        where.objectId = query.objectId;
      }
      
      if (query.subjectType) {
        where.subjectType = query.subjectType;
      }
      
      if (query.subjectId) {
        where.subjectId = query.subjectId;
      }
      
      if (query.action) {
        where.action = query.action;
      }

      // Get the permissions
      return prismaClient.permission.findMany({
        where,
        orderBy: {
          grantedAt: 'desc'
        }
      });
    },

    async createDefaultPermissions(objectType, objectId, ownerId, organizationId) {
      const permissions: CreatePermissionData[] = [];

      if (organizationId) {
        // Organization-owned object
        // Grant all permissions to the organization
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.ORGANIZATION,
          subjectId: organizationId,
          action: Action.READ,
          grantedBy: ownerId
        });
        
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.ORGANIZATION,
          subjectId: organizationId,
          action: Action.WRITE,
          grantedBy: ownerId
        });
        
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.ORGANIZATION,
          subjectId: organizationId,
          action: Action.ADMIN,
          grantedBy: ownerId
        });
      } else {
        // User-owned object
        // Grant all permissions to the owner
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.USER,
          subjectId: ownerId,
          action: Action.READ,
          grantedBy: ownerId
        });
        
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.USER,
          subjectId: ownerId,
          action: Action.WRITE,
          grantedBy: ownerId
        });
        
        permissions.push({
          objectType,
          objectId,
          subjectType: SubjectType.USER,
          subjectId: ownerId,
          action: Action.ADMIN,
          grantedBy: ownerId
        });
      }

      // Create the permissions
      await Promise.all(
        permissions.map(permission => this.grant(permission))
      );
    }
  };
}

// Create default instance
export const permissionService = createPermissionService(); 