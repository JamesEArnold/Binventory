/**
 * @description Implementation for Security Audit Logging from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Audit action categories
export enum AuditAction {
  // Authentication events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  REGISTER = 'auth.register',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET_REQUEST = 'auth.password.reset.request',
  PASSWORD_RESET_COMPLETE = 'auth.password.reset.complete',
  
  // Two-factor authentication events
  TWO_FACTOR_ENABLE = 'auth.2fa.enable',
  TWO_FACTOR_VERIFY = 'auth.2fa.verify',
  TWO_FACTOR_DISABLE = 'auth.2fa.disable',
  TWO_FACTOR_RECOVERY = 'auth.2fa.recovery',
  
  // Session events
  SESSION_CREATE = 'session.create',
  SESSION_REFRESH = 'session.refresh',
  SESSION_EXPIRE = 'session.expire',
  SESSION_REVOKE = 'session.revoke',
  
  // User account events
  PROFILE_UPDATE = 'user.profile.update',
  EMAIL_CHANGE = 'user.email.change',
  ROLE_CHANGE = 'user.role.change',
  
  // Admin actions
  ADMIN_USER_CREATE = 'admin.user.create',
  ADMIN_USER_UPDATE = 'admin.user.update',
  ADMIN_USER_DELETE = 'admin.user.delete',
  
  // API usage
  API_REQUEST = 'api.request',
  API_ERROR = 'api.error'
}

// Entity types for audit logs
export enum AuditEntity {
  USER = 'user',
  SESSION = 'session',
  BIN = 'bin',
  ITEM = 'item',
  CATEGORY = 'category',
  SYSTEM = 'system'
}

// Validation schema for creating audit logs
export const createAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction),
  entity: z.nativeEnum(AuditEntity).optional(),
  entityId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;

export type AuditLogResult = {
  success: boolean;
  error?: string;
};

/**
 * Create a new audit log entry
 */
export async function createAuditLog(
  data: CreateAuditLogInput
): Promise<AuditLogResult> {
  try {
    const validatedData = createAuditLogSchema.parse(data);
    
    await prisma.auditLog.create({
      data: {
        userId: validatedData.userId,
        action: validatedData.action,
        entity: validatedData.entity,
        entityId: validatedData.entityId,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent,
        metadata: validatedData.metadata || {},
      },
    });
    
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error creating audit log:', error);
    return { success: false, error: 'Failed to create audit log entry' };
  }
}

/**
 * Get audit logs with filtering options
 */
export async function getAuditLogs({
  userId,
  action,
  entity,
  startDate,
  endDate,
  page = 1,
  limit = 50,
}: {
  userId?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  try {
    const skip = (page - 1) * limit;
    
    // Build the filter conditions
    const where: any = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (entity) {
      where.entity = entity;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }
    
    // Get audit logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw new Error('Failed to retrieve audit logs');
  }
}

/**
 * Get user activity logs by userId
 */
export async function getUserActivityLogs(
  userId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number; } = {}
) {
  return getAuditLogs({
    userId,
    page,
    limit,
  });
}

/**
 * Get security events for a user
 */
export async function getUserSecurityLogs(
  userId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number; } = {}
) {
  // Security-related audit actions
  const securityActions = [
    AuditAction.LOGIN_SUCCESS,
    AuditAction.LOGIN_FAILURE,
    AuditAction.PASSWORD_CHANGE,
    AuditAction.PASSWORD_RESET_REQUEST,
    AuditAction.PASSWORD_RESET_COMPLETE,
    AuditAction.TWO_FACTOR_ENABLE,
    AuditAction.TWO_FACTOR_VERIFY,
    AuditAction.TWO_FACTOR_DISABLE,
    AuditAction.TWO_FACTOR_RECOVERY,
    AuditAction.SESSION_CREATE,
    AuditAction.SESSION_REVOKE,
  ];
  
  try {
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          userId,
          action: {
            in: securityActions,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: {
          userId,
          action: {
            in: securityActions,
          },
        },
      }),
    ]);
    
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting user security logs:', error);
    throw new Error('Failed to retrieve security logs');
  }
}

/**
 * Clear audit logs older than a specified date
 */
export async function clearOldAuditLogs(
  olderThan: Date
): Promise<AuditLogResult> {
  try {
    // Delete logs older than the specified date
    await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing old audit logs:', error);
    return { success: false, error: 'Failed to clear old audit logs' };
  }
}

/**
 * Export audit logs to JSON format
 */
export async function exportAuditLogs(
  filters: {
    userId?: string;
    action?: AuditAction;
    entity?: AuditEntity;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  try {
    // Build the filter conditions
    const where: any = {};
    
    if (filters.userId) {
      where.userId = filters.userId;
    }
    
    if (filters.action) {
      where.action = filters.action;
    }
    
    if (filters.entity) {
      where.entity = filters.entity;
    }
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }
    
    // Get all matching logs (no pagination)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return logs;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw new Error('Failed to export audit logs');
  }
}

// Factory function for audit log service
export function createAuditLogService() {
  return {
    createAuditLog,
    getAuditLogs,
    getUserActivityLogs,
    getUserSecurityLogs,
    clearOldAuditLogs,
    exportAuditLogs,
  };
}

export default createAuditLogService(); 