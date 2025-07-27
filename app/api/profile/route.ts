import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { updateUserProfile } from '@/services/auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { auditLogger, AuditAction } from '@/lib/audit-logger';

// Ensure this API route runs in Node.js runtime (for bcrypt and other Node.js modules)
export const runtime = 'nodejs';

/**
 * Update user profile
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

    const { userId, name, image } = await request.json();

    // Ensure user can only update their own profile (or admin can update any)
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update profile using the auth service
    const result = await updateUserProfile(userId, { name, image });

    // Log the profile update
    await auditLogger.logDataAccess(
      AuditAction.BIN_UPDATE, // We'll use this for now, could create USER_UPDATE action
      session.user.id,
      'user',
      userId,
      request.headers.get('x-forwarded-for') || 'unknown',
      {
        action: 'profile_update',
        fields: { name: !!name, image: !!image },
        success: result.success,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}