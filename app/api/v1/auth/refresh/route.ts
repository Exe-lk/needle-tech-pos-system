import { NextRequest } from 'next/server';
import { successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { refreshToken } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Use a valid refresh token to obtain a new access token using Supabase Auth
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
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
 *                         session:
 *                           type: object
 *                           properties:
 *                             access_token:
 *                               type: string
 *                             refresh_token:
 *                               type: string
 *                             expires_in:
 *                               type: integer
 *                             expires_at:
 *                               type: integer
 *                         accessToken:
 *                           type: string
 *                           description: New access token (for backward compatibility)
 *                         refreshToken:
 *                           type: string
 *                           description: New refresh token (for backward compatibility)
 *       400:
 *         description: Validation error - missing refresh token
 *       401:
 *         description: Invalid or expired refresh token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken: refresh_token } = body;
    
    // Validation
    if (!refresh_token) {
      return validationErrorResponse('Refresh token is required');
    }
    
    // Refresh token with Supabase
    const newSession = await refreshToken(refresh_token);
    
    if (!newSession) {
      return unauthorizedResponse('Failed to refresh token');
    }
    
    return successResponse(
      {
        session: newSession,
        // For backward compatibility
        accessToken: newSession.access_token,
        refreshToken: newSession.refresh_token,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return unauthorizedResponse(error.message || 'Token refresh failed');
  }
}
