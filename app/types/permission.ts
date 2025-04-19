import { Permission } from '@prisma/client';

/**
 * The type of object a permission applies to
 */
export enum ObjectType {
  BIN = 'bin',
  ITEM = 'item',
  CATEGORY = 'category'
}

/**
 * The type of subject a permission is granted to
 */
export enum SubjectType {
  USER = 'user',
  ORGANIZATION = 'organization',
  ROLE = 'role'
}

/**
 * The action a permission allows
 */
export enum Action {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin'
}

/**
 * Data for creating a new permission
 */
export interface CreatePermissionData {
  objectType: ObjectType;
  objectId: string;
  subjectType: SubjectType;
  subjectId: string;
  action: Action;
  grantedBy?: string;
}

/**
 * Data for querying permissions
 */
export interface GetPermissionsQuery {
  objectType?: ObjectType;
  objectId?: string;
  subjectType?: SubjectType;
  subjectId?: string;
  action?: Action;
}

/**
 * Parameters for checking if a user has a permission
 */
export interface PermissionCheckParams {
  userId: string;
  objectType: ObjectType;
  objectId: string;
  action: Action;
}

/**
 * Permission with additional context
 */
export type PermissionWithContext = Permission & {
  objectName?: string; // Name of the object (e.g., bin label, item name)
  subjectName?: string; // Name of the subject (e.g., user name, org name)
}; 