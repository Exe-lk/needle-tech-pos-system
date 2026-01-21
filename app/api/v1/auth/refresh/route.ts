import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Use a valid refresh token to obtain a new access token and refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token obtained from login
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       400:
 *         description: Validation error - missing refresh token
 *       401:
 *         description: Invalid or expired refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;
    
    // Validation
    if (!refreshToken) {
      return validationErrorResponse('Refresh token is required');
    }
    
    // Verify refresh token
    const payload = verifyToken(refreshToken);
    
    if (!payload) {
      return unauthorizedResponse('Invalid or expired refresh token');
    }
    
    // Check if token type is refresh
    if (payload.type !== 'refresh') {
      return unauthorizedResponse('Invalid token type. Must be a refresh token');
    }
    
    // Verify user still exists and is active
    const db = await getDatabase();
    const user = await db.collection('users').findOne({ username: payload.username });
    
    if (!user) {
      return unauthorizedResponse('User not found');
    }
    
    if (user.status !== 'ACTIVE') {
      return unauthorizedResponse('Account is inactive');
    }
    
    // Get role
    const rolesCollection = db.collection('roles');
    const role = user.roleId 
      ? await rolesCollection.findOne({ _id: user.roleId })
      : null;
    
    const roleName = role?.name || 'USER';
    
    // Generate new tokens
    const newAccessToken = generateAccessToken(payload.userId, payload.username, roleName);
    const newRefreshToken = generateRefreshToken(payload.userId, payload.username, roleName);
    
    return successResponse(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return unauthorizedResponse('Token refresh failed');
  }
}
