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
      return validationErrorResponse('Invalid role ID');
    }
    
    const db = await getDatabase();
    const roleId = toObjectId(params.id);
    
    const role = await db.collection('roles').findOne({ _id: roleId });
    
    if (!role) {
      return notFoundResponse('Role not found');
    }
    
    return successResponse(sanitizeObject(role), 'Role retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching role:', error);
    return errorResponse('Failed to retrieve role', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid role ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const roleId = toObjectId(params.id);
    
    const existingRole = await db.collection('roles').findOne({ _id: roleId });
    if (!existingRole) {
      return notFoundResponse('Role not found');
    }
    
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    
    await db.collection('roles').updateOne(
      { _id: roleId },
      { $set: updateData }
    );
    
    const updatedRole = await db.collection('roles').findOne({ _id: roleId });
    
    return successResponse(sanitizeObject(updatedRole!), 'Role updated successfully');
  } catch (error: any) {
    console.error('Error updating role:', error);
    return errorResponse('Failed to update role', 500);
  }
}
