import { Organization, OrganizationMember, OrgRole } from '@prisma/client';

/**
 * Organization with its memberships included
 */
export type OrganizationWithMembers = Organization & {
  memberships: OrganizationMember[];
};

/**
 * Organization member with user details
 */
export type OrganizationMemberWithUser = OrganizationMember & {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
};

/**
 * Organization with members and their user details
 */
export type OrganizationWithMemberDetails = Organization & {
  memberships: OrganizationMemberWithUser[];
};

/**
 * Data for creating a new organization
 */
export interface CreateOrganizationData {
  name: string;
  slug?: string;
  description?: string;
}

/**
 * Data for updating an organization
 */
export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  description?: string;
}

/**
 * Data for adding a member to an organization
 */
export interface AddOrganizationMemberData {
  userId: string;
  role?: OrgRole;
}

/**
 * Data for updating a member's role in an organization
 */
export interface UpdateOrganizationMemberData {
  role: OrgRole;
}

/**
 * Context type for specifying the scope of operations
 */
export interface OperationContext {
  type: 'personal' | 'organization';
  id?: string; // organizationId for organization context
}

/**
 * Export OrgRole enum from Prisma for easy access
 */
export { OrgRole }; 