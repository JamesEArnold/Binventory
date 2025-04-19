import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';
import { createSlug } from '@/utils/strings';
import { createAppError } from '@/utils/errors';
import {
  CreateOrganizationData,
  UpdateOrganizationData,
  AddOrganizationMemberData,
  UpdateOrganizationMemberData,
  OrganizationWithMembers,
  OrganizationWithMemberDetails,
  OrgRole
} from '@/types/organization';

export interface OrganizationService {
  /**
   * List all organizations a user is a member of
   */
  listUserOrganizations(userId: string): Promise<OrganizationWithMembers[]>;
  
  /**
   * Get a single organization by ID
   */
  getOrganization(organizationId: string, userId: string): Promise<OrganizationWithMemberDetails>;
  
  /**
   * Create a new organization with the current user as the owner
   */
  createOrganization(data: CreateOrganizationData, userId: string): Promise<OrganizationWithMembers>;
  
  /**
   * Update an existing organization
   */
  updateOrganization(
    organizationId: string, 
    data: UpdateOrganizationData, 
    userId: string
  ): Promise<OrganizationWithMembers>;
  
  /**
   * Delete an organization (admin/owner only)
   */
  deleteOrganization(organizationId: string, userId: string): Promise<void>;
  
  /**
   * List all members of an organization
   */
  listOrganizationMembers(organizationId: string, userId: string): Promise<OrganizationWithMemberDetails>;
  
  /**
   * Add a member to an organization
   */
  addOrganizationMember(
    organizationId: string, 
    data: AddOrganizationMemberData, 
    invitedByUserId: string
  ): Promise<OrganizationWithMemberDetails>;
  
  /**
   * Update a member's role in an organization
   */
  updateOrganizationMember(
    organizationId: string, 
    memberId: string, 
    data: UpdateOrganizationMemberData, 
    userId: string
  ): Promise<OrganizationWithMemberDetails>;
  
  /**
   * Remove a member from an organization
   */
  removeOrganizationMember(organizationId: string, memberId: string, userId: string): Promise<void>;
  
  /**
   * Check if a user is a member of an organization
   */
  isOrganizationMember(organizationId: string, userId: string): Promise<boolean>;
  
  /**
   * Check if a user has a specific role within an organization
   */
  hasOrganizationRole(organizationId: string, userId: string, role: OrgRole): Promise<boolean>;
  
  /**
   * Check if a user can administer an organization (OWNER or ADMIN role)
   */
  canAdministerOrganization(organizationId: string, userId: string): Promise<boolean>;
}

