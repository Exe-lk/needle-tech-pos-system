import { NextRequest } from 'next/server';
import { successResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import { registerUser } from '@/lib/auth-supabase';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account with Supabase Auth (no email confirmation required)
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
 *               - username
 *               - fullName
 *               - roleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: User password (minimum 6 characters)
 *                 example: password123
 *               username:
 *                 type: string
 *                 description: Unique username
 *                 example: john_doe
 *               fullName:
 *                 type: string
 *                 description: User's full name
 *                 example: John Doe
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 description: Role ID (must exist in roles table)
 *               phone:
 *                 type: string
 *                 description: Optional phone number
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Registration successful
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
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error during registration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, fullName, roleId, phone } = body;
    
    // Validation
    if (!email || !password || !username || !fullName || !roleId) {
      return validationErrorResponse('Email, password, username, fullName, and roleId are required');
    }

    if (password.length < 6) {
      return validationErrorResponse('Password must be at least 6 characters long');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      return validationErrorResponse('Invalid role ID');
    }
    
    // Register user
    const result = await registerUser({
      email,
      password,
      username,
      fullName,
      roleId,
      phone
    });
    
    return successResponse(
      {
        user: result.user
      },
      'Registration successful. You can now login with your credentials.'
    );
  } catch (error: any) {
    console.error('Error during registration:', error);
    if (error.message.includes('already exists') || error.message.includes('duplicate') || error.message.includes('unique')) {
      return validationErrorResponse(error.message);
    }
    return serverErrorResponse(error.message || 'Registration failed');
  }
}
