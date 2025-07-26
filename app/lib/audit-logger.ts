/**
 * Comprehensive audit logging for security-sensitive operations
 */

import { prisma } from '@/lib/prisma';
import { PrismaClient } from '@prisma/client';

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'user.login',
  USER_LOGIN_FAILED = 'user.login.failed',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
  USER_PASSWORD_CHANGE = 'user.password.change',
  USER_2FA_ENABLE = 'user.2fa.enable',
  USER_2FA_DISABLE = 'user.2fa.disable',
  USER_ACCOUNT_LOCKED = 'user.account.locked',
  USER_ACCOUNT_UNLOCKED = 'user.account.unlocked',
  
  // Authorization
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'access.unauthorized',
  PRIVILEGE_ESCALATION_ATTEMPT = 'privilege.escalation.attempt',
  
  // Data Operations
  BIN_CREATE = 'bin.create',
  BIN_UPDATE = 'bin.update',
  BIN_DELETE = 'bin.delete',
  BIN_ACCESS = 'bin.access',
  ITEM_CREATE = 'item.create',
  ITEM_UPDATE = 'item.update',
  ITEM_DELETE = 'item.delete',
  ITEM_ACCESS = 'item.access',
  CATEGORY_CREATE = 'category.create',
  CATEGORY_UPDATE = 'category.update',
  CATEGORY_DELETE = 'category.delete',
  
  // File Operations
  FILE_UPLOAD = 'file.upload',
  FILE_DELETE = 'file.delete',
  FILE_ACCESS = 'file.access',
  FILE_MALWARE_DETECTED = 'file.malware.detected',
  
  // Organization
  ORG_CREATE = 'organization.create',
  ORG_UPDATE = 'organization.update',
  ORG_DELETE = 'organization.delete',
  ORG_MEMBER_ADD = 'organization.member.add',
  ORG_MEMBER_REMOVE = 'organization.member.remove',
  ORG_MEMBER_ROLE_CHANGE = 'organization.member.role.change',
  
  // Security Events
  CSRF_TOKEN_INVALID = 'security.csrf.invalid',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  SQL_INJECTION_ATTEMPT = 'security.sql_injection.attempt',
  XSS_ATTEMPT = 'security.xss.attempt',
  
  // Admin Actions
  ADMIN_USER_IMPERSONATE = 'admin.user.impersonate',
  ADMIN_DATA_EXPORT = 'admin.data.export',
  ADMIN_CONFIG_CHANGE = 'admin.config.change',
  ADMIN_BULK_DELETE = 'admin.bulk.delete',
}

export interface AuditLogEntry {
  action: AuditAction;
  userId?: string;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  success?: boolean;
}

export interface AuditLogOptions {
  prismaClient?: PrismaClient;
  enableConsoleLogging?: boolean;
  enableFileLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

class AuditLogger {
  private prismaClient: PrismaClient;
  private enableConsoleLogging: boolean;
  private enableFileLogging: boolean;
  private logLevel: string;

  constructor(options: AuditLogOptions = {}) {
    this.prismaClient = options.prismaClient || prisma;
    this.enableConsoleLogging = options.enableConsoleLogging ?? (process.env.NODE_ENV === 'development');
    this.enableFileLogging = options.enableFileLogging ?? true;
    this.logLevel = options.logLevel || 'info';
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Determine severity if not provided
      const severity = entry.severity || this.determineSeverity(entry.action);
      
      // Create database log entry
      if (this.enableFileLogging) {
        await this.logToDatabase({
          ...entry,
          severity,
        });
      }
      
      // Console logging for development
      if (this.enableConsoleLogging) {
        this.logToConsole({
          ...entry,
          severity,
        });
      }
      
      // Additional alerting for critical events
      if (severity === 'critical') {
        await this.handleCriticalEvent(entry);
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw to avoid breaking the main application flow
    }
  }

  /**
   * Log to database
   */
  private async logToDatabase(entry: AuditLogEntry & { severity: string }): Promise<void> {
    await this.prismaClient.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId || null,
        entity: entry.entity || null,
        entityId: entry.entityId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        metadata: entry.metadata || null,
      },
    });
  }

  /**
   * Log to console for development
   */
  private logToConsole(entry: AuditLogEntry & { severity: string }): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[AUDIT] ${timestamp} - ${entry.action} - User: ${entry.userId || 'anonymous'} - IP: ${entry.ipAddress || 'unknown'}`;
    
    switch (entry.severity) {
      case 'critical':
        console.error(`🚨 ${logMessage}`, entry);
        break;
      case 'high':
        console.warn(`⚠️  ${logMessage}`, entry);
        break;
      case 'medium':
        console.info(`ℹ️  ${logMessage}`, entry);
        break;
      case 'low':
        console.log(`📝 ${logMessage}`, entry);
        break;
      default:
        console.log(`📝 ${logMessage}`, entry);
    }
  }

  /**
   * Determine severity based on action type
   */
  private determineSeverity(action: AuditAction): 'low' | 'medium' | 'high' | 'critical' {
    const criticalActions = [
      AuditAction.PRIVILEGE_ESCALATION_ATTEMPT,
      AuditAction.SQL_INJECTION_ATTEMPT,
      AuditAction.FILE_MALWARE_DETECTED,
      AuditAction.ADMIN_BULK_DELETE,
    ];
    
    const highActions = [
      AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      AuditAction.USER_ACCOUNT_LOCKED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.CSRF_TOKEN_INVALID,
      AuditAction.XSS_ATTEMPT,
      AuditAction.ADMIN_USER_IMPERSONATE,
      AuditAction.ADMIN_DATA_EXPORT,
    ];
    
    const mediumActions = [
      AuditAction.USER_LOGIN_FAILED,
      AuditAction.PERMISSION_GRANTED,
      AuditAction.PERMISSION_REVOKED,
      AuditAction.USER_PASSWORD_CHANGE,
      AuditAction.RATE_LIMIT_EXCEEDED,
      AuditAction.FILE_DELETE,
      AuditAction.ORG_MEMBER_ROLE_CHANGE,
    ];
    
    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  }

  /**
   * Handle critical security events
   */
  private async handleCriticalEvent(entry: AuditLogEntry): Promise<void> {
    // In production, this could:
    // - Send alerts to security team
    // - Trigger automated responses
    // - Write to external SIEM systems
    // - Send notifications via webhook
    
    console.error('🚨 CRITICAL SECURITY EVENT:', {
      action: entry.action,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      timestamp: new Date().toISOString(),
      metadata: entry.metadata,
    });
  }

  /**
   * Log authentication events
   */
  async logAuth(action: AuditAction, userId?: string, ipAddress?: string, userAgent?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      action,
      userId,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(action: AuditAction, userId: string, entity: string, entityId: string, ipAddress?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      action,
      userId,
      entity,
      entityId,
      ipAddress,
      metadata,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(action: AuditAction, ipAddress?: string, userAgent?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      action,
      ipAddress,
      userAgent,
      metadata,
      severity: 'high',
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    userId?: string;
    action?: AuditAction;
    entity?: string;
    entityId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.ipAddress) where.ipAddress = filters.ipAddress;
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }
    
    return await this.prismaClient.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }
}

// Create default instance
export const auditLogger = new AuditLogger();

// Helper functions for common logging patterns
export const logAuth = auditLogger.logAuth.bind(auditLogger);
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger);
export const logSecurityEvent = auditLogger.logSecurityEvent.bind(auditLogger);