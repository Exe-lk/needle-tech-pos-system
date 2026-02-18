import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { getAccessibleRoutes } from '@/lib/permissions';
import type { AuthUser } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user information
 *     description: Returns current authenticated user with permissions and accessible routes
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuth(async (request: NextRequest, auth: AuthUser) => {
  try {
    const userPermissions = auth.role.permissions || [];
    const accessibleRoutes = getAccessibleRoutes(userPermissions);
    
    return successResponse({
      id: auth.id,
      username: auth.username,
      fullName: auth.fullName,
      email: auth.email,
      role: {
        id: auth.role.id,
        name: auth.role.name,
        permissions: userPermissions,
      },
      accessibleRoutes,
    }, 'User information retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching user info:', error);
    return errorResponse('Failed to retrieve user information', 500);
  }
});
