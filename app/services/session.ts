/**
 * @description Implementation for Session Management from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import auditLogService, { AuditAction, AuditEntity } from './auditLog';

const prisma = new PrismaClient();

// Validation schema for session operations
export const updateSessionSchema = z.object({
  id: z.string().uuid(),
  expires: z.date().optional(),
});

export const createSessionDetailsSchema = z.object({
  sessionId: z.string().uuid(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceType: z.string().optional(),
  deviceName: z.string().optional(),
  lastActive: z.date().optional(),
  location: z.string().optional(),
});

export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateSessionDetailsInput = z.infer<typeof createSessionDetailsSchema>;

export type SessionResult = {
  success: boolean;
  session?: any;
  error?: string;
};

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires: 'desc',
      },
    });

    return {
      success: true,
      sessions,
    };
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return {
      success: false,
      error: 'Failed to retrieve active sessions',
    };
  }
}

/**
 * Revoke a specific session
 */
export async function revokeSession(
  sessionId: string,
  userId: string,
  ipAddress?: string
): Promise<SessionResult> {
  try {
    // Verify the session belongs to the user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      return {
        success: false,
        error: 'Session not found or does not belong to this user',
      };
    }

    // Delete the session
    await prisma.session.delete({
      where: {
        id: sessionId,
      },
    });

    // Log the session revocation
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.SESSION_REVOKE,
      entity: AuditEntity.SESSION,
      entityId: sessionId,
      ipAddress,
      metadata: {
        sessionToken: session.sessionToken.substring(0, 8) + '...',
      },
    });

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  } catch (error) {
    console.error('Error revoking session:', error);
    return {
      success: false,
      error: 'Failed to revoke session',
    };
  }
}

/**
 * Revoke all sessions for a user except the current one
 */
export async function revokeAllSessions(
  userId: string,
  currentSessionId: string,
  ipAddress?: string
): Promise<SessionResult> {
  try {
    // Find all other sessions for this user
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        id: {
          not: currentSessionId,
        },
      },
    });

    if (sessions.length === 0) {
      return {
        success: true,
        message: 'No other active sessions found',
      };
    }

    // Delete all other sessions
    await prisma.session.deleteMany({
      where: {
        userId,
        id: {
          not: currentSessionId,
        },
      },
    });

    // Log the session revocation
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.SESSION_REVOKE,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      metadata: {
        count: sessions.length,
        currentSessionId,
      },
    });

    return {
      success: true,
      message: `Successfully revoked ${sessions.length} sessions`,
    };
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return {
      success: false,
      error: 'Failed to revoke sessions',
    };
  }
}

/**
 * Extend a session's expiration time
 */
export async function extendSession(
  sessionId: string,
  userId: string,
  hours: number = 24,
  ipAddress?: string
): Promise<SessionResult> {
  try {
    // Verify the session belongs to the user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      return {
        success: false,
        error: 'Session not found, expired, or does not belong to this user',
      };
    }

    // Calculate new expiration time
    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + hours);

    // Update the session expiration
    const updatedSession = await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        expires: newExpiry,
      },
    });

    // Log the session extension
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.SESSION_REFRESH,
      entity: AuditEntity.SESSION,
      entityId: sessionId,
      ipAddress,
      metadata: {
        previousExpiry: session.expires,
        newExpiry,
      },
    });

    return {
      success: true,
      session: updatedSession,
      message: `Session extended by ${hours} hours`,
    };
  } catch (error) {
    console.error('Error extending session:', error);
    return {
      success: false,
      error: 'Failed to extend session',
    };
  }
}

/**
 * Track suspicious sessions (multiple locations, unusual times)
 */
export async function trackSuspiciousActivity(
  userId: string,
  sessionId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ isSuspicious: boolean; reasons: string[] }> {
  try {
    // Get recent user sessions
    const recentSessions = await prisma.session.findMany({
      where: {
        userId,
        id: {
          not: sessionId, // Exclude current session
        },
        expires: {
          gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Within last 30 days
        },
      },
      orderBy: {
        expires: 'desc',
      },
      take: 10,
    });

    // Initialize result
    const result = {
      isSuspicious: false,
      reasons: [] as string[],
    };

    // Check for suspicious activity patterns
    // This is a placeholder for more comprehensive logic
    // In a real implementation, you would check for:
    // 1. Geolocation changes based on IP
    // 2. Unusual access times
    // 3. Different device/browser patterns
    // 4. Rapid session creation
    // 5. Known malicious IPs

    // Simple placeholder check
    if (recentSessions.length > 0 && recentSessions.length < 3) {
      // If there are only a few sessions, new login from different device might be suspicious
      result.isSuspicious = true;
      result.reasons.push('Login from new device detected');
    }

    if (result.isSuspicious) {
      // Log the suspicious activity
      await auditLogService.createAuditLog({
        userId,
        action: AuditAction.SESSION_CREATE,
        entity: AuditEntity.SESSION,
        entityId: sessionId,
        ipAddress,
        userAgent,
        metadata: {
          suspicious: true,
          reasons: result.reasons,
        },
      });
    }

    return result;
  } catch (error) {
    console.error('Error tracking suspicious activity:', error);
    return {
      isSuspicious: false,
      reasons: ['Error processing security check'],
    };
  }
}

/**
 * Clean up expired sessions from the database
 */
export async function cleanupExpiredSessions(): Promise<SessionResult> {
  try {
    // Delete all expired sessions
    const result = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });

    // Log the cleanup operation if sessions were deleted
    if (result.count > 0) {
      await auditLogService.createAuditLog({
        action: AuditAction.SESSION_EXPIRE,
        entity: AuditEntity.SYSTEM,
        metadata: {
          count: result.count,
          timestamp: new Date(),
        },
      });
    }

    return {
      success: true,
      message: `Cleaned up ${result.count} expired sessions`,
    };
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return {
      success: false,
      error: 'Failed to clean up expired sessions',
    };
  }
}

// Factory function for session service
export function createSessionService() {
  return {
    getUserSessions,
    revokeSession,
    revokeAllSessions,
    extendSession,
    trackSuspiciousActivity,
    cleanupExpiredSessions,
  };
}

export default createSessionService(); 