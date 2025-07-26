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

// Simple in-memory cache for permission checks
// Key format: userId:objectType:objectId:action
const permissionCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// Interface for object ownership data
interface ObjectOwnershipData {
  userId?: string | null;
  organizationId?: string | null;
}

// Function to generate cache key
function generateCacheKey(userId: string, objectType: string, objectId: string, action: string): string {
  return `${userId}:${objectType}:${objectId}:${action}`;
}

// Helper function to invalidate cache entries for an object
function invalidateObjectCache(objectType: string, objectId: string): void {
  // Clear all cache entries related to this object
  // Since we can't easily determine which users have cached access to this object,
  // we need to iterate through all cache entries
  const keysToDelete: string[] = [];
  
  // First collect keys to delete
  Array.from(permissionCache.keys()).forEach(key => {
    if (key.includes(`:${objectType}:${objectId}:`)) {
      keysToDelete.push(key);
    }
  });
  
  // Then delete them
  keysToDelete.forEach(key => {
    permissionCache.delete(key);
  });
}

// Helper function to cache result and return it
function cacheResult(cacheKey: string, result: boolean): boolean {
  permissionCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

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
      // Check cache first
      const cacheKey = generateCacheKey(userId, objectType, objectId, action);
      const cached = permissionCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.result;
      }

      // Get the user and check role (single query with select)
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          role: true
        }
      });

      if (!user) {
        return cacheResult(cacheKey, false);
      }

      // Admin users always have access
      if (user.role === 'ADMIN') {
        return cacheResult(cacheKey, true);
      }

      // Batch query for permissions and user organizations
      const [userPermission, userOrganizations, rolePermission] = await Promise.all([
        // Check direct user permission
        prismaClient.permission.findUnique({
          where: {
            objectType_objectId_subjectType_subjectId_action: {
              objectType,
              objectId,
              subjectType: SubjectType.USER,
              subjectId: userId,
              action
            }
          }
        }),
        
        // Get organizations the user is a member of
        prismaClient.organizationMember.findMany({
          where: { userId },
          select: {
            organizationId: true,
            role: true
          }
        }),
        
        // Check role-based permission
        prismaClient.permission.findUnique({
          where: {
            objectType_objectId_subjectType_subjectId_action: {
              objectType,
              objectId,
              subjectType: SubjectType.ROLE,
              subjectId: user.role,
              action
            }
          }
        })
      ]);

      // Direct user permission check
      if (userPermission) {
        return cacheResult(cacheKey, true);
      }
      
      // Role permission check
      if (rolePermission) {
        return cacheResult(cacheKey, true);
      }

      // If user is in any organizations, check organization permissions
      if (userOrganizations.length > 0) {
        // Get all relevant object data in one query based on object type
        let objectData: ObjectOwnershipData | null = null;
        
        if (objectType === ObjectType.BIN) {
          objectData = await prismaClient.bin.findUnique({
            where: { id: objectId },
            select: { userId: true, organizationId: true }
          });
        } else if (objectType === ObjectType.ITEM) {
          objectData = await prismaClient.item.findUnique({
            where: { id: objectId },
            select: { userId: true, organizationId: true }
          });
        } else if (objectType === ObjectType.CATEGORY) {
          objectData = await prismaClient.category.findUnique({
            where: { id: objectId },
            select: { userId: true, organizationId: true }
          });
        }
        
        // Check object ownership by user
        if (objectData?.userId === userId) {
          return cacheResult(cacheKey, true);
        }
        
        // Get all organization IDs for faster checks
        const orgIds = userOrganizations.map(org => org.organizationId);
        
        // Check organization-level permissions (one query for all orgs)
        const orgPermissions = await prismaClient.permission.findMany({
          where: {
            objectType,
            objectId,
            subjectType: SubjectType.ORGANIZATION,
            subjectId: { in: orgIds },
            action
          }
        });
        
        if (orgPermissions.length > 0) {
          return cacheResult(cacheKey, true);
        }
        
        // Check object ownership by organization
        if (objectData?.organizationId && orgIds.includes(objectData.organizationId)) {
          // Find user's role in this organization
          const orgMembership = userOrganizations.find(
            org => org.organizationId === objectData.organizationId
          );
          
          if (orgMembership) {
            // Organization members have read access to organization's objects
            if (action === Action.READ) {
              return cacheResult(cacheKey, true);
            }
            
            // Organization owners and admins have write and admin access
            if ((action === Action.WRITE || action === Action.ADMIN) && 
               (orgMembership.role === OrgRole.OWNER || orgMembership.role === OrgRole.ADMIN)) {
              return cacheResult(cacheKey, true);
            }
          }
        }
      }

      // No permission found
      return cacheResult(cacheKey, false);
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
      const result = await prismaClient.permission.upsert({
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
      
      // Invalidate cache for this object
      invalidateObjectCache(objectType, objectId);
      
      return result;
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
      
      // Invalidate cache for this object
      invalidateObjectCache(objectType, objectId);
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