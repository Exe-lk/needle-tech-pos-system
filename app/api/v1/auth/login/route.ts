import { NextRequest } from 'next/server';
import { successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { loginUser } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password using Supabase Auth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
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
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             email:
 *                               type: string
 *                             username:
 *                               type: string
 *                             fullName:
 *                               type: string
 *                             role:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 name:
 *                                   type: string
 *                                 permissions:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                         session:
 *                           type: object
 *                           properties:
 *                             access_token:
 *                               type: string
 *                               description: JWT access token for API requests
 *                             refresh_token:
 *                               type: string
 *                               description: Refresh token for obtaining new access tokens
 *                             expires_in:
 *                               type: integer
 *                               description: Token expiration time in seconds
 *                             expires_at:
 *                               type: integer
 *                               description: Token expiration timestamp
 *       400:
 *         description: Validation error - missing email or password
 *       401:
 *         description: Invalid credentials or inactive account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validation
    if (!email || !password) {
      return validationErrorResponse('Email and password are required');
    }
    
    // Login with Supabase
    const result = await loginUser(email, password);
    
    return successResponse(
      {
        user: result.user,
        session: result.session,
        // For backward compatibility
        userId: result.user.id,
        username: result.user.username,
        role: result.user.role.name,
        accessToken: result.session.access_token,
        refreshToken: result.session.refresh_token,
      },
      'Login successful'
    );
  } catch (error: any) {
    console.error('Error during login:', error);
    return unauthorizedResponse(error.message || 'Login failed');
  }
}