export function createOrganizationService(
  prismaClient: PrismaClient = prisma
): OrganizationService {
  return {
    async listUserOrganizations(userId) {
      return prismaClient.organization.findMany({
        where: {
          memberships: {
            some: {
              userId
            }
          }
        },
        include: {
          memberships: {
            where: {
              userId
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    },
    
    async getOrganization(organizationId, userId) {
      const organization = await prismaClient.organization.findUnique({
        where: {
          id: organizationId
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      });
      
      if (!organization) {
        throw createAppError({
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organization not found',
          httpStatus: 404
        });
      }
      
      // Check if user is a member
      const isMember = organization.memberships.some(member => member.userId === userId);
      if (!isMember) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this organization',
          httpStatus: 403
        });
      }
      
      return organization;
    },
    
    async createOrganization(data, userId) {
      // Generate a slug if not provided
      const slug = data.slug || createSlug(data.name);
      
      // Check if slug is unique
      const existingOrg = await prismaClient.organization.findUnique({
        where: {
          slug
        }
      });
      
      if (existingOrg) {
        throw createAppError({
          code: 'SLUG_ALREADY_EXISTS',
          message: 'An organization with this slug already exists',
          httpStatus: 409
        });
      }
      
      // Create the organization with the current user as owner
      return prismaClient.organization.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          memberships: {
            create: {
              userId,
              role: OrgRole.OWNER
            }
          }
        },
        include: {
          memberships: true
        }
      });
    },
    
    async updateOrganization(organizationId, data, userId) {
      // Verify user can administer the organization
      const canAdminister = await this.canAdministerOrganization(organizationId, userId);
      
      if (!canAdminister) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to update this organization',
          httpStatus: 403
        });
      }
      
      // Check if updating slug and if it's unique
      if (data.slug) {
        const existingOrg = await prismaClient.organization.findFirst({
          where: {
            slug: data.slug,
            id: {
              not: organizationId
            }
          }
        });
        
        if (existingOrg) {
          throw createAppError({
            code: 'SLUG_ALREADY_EXISTS',
            message: 'An organization with this slug already exists',
            httpStatus: 409
          });
        }
      }
      
      // Update the organization
      return prismaClient.organization.update({
        where: {
          id: organizationId
        },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.slug && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description })
        },
        include: {
          memberships: true
        }
      });
    },
    
    async deleteOrganization(organizationId, userId) {
      // Only OWNER can delete an organization
      const isOwner = await this.hasOrganizationRole(organizationId, userId, OrgRole.OWNER);
      
      if (!isOwner) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'Only an owner can delete an organization',
          httpStatus: 403
        });
      }
      
      // Delete the organization
      await prismaClient.organization.delete({
        where: {
          id: organizationId
        }
      });
    },
    
    async listOrganizationMembers(organizationId, userId) {
      // Verify user is a member
      const isMember = await this.isOrganizationMember(organizationId, userId);
      
      if (!isMember) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have access to this organization',
          httpStatus: 403
        });
      }
      
      return prismaClient.organization.findUnique({
        where: {
          id: organizationId
        },
        include: {
          memberships: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          }
        }
      }) as Promise<OrganizationWithMemberDetails>;
    },
    
    async addOrganizationMember(organizationId, data, invitedByUserId) {
      // Verify user can administer the organization
      const canAdminister = await this.canAdministerOrganization(organizationId, invitedByUserId);
      
      if (!canAdminister) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to add members to this organization',
          httpStatus: 403
        });
      }
      
      // Check if user already exists in organization
      const existingMember = await prismaClient.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: data.userId
          }
        }
      });
      
      if (existingMember) {
        throw createAppError({
          code: 'MEMBER_ALREADY_EXISTS',
          message: 'This user is already a member of the organization',
          httpStatus: 409
        });
      }
      
      // Add member to organization
      await prismaClient.organizationMember.create({
        data: {
          organizationId,
          userId: data.userId,
          role: data.role || OrgRole.MEMBER,
          invitedBy: invitedByUserId
        }
      });
      
      // Return updated organization with members
      return this.listOrganizationMembers(organizationId, invitedByUserId);
    },
    
    async updateOrganizationMember(organizationId, memberId, data, userId) {
      // Verify user can administer the organization
      const canAdminister = await this.canAdministerOrganization(organizationId, userId);
      
      if (!canAdminister) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to update member roles',
          httpStatus: 403
        });
      }
      
      // Find the member to update
      const member = await prismaClient.organizationMember.findUnique({
        where: {
          id: memberId
        }
      });
      
      if (!member || member.organizationId !== organizationId) {
        throw createAppError({
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found in this organization',
          httpStatus: 404
        });
      }
      
      // Prevent changing role of the last OWNER
      if (member.role === OrgRole.OWNER && data.role !== OrgRole.OWNER) {
        const ownerCount = await prismaClient.organizationMember.count({
          where: {
            organizationId,
            role: OrgRole.OWNER
          }
        });
        
        if (ownerCount <= 1) {
          throw createAppError({
            code: 'LAST_OWNER',
            message: 'Cannot change role of the last owner',
            httpStatus: 400
          });
        }
      }
      
      // Update member role
      await prismaClient.organizationMember.update({
        where: {
          id: memberId
        },
        data: {
          role: data.role
        }
      });
      
      // Return updated organization with members
      return this.listOrganizationMembers(organizationId, userId);
    },
    
    async removeOrganizationMember(organizationId, memberId, userId) {
      // Verify user can administer the organization
      const canAdminister = await this.canAdministerOrganization(organizationId, userId);
      
      if (!canAdminister) {
        throw createAppError({
          code: 'UNAUTHORIZED',
          message: 'You do not have permission to remove members',
          httpStatus: 403
        });
      }
      
      // Find the member to remove
      const member = await prismaClient.organizationMember.findUnique({
        where: {
          id: memberId
        }
      });
      
      if (!member || member.organizationId !== organizationId) {
        throw createAppError({
          code: 'MEMBER_NOT_FOUND',
          message: 'Member not found in this organization',
          httpStatus: 404
        });
      }
      
      // Prevent removing the last OWNER
      if (member.role === OrgRole.OWNER) {
        const ownerCount = await prismaClient.organizationMember.count({
          where: {
            organizationId,
            role: OrgRole.OWNER
          }
        });
        
        if (ownerCount <= 1) {
          throw createAppError({
            code: 'LAST_OWNER',
            message: 'Cannot remove the last owner',
            httpStatus: 400
          });
        }
      }
      
      // Remove member
      await prismaClient.organizationMember.delete({
        where: {
          id: memberId
        }
      });
    },
    
    async isOrganizationMember(organizationId, userId) {
      const member = await prismaClient.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId
          }
        }
      });
      
      return !!member;
    },
    
    async hasOrganizationRole(organizationId, userId, role) {
      const member = await prismaClient.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId
          }
        }
      });
      
      if (!member) return false;
      return member.role === role;
    },
    
    async canAdministerOrganization(organizationId, userId) {
      const member = await prismaClient.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId
          }
        }
      });
      
      if (!member) return false;
      return member.role === OrgRole.OWNER || member.role === OrgRole.ADMIN;
    }
  };
}

// Create default instance
export const organizationService = createOrganizationService(); 