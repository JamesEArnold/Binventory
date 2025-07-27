import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { changePassword } from '@/services/auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { auditLogger, AuditAction } from '@/lib/audit-logger';

// Ensure this API route runs in Node.js runtime (for bcrypt and other Node.js modules)
export const runtime = 'nodejs';

/**
 * Change user password
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

    const { userId, currentPassword, newPassword } = await request.json();

    // Ensure user can only change their own password
    if (session.user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Change password using the auth service
    const result = await changePassword(userId, currentPassword, newPassword);

    // Log the password change attempt
    await auditLogger.logAuth(
      AuditAction.USER_PASSWORD_CHANGE,
      userId,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
      {
        success: result.success,
        error: result.error,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}