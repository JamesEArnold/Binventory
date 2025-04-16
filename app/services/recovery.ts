/**
 * @description Implementation for Account Recovery from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import crypto from 'crypto';
import { hash } from 'bcrypt';
import auditLogService, { AuditAction, AuditEntity } from './auditLog';

const prisma = new PrismaClient();

// Validation schemas
export const requestRecoverySchema = z.object({
  email: z.string().email(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const verifyRecoveryTokenSchema = z.object({
  token: z.string().min(20),
  ipAddress: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(100),
  ipAddress: z.string().optional(),
});

export type RequestRecoveryInput = z.infer<typeof requestRecoverySchema>;
export type VerifyRecoveryTokenInput = z.infer<typeof verifyRecoveryTokenSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type RecoveryResult = {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
  message?: string;
};

/**
 * Generate a secure random token for password recovery
 */
function generateRecoveryToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request a password recovery token
 */
export async function requestRecovery(
  data: RequestRecoveryInput
): Promise<RecoveryResult> {
  try {
    const { email, ipAddress, userAgent } = requestRecoverySchema.parse(data);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal whether the user exists or not
      return {
        success: true,
        message: 'If your email is in our system, you will receive recovery instructions.',
      };
    }

    // Generate a recovery token
    const token = generateRecoveryToken();
    
    // Calculate expiration time (1 hour from now)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    // Store recovery token
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: user.id,
          token: 'recovery', // Using a static token field as a key
        },
      },
      update: {
        token,
        expires,
      },
      create: {
        identifier: user.id,
        token,
        expires,
      },
    });

    // Log the recovery request
    await auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUEST,
      entity: AuditEntity.USER,
      entityId: user.id,
      ipAddress,
      userAgent,
      metadata: {
        email: user.email,
        expires,
      },
    });

    // In a real application, you would send an email with the recovery link
    // For this implementation, we just return the token for demonstration
    return {
      success: true,
      message: 'If your email is in our system, you will receive recovery instructions.',
      // In a real app, you would NOT return these values for security
      // They're included here for demonstration only
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error requesting recovery:', error);
    return { success: false, error: 'Failed to process recovery request' };
  }
}

/**
 * Verify a recovery token
 */
export async function verifyRecoveryToken(
  data: VerifyRecoveryTokenInput
): Promise<RecoveryResult> {
  try {
    const { token, ipAddress } = verifyRecoveryTokenSchema.parse(data);

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return { success: false, error: 'Invalid or expired recovery token' };
    }

    // Find the associated user
    const user = await prisma.user.findFirst({
      where: { id: verificationToken.identifier },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Log the token verification
    await auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUEST,
      entity: AuditEntity.USER,
      entityId: user.id,
      ipAddress,
      metadata: {
        verified: true,
      },
    });

    return {
      success: true,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error verifying recovery token:', error);
    return { success: false, error: 'Failed to verify recovery token' };
  }
}

/**
 * Reset password using a recovery token
 */
export async function resetPassword(
  data: ResetPasswordInput
): Promise<RecoveryResult> {
  try {
    const { token, password, ipAddress } = resetPasswordSchema.parse(data);

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token,
        expires: {
          gt: new Date(),
        },
      },
    });

    if (!verificationToken) {
      return { success: false, error: 'Invalid or expired recovery token' };
    }

    // Find the associated user
    const user = await prisma.user.findFirst({
      where: { id: verificationToken.identifier },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Hash the new password
    const hashedPassword = await hash(password, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: user.id,
          token: verificationToken.token,
        },
      },
    });

    // Log the password reset
    await auditLogService.createAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_COMPLETE,
      entity: AuditEntity.USER,
      entityId: user.id,
      ipAddress,
      metadata: {
        completed: true,
      },
    });

    // Revoke all sessions for security
    // This implementation requires session service, which would be
    // imported and called here in a complete implementation

    return {
      success: true,
      message: 'Password reset successfully',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    console.error('Error resetting password:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

/**
 * Get active recovery requests count (for rate limiting)
 */
export async function getActiveRecoveryRequestsCount(
  email: string,
  timeWindowMinutes: number = 60
): Promise<number> {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return 0;
    }

    // Calculate time window
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

    // Get count of recent recovery requests
    const recentRequests = await auditLogService.getAuditLogs({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUEST,
      startDate: timeWindow,
    });

    return recentRequests.logs.length;
  } catch (error) {
    console.error('Error getting active recovery requests count:', error);
    return 0; // Default to 0 to allow recovery attempts
  }
}

// Factory function for recovery service
export function createRecoveryService() {
  return {
    requestRecovery,
    verifyRecoveryToken,
    resetPassword,
    getActiveRecoveryRequestsCount,
  };
}

export default createRecoveryService(); 