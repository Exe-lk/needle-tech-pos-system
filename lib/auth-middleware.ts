import { NextRequest } from 'next/server';
import { unauthorizedResponse, forbiddenResponse } from './api-response';
import { authenticateRequest, AuthUser, hasPermission } from './auth-supabase';

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
    } catch (error: any) {
      console.error('Authentication error:', error);
      return unauthorizedResponse(error.message || 'Authentication required');
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
    } catch (error: any) {
      console.error('Authentication error:', error);
      return unauthorizedResponse(error.message || 'Authentication required');
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
    } catch (error: any) {
      console.error('Authentication error:', error);
      return unauthorizedResponse(error.message || 'Authentication required');
    }
  };
}

export { AuthUser };
