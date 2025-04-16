/**
 * @description API Routes for Session Management from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import sessionService from '../../../services/session';
import auditLogService, { AuditAction, AuditEntity } from '../../../services/auditLog';
import { authOptions } from '../[...nextauth]/route';

// Validation schemas
const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

const revokeAllSessionsSchema = z.object({
  currentSessionId: z.string().uuid(),
  confirm: z.boolean().refine(val => val === true, {
    message: 'You must confirm this action',
  }),
});

const extendSessionSchema = z.object({
  sessionId: z.string().uuid(),
  hours: z.number().int().positive().optional(),
});

/**
 * Get all active sessions for the current user
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

    // Get all active sessions
    const result = await sessionService.getUserSessions(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: result.sessions,
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sessions' },
      { status: 500 }
    );
  }
}

/**
 * Revoke a specific session
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

    // Parse and validate request body
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Validate session ID format
    try {
      revokeSessionSchema.parse({ sessionId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    // Revoke the session
    const result = await sessionService.revokeSession(
      sessionId,
      userId,
      ipAddress
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}

/**
 * Revoke all sessions except the current one
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

    // Parse and validate request body
    const body = await request.json();
    const { currentSessionId, confirm } = revokeAllSessionsSchema.parse(body);

    // Revoke all other sessions
    const result = await sessionService.revokeAllSessions(
      userId,
      currentSessionId,
      ipAddress
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Log the action
    await auditLogService.createAuditLog({
      userId,
      action: AuditAction.SESSION_REVOKE,
      entity: AuditEntity.USER,
      entityId: userId,
      ipAddress,
      metadata: {
        allSessions: true,
        exceptCurrent: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error revoking all sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke sessions' },
      { status: 500 }
    );
  }
}

/**
 * Extend a session's expiration time
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

    // Parse and validate request body
    const body = await request.json();
    const { sessionId, hours } = extendSessionSchema.parse(body);

    // Extend the session
    const result = await sessionService.extendSession(
      sessionId,
      userId,
      hours,
      ipAddress
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      session: result.session,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error extending session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extend session' },
      { status: 500 }
    );
  }
} 