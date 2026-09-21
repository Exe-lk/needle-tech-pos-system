import { NextRequest } from 'next/server';
import { unauthorizedResponse, forbiddenResponse, errorResponse } from './api-response';
import { authenticateRequest, hasPermission } from './auth-supabase';
import type { AuthUser } from './auth-supabase';
import { isDatabaseUnavailable } from './db-errors';

function authCatchResponse(error: unknown) {
  if (isDatabaseUnavailable(error)) {
    console.error('Database unavailable during authentication:', error);
    return errorResponse('Database temporarily unavailable. Please try again.', 503);
  }
  console.error('Authentication error:', error);
  const message = error instanceof Error ? error.message : 'Authentication required';
  return unauthorizedResponse(message);
}

/**
 * Middleware wrapper for protected routes
 * Use this to wrap your route handlers to require authentication via Supabase
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, auth: AuthUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const auth = await authenticateRequest(request);
      return handler(request, auth, ...args);
    } catch (error: unknown) {
      return authCatchResponse(error);
    }
  };
}

/**
 * Middleware wrapper for protected routes with role-based authorization
 * Use this to restrict access to specific roles
 */
export function withAuthAndRole<T extends any[]>(
  allowedRoles: string[],
  handler: (request: NextRequest, auth: AuthUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const auth = await authenticateRequest(request);
      
      if (!allowedRoles.includes(auth.role.name)) {
        return forbiddenResponse(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }
      
      return handler(request, auth, ...args);
    } catch (error: unknown) {
      return authCatchResponse(error);
    }
  };
}

/**
 * Middleware wrapper for protected routes with permission-based authorization
 * Use this to restrict access to specific permissions
 */
export function withAuthAndPermission<T extends any[]>(
  requiredPermissions: string[],
  handler: (request: NextRequest, auth: AuthUser, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    try {
      const auth = await authenticateRequest(request);
      
      // Check if user has any of the required permissions
      const hasRequiredPermission = requiredPermissions.some(permission => 
        hasPermission(auth, permission)
      );
      
      if (!hasRequiredPermission) {
        return forbiddenResponse(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
      }
      
      return handler(request, auth, ...args);
    } catch (error: unknown) {
      return authCatchResponse(error);
    }
  };
}

export type { AuthUser };
