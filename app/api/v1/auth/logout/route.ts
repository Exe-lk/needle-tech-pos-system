import { NextRequest } from 'next/server';
import { successResponse, unauthorizedResponse } from '@/lib/api-response';
import { logoutUser } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Revoke the current session using Supabase Auth
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Invalid or missing token
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('No token provided');
    }
    
    const token = authHeader.substring(7);
    
    // Logout with Supabase (revokes refresh token)
    await logoutUser(token);
    
    return successResponse(
      { success: true },
      'Logout successful'
    );
  } catch (error: any) {
    console.error('Error during logout:', error);
    return unauthorizedResponse(error.message || 'Logout failed');
  }
}
