import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/api-response';
import { ObjectId } from 'mongodb';

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
    
    // TODO: Implement proper password verification (bcrypt.compare)
    // For now, placeholder check
    if (user.passwordHash !== password) {
      return unauthorizedResponse('Invalid username or password');
    }
    
    // Get role
    const rolesCollection = db.collection('roles');
    const role = user.roleId 
      ? await rolesCollection.findOne({ _id: user.roleId })
      : null;
    
    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );
    
    // TODO: Generate JWT tokens
    const accessToken = 'PLACEHOLDER_ACCESS_TOKEN';
    const refreshToken = 'PLACEHOLDER_REFRESH_TOKEN';
    
    return successResponse(
      {
        userId: user._id.toString(),
        username: user.username,
        role: role?.name || '',
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
