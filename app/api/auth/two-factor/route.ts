/**
 * @description API Routes for Two-Factor Authentication from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import twoFactorService from '../../../../services/twoFactor';
import auditLogService, { AuditAction, AuditEntity } from '../../../../services/auditLog';
import { authOptions } from '../../[...nextauth]/route';

// Validation schemas
const setupTwoFactorSchema = z.object({});
const verifyTwoFactorSchema = z.object({
  token: z.string().length(6).regex(/^\d+$/),
});
const verifyRecoveryCodeSchema = z.object({
  recoveryCode: z.string().min(10),
});
const disableTwoFactorSchema = z.object({
  confirm: z.boolean().refine(val => val === true, {
    message: 'You must confirm this action',
  }),
});

/**
 * Setup 2FA - Generate secret and QR code
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate TOTP secret
    const result = await twoFactorService.generateTOTPSecret({ userId });

    // Log the 2FA setup attempt
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.TWO_FACTOR_ENABLE,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: {
        success: result.success,
        error: result.error,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Return QR code URL and recovery codes
    return NextResponse.json({
      success: true,
      qrCodeUrl: result.qrCodeUrl,
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup two-factor authentication' },
      { status: 500 }
    );
  }
}

/**
 * Verify TOTP token and complete 2FA setup
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse and validate request body
    const body = await request.json();
    const { token } = verifyTwoFactorSchema.parse(body);

    // Verify TOTP token
    const result = await twoFactorService.verifyTOTP({
      userId,
      token,
    });

    // Log the 2FA verification attempt
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.TWO_FACTOR_VERIFY,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: {
        success: result.success,
        error: result.error,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication verified successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error verifying 2FA token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
}

/**
 * Disable 2FA
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse and validate request body
    const body = await request.json();
    const { confirm } = disableTwoFactorSchema.parse(body);

    // Disable 2FA
    const result = await twoFactorService.disableTwoFactor(userId);

    // Log the 2FA disable attempt
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.TWO_FACTOR_DISABLE,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: {
        success: result.success,
        error: result.error,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}

/**
 * Get 2FA status
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get 2FA status
    const result = await twoFactorService.getTwoFactorStatus(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get two-factor authentication status' },
      { status: 500 }
    );
  }
}

/**
 * Recovery code verification endpoint
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get client information
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse and validate request body
    const body = await request.json();
    const { recoveryCode } = verifyRecoveryCodeSchema.parse(body);

    // Verify recovery code
    const result = await twoFactorService.verifyRecoveryCode({
      userId,
      recoveryCode,
    });

    // Log the recovery code usage
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.TWO_FACTOR_RECOVERY,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      userAgent,
      metadata: {
        success: result.success,
        error: result.error,
        remainingCodes: result.recoveryCodes?.length,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery code verified successfully',
      remainingCodes: result.recoveryCodes?.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error verifying recovery code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify recovery code' },
      { status: 500 }
    );
  }
} 