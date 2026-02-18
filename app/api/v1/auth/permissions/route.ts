import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { getAccessibleFeatures, getFeaturesByCategory, FEATURES } from '@/lib/permissions';
import type { AuthUser } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/auth/permissions:
 *   get:
 *     summary: Get user permissions and accessible features
 *     description: Returns all features and which ones the user has access to
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuth(async (request: NextRequest, auth: AuthUser) => {
  try {
    const userPermissions = auth.role.permissions || [];
    
    // Get all features grouped by category
    const allFeatures = getFeaturesByCategory();
    
    // Get accessible features for this user
    const accessibleFeatures = getAccessibleFeatures(userPermissions);
    const accessibleRoutes = accessibleFeatures.map(f => f.route);
    
    // Build response with features grouped by category
    const featuresByCategory: Record<string, any[]> = {};
    Object.keys(allFeatures).forEach(category => {
      featuresByCategory[category] = allFeatures[category].map(feature => ({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        route: feature.route,
        permission: feature.permission,
        accessible: accessibleRoutes.includes(feature.route),
      }));
    });
    
    return successResponse({
      user: {
        id: auth.id,
        username: auth.username,
        fullName: auth.fullName,
        email: auth.email,
        role: {
          id: auth.role.id,
          name: auth.role.name,
        },
      },
      permissions: userPermissions,
      accessibleRoutes,
      features: featuresByCategory,
      allFeatures: Object.values(FEATURES).map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        route: f.route,
        permission: f.permission,
        category: f.category,
        accessible: accessibleRoutes.includes(f.route),
      })),
    }, 'Permissions retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return errorResponse('Failed to retrieve permissions', 500);
  }
});
