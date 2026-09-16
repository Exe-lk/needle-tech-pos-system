import { NextRequest } from 'next/server';
import prisma from './prisma';
import { AuthUser } from './auth-supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT';

export interface AuditLogOptions {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description?: string;
  before?: any;
  after?: any;
}

/**
 * Utility function to log an audit action to the database.
 * 
 * @param request The incoming NextRequest to extract IP and user agent
 * @param auth The authenticated user object
 * @param options Details about the action being logged
 */
export async function logAuditAction(
  request: NextRequest,
  auth: AuthUser,
  options: AuditLogOptions
) {
  try {
    // Attempt to extract IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const sourceIp = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
    
    // Extract User Agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Normalize JSON payloads so Prisma accepts them (null vs undefined)
    const beforePayload = options.before ? JSON.parse(JSON.stringify(options.before)) : undefined;
    const afterPayload = options.after ? JSON.parse(JSON.stringify(options.after)) : undefined;

    await prisma.auditLog.create({
      data: {
        userId: auth.id,
        roleId: auth.role.id,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        description: options.description,
        before: beforePayload,
        after: afterPayload,
        sourceIp,
        userAgent,
      },
    });
  } catch (error) {
    // We log the error but don't throw it, so that a failed audit log
    // doesn't bring down the main business transaction.
    console.error('Failed to write audit log:', error);
  }
}
