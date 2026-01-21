import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, verifyPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with username and password, returns access and refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
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
 *                       $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation error - missing username or password
 *       401:
 *         description: Invalid credentials or inactive account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;
    
    // Validation
    if (!username || !password) {
      return validationErrorResponse('Username and password are required');
    }
    
    const db = await getDatabase();
    
    // Find user by username
    const user = await db.collection('users').findOne({ username });
    
    if (!user) {
      return unauthorizedResponse('Invalid username or password');
    }
    
    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return unauthorizedResponse('Account is inactive');
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return unauthorizedResponse('Invalid username or password');
    }
    
    // Get role
    const rolesCollection = db.collection('roles');
    const role = user.roleId 
      ? await rolesCollection.findOne({ _id: user.roleId })
      : null;
    
    const roleName = role?.name || 'USER';
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );
    
    // Generate JWT tokens
    const accessToken = generateAccessToken(user._id.toString(), user.username, roleName);
    const refreshToken = generateRefreshToken(user._id.toString(), user.username, roleName);
    
    return successResponse(
      {
        userId: user._id.toString(),
        username: user.username,
        role: roleName,
        accessToken,
        refreshToken,
      },
      'Login successful'
    );
  } catch (error: any) {
    console.error('Error during login:', error);
    return unauthorizedResponse('Login failed');
  }
}
