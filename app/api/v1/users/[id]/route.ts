import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid user ID');
    }
    
    const db = await getDatabase();
    const userId = toObjectId(params.id);
    
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return notFoundResponse('User not found');
    }
    
    // Get role
    const rolesCollection = db.collection('roles');
    const role = user.roleId 
      ? await rolesCollection.findOne({ _id: user.roleId })
      : null;
    
    const nameParts = (user.fullName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const userData = {
      userId: user._id.toString(),
      firstName,
      lastName,
      email: user.email || '',
      phone: user.phone || '',
      username: user.username || '',
      role: role?.name || '',
      isActive: user.status === 'ACTIVE',
      createdDate: user.createdAt || user._id.getTimestamp(),
    };
    
    return successResponse(userData, 'User retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return errorResponse('Failed to retrieve user', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid user ID');
    }
    
    const body = await request.json();
    const { firstName, lastName, email, phone, role, isActive } = body;
    
    const db = await getDatabase();
    const userId = toObjectId(params.id);
    
    const existingUser = await db.collection('users').findOne({ _id: userId });
    if (!existingUser) {
      return notFoundResponse('User not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (firstName !== undefined || lastName !== undefined) {
      const currentName = existingUser.fullName?.split(' ') || [];
      const newFirstName = firstName !== undefined ? firstName : currentName[0] || '';
      const newLastName = lastName !== undefined ? lastName : currentName.slice(1).join(' ') : '';
      updateData.fullName = `${newFirstName} ${newLastName}`.trim();
    }
    
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) {
      updateData.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    if (role !== undefined) {
      const rolesCollection = db.collection('roles');
      const roleDoc = await rolesCollection.findOne({ name: role });
      if (!roleDoc) {
        return validationErrorResponse('Invalid role', {
          role: ['Role not found'],
        });
      }
      updateData.roleId = roleDoc._id;
    }
    
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: updateData }
    );
    
    const updatedUser = await db.collection('users').findOne({ _id: userId });
    const rolesCollection = db.collection('roles');
    const roleDoc = updatedUser?.roleId 
      ? await rolesCollection.findOne({ _id: updatedUser.roleId })
      : null;
    
    const nameParts = (updatedUser?.fullName || '').split(' ');
    const firstNameFinal = firstName !== undefined ? firstName : nameParts[0] || '';
    const lastNameFinal = lastName !== undefined ? lastName : nameParts.slice(1).join(' ') || '';
    
    const userData = {
      userId: updatedUser!._id.toString(),
      firstName: firstNameFinal,
      lastName: lastNameFinal,
      email: updatedUser?.email || '',
      phone: updatedUser?.phone || '',
      username: updatedUser?.username || '',
      role: roleDoc?.name || '',
      isActive: updatedUser?.status === 'ACTIVE',
      createdDate: updatedUser?.createdAt || updatedUser!._id.getTimestamp(),
      updatedAt: updateData.updatedAt,
    };
    
    return successResponse(userData, 'User updated successfully');
  } catch (error: any) {
    console.error('Error updating user:', error);
    return errorResponse('Failed to update user', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid user ID');
    }
    
    const db = await getDatabase();
    const userId = toObjectId(params.id);
    
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return notFoundResponse('User not found');
    }
    
    // Soft delete - set status to INACTIVE
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          status: 'INACTIVE',
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'User deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return errorResponse('Failed to delete user', 500);
  }
}
