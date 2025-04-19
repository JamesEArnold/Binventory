import { PrismaClient } from '@prisma/client';
import { createOrganizationService } from '../organization';
import { OrgRole } from '@/types/organization';

// Mock PrismaClient
jest.mock('@/lib/prisma', () => {
  const mockFindMany = jest.fn();
  const mockFindUnique = jest.fn();
  const mockFindFirst = jest.fn();
  const mockCreate = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockCount = jest.fn();

  return {
    prisma: {
      organization: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        findFirst: mockFindFirst,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
      },
      organizationMember: {
        findUnique: mockFindUnique,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        count: mockCount,
      },
    },
  };
});

// Import after mocking
import { prisma } from '@/lib/prisma';

// Type the mocked prisma client for type safety
interface MockPrismaClient {
  organization: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  organizationMember: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
}

describe('Organization Service', () => {
  const mockPrisma = prisma as unknown as MockPrismaClient;
  const organizationService = createOrganizationService(prisma as unknown as PrismaClient);
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('listUserOrganizations', () => {
    it('should return organizations the user is a member of', async () => {
      // Arrange
      const userId = 'user-id';
      const mockOrgs = [
        { 
          id: 'org-1', 
          name: 'Org 1',
          slug: 'org-1',
          description: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [{ 
            id: 'member-1',
            organizationId: 'org-1',
            userId,
            role: OrgRole.OWNER,
            joinedAt: new Date(),
            invitedBy: null
          }]
        }
      ];
      
      mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);
      
      // Act
      const result = await organizationService.listUserOrganizations(userId);
      
      // Assert
      expect(result).toEqual(mockOrgs);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
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
    });
  });
  
  describe('createOrganization', () => {
    it('should create an organization and set the user as owner', async () => {
      // Arrange
      const userId = 'user-id';
      const orgData = {
        name: 'New Org',
        slug: 'new-org',
        description: 'New organization description'
      };
      
      const mockCreatedOrg = {
        id: 'new-org-id',
        ...orgData,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [{
          id: 'member-id',
          organizationId: 'new-org-id',
          userId,
          role: OrgRole.OWNER,
          joinedAt: new Date(),
          invitedBy: null
        }]
      };
      
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockCreatedOrg);
      
      // Act
      const result = await organizationService.createOrganization(orgData, userId);
      
      // Assert
      expect(result).toEqual(mockCreatedOrg);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: {
          slug: orgData.slug
        }
      });
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({
        data: {
          name: orgData.name,
          slug: orgData.slug,
          description: orgData.description,
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
    });
    
    it('should generate a slug if not provided', async () => {
      // Arrange
      const userId = 'user-id';
      const orgData = {
        name: 'New Org'
      };
      
      const mockCreatedOrg = {
        id: 'new-org-id',
        name: 'New Org',
        slug: 'new-org',
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [{
          id: 'member-id',
          organizationId: 'new-org-id',
          userId,
          role: OrgRole.OWNER,
          joinedAt: new Date(),
          invitedBy: null
        }]
      };
      
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue(mockCreatedOrg);
      
      // Act
      const result = await organizationService.createOrganization(orgData, userId);
      
      // Assert
      expect(result).toEqual(mockCreatedOrg);
      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-org'
          })
        })
      );
    });
    
    it('should throw error when slug already exists', async () => {
      // Arrange
      const userId = 'user-id';
      const orgData = {
        name: 'New Org',
        slug: 'existing-slug'
      };
      
      const existingOrg = {
        id: 'existing-id',
        name: 'Existing Org',
        slug: 'existing-slug',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.organization.findUnique.mockResolvedValue(existingOrg);
      
      // Act & Assert
      await expect(organizationService.createOrganization(orgData, userId))
        .rejects.toMatchObject({
          code: 'SLUG_ALREADY_EXISTS'
        });
    });
  });
  
  describe('canAdministerOrganization', () => {
    it('should return true for owner role', async () => {
      // Arrange
      const userId = 'user-id';
      const orgId = 'org-id';
      
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-id',
        organizationId: orgId,
        userId,
        role: OrgRole.OWNER,
        joinedAt: new Date(),
        invitedBy: null
      });
      
      // Act
      const result = await organizationService.canAdministerOrganization(orgId, userId);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return true for admin role', async () => {
      // Arrange
      const userId = 'user-id';
      const orgId = 'org-id';
      
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-id',
        organizationId: orgId,
        userId,
        role: OrgRole.ADMIN,
        joinedAt: new Date(),
        invitedBy: null
      });
      
      // Act
      const result = await organizationService.canAdministerOrganization(orgId, userId);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false for non-admin roles', async () => {
      // Arrange
      const userId = 'user-id';
      const orgId = 'org-id';
      
      mockPrisma.organizationMember.findUnique.mockResolvedValue({
        id: 'member-id',
        organizationId: orgId,
        userId,
        role: OrgRole.MEMBER,
        joinedAt: new Date(),
        invitedBy: null
      });
      
      // Act
      const result = await organizationService.canAdministerOrganization(orgId, userId);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false if user is not a member', async () => {
      // Arrange
      const userId = 'user-id';
      const orgId = 'org-id';
      
      mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
      
      // Act
      const result = await organizationService.canAdministerOrganization(orgId, userId);
      
      // Assert
      expect(result).toBe(false);
    });
  });
}); 