import { NextRequest } from 'next/server';
import { successResponse, unauthorizedResponse } from '@/lib/api-response';
import { extractToken, blacklistToken, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate the current access token by adding it to the blacklist
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
    const token = extractToken(request);
    
    if (!token) {
      return unauthorizedResponse('No token provided');
    }
    
    // Verify token is valid before blacklisting
    const payload = verifyToken(token);
    
    if (!payload) {
      return unauthorizedResponse('Invalid token');
    }
    
    // Add token to blacklist
    blacklistToken(token);
    
    return successResponse(
      null,
      'Logout successful'
    );
  } catch (error: any) {
    console.error('Error during logout:', error);
    return unauthorizedResponse('Logout failed');
  }
}
