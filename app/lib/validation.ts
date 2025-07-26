/**
 * Comprehensive validation schemas for enhanced security
 */

import { z } from 'zod';

// Base validation patterns
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_STRING_REGEX = /^[a-zA-Z0-9\s\-_.(),]*$/;

// Common field validations
export const commonValidations = {
  uuid: z.string().regex(UUID_REGEX, 'Invalid UUID format'),
  email: z.string().email('Invalid email format').max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(PASSWORD_REGEX, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  slug: z.string().min(1).max(100).regex(SLUG_REGEX, 'Invalid slug format'),
  safeString: z.string().regex(SAFE_STRING_REGEX, 'Contains invalid characters'),
  name: z.string().min(1, 'Name is required').max(100).regex(SAFE_STRING_REGEX),
  description: z.string().max(1000).regex(SAFE_STRING_REGEX).optional(),
  location: z.string().min(1, 'Location is required').max(200).regex(SAFE_STRING_REGEX),
  label: z.string().min(1, 'Label is required').max(100).regex(SAFE_STRING_REGEX),
};

// Enhanced authentication schemas
export const authSchemas = {
  register: z.object({
    name: commonValidations.name,
    email: commonValidations.email,
    password: commonValidations.password,
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  login: z.object({
    email: commonValidations.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonValidations.password,
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  twoFactor: z.object({
    token: z.string().length(6, 'Token must be 6 digits').regex(/^\d{6}$/, 'Token must contain only digits'),
  }),
};

// Bin validation schemas
export const binSchemas = {
  create: z.object({
    label: commonValidations.label,
    location: commonValidations.location,
    description: commonValidations.description,
  }),

  update: z.object({
    id: commonValidations.uuid,
    label: commonValidations.label.optional(),
    location: commonValidations.location.optional(),
    description: commonValidations.description,
  }),

  list: z.object({
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    location: z.string().max(200).optional(),
    search: z.string().max(100).optional(),
  }),
};

// Item validation schemas
export const itemSchemas = {
  create: z.object({
    name: commonValidations.name,
    description: commonValidations.description.transform(val => val || ''),
    categoryId: commonValidations.uuid,
    quantity: z.number().int().min(0).max(999999),
    minQuantity: z.number().int().min(0).max(999999).optional(),
    unit: z.string().min(1, 'Unit is required').max(50).regex(SAFE_STRING_REGEX),
  }),

  update: z.object({
    id: commonValidations.uuid,
    name: commonValidations.name.optional(),
    description: commonValidations.description,
    categoryId: commonValidations.uuid.optional(),
    quantity: z.number().int().min(0).max(999999).optional(),
    minQuantity: z.number().int().min(0).max(999999).optional(),
    unit: z.string().min(1).max(50).regex(SAFE_STRING_REGEX).optional(),
  }),

  addToBin: z.object({
    binId: commonValidations.uuid,
    itemId: commonValidations.uuid,
    quantity: z.number().int().min(1).max(999999),
    notes: z.string().max(500).regex(SAFE_STRING_REGEX).optional(),
  }),
};

// Category validation schemas
export const categorySchemas = {
  create: z.object({
    name: commonValidations.name,
    parentId: commonValidations.uuid.optional(),
  }),

  update: z.object({
    id: commonValidations.uuid,
    name: commonValidations.name.optional(),
    parentId: commonValidations.uuid.optional(),
  }),
};

// Organization validation schemas
export const organizationSchemas = {
  create: z.object({
    name: commonValidations.name,
    slug: commonValidations.slug,
    description: commonValidations.description,
  }),

  update: z.object({
    id: commonValidations.uuid,
    name: commonValidations.name.optional(),
    description: commonValidations.description,
  }),

  inviteMember: z.object({
    email: commonValidations.email,
    role: z.enum(['MEMBER', 'EDITOR', 'ADMIN']),
  }),
};

// File upload validation
export const fileUploadSchemas = {
  image: z.object({
    file: z.instanceof(File)
      .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
      .refine(
        (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
        'File must be a JPEG, PNG, or WebP image'
      ),
  }),
};

// Search validation
export const searchSchemas = {
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(100),
    type: z.enum(['bins', 'items', 'all']).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
};

// Permission validation
export const permissionSchemas = {
  grant: z.object({
    objectType: z.enum(['bin', 'item', 'category']),
    objectId: commonValidations.uuid,
    subjectType: z.enum(['user', 'organization', 'role']),
    subjectId: z.string().min(1),
    action: z.enum(['read', 'write', 'admin']),
  }),

  check: z.object({
    objectType: z.enum(['bin', 'item', 'category']),
    objectId: commonValidations.uuid,
    action: z.enum(['read', 'write', 'admin']),
  }),
};

// Utility function for safe validation
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  errors: z.ZodError;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Helper function to sanitize strings
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

// Helper function to validate and sanitize object
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    }
  }
  
  return sanitized;
}