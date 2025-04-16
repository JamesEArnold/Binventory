/**
 * @description API Routes for Security Audit Logs from Phase 6.2
 * @phase Advanced Security Features
 * @dependencies Phase 6.1: Core Authentication System
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';
import { Role } from '@prisma/client';
import auditLogService, { AuditAction, AuditEntity } from '../../../../services/auditLog';
import { authOptions } from '../../[...nextauth]/route';

// Validation schemas
const getLogsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
});

const clearLogsSchema = z.object({
  olderThan: z.coerce.date(),
  confirm: z.boolean().refine(val => val === true, {
    message: 'You must confirm this action',
  }),
});

/**
 * Get security audit logs with filtering
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
    const isAdmin = session.user.role === Role.ADMIN;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    
    // Validate parameters
    const validatedParams = getLogsSchema.parse({
      ...params,
      page: params.page || '1',
      limit: params.limit || '20',
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
    });

    // Regular users can only access their own logs
    if (!isAdmin) {
      // Get user's security logs only
      const result = await auditLogService.getUserSecurityLogs(
        userId,
        {
          page: validatedParams.page,
          limit: validatedParams.limit,
        }
      );

      return NextResponse.json({
        success: true,
        logs: result.logs,
        pagination: result.pagination,
      });
    }

    // Admins can access all logs with filtering
    const result = await auditLogService.getAuditLogs({
      userId: validatedParams.entity === 'user' ? userId : undefined,
      action: validatedParams.action as AuditAction | undefined,
      entity: validatedParams.entity as AuditEntity | undefined,
      startDate: validatedParams.startDate,
      endDate: validatedParams.endDate,
      page: validatedParams.page,
      limit: validatedParams.limit,
    });

    return NextResponse.json({
      success: true,
      logs: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error getting security logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve security logs' },
      { status: 500 }
    );
  }
}

/**
 * Export security logs (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Get export parameters
    const filters = {
      userId: body.userId,
      action: body.action as AuditAction | undefined,
      entity: body.entity as AuditEntity | undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    };

    // Export logs
    const logs = await auditLogService.exportAuditLogs(filters);

    // Log the export action
    await auditLogService.createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_USER_UPDATE,
      entity: AuditEntity.SYSTEM,
      entityId: 'logs',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        action: 'export',
        filters,
        count: logs.length,
      },
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      exportedAt: new Date(),
    });
  } catch (error) {
    console.error('Error exporting security logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export security logs' },
      { status: 500 }
    );
  }
}

/**
 * Clear old logs (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { olderThan, confirm } = clearLogsSchema.parse(body);

    // Clear old logs
    const result = await auditLogService.clearOldAuditLogs(olderThan);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Log the clear action
    await auditLogService.createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_USER_DELETE,
      entity: AuditEntity.SYSTEM,
      entityId: 'logs',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        action: 'clear',
        olderThan,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Old logs cleared successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    
    console.error('Error clearing old logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear old logs' },
      { status: 500 }
    );
  }
} 