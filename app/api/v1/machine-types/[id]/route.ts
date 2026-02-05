import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/machine-types/:id
 * Get a single machine type by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid machine type ID');
    }
    
    const db = await getDatabase();
    const typeId = toObjectId(id);
    
    const type = await db.collection('machineTypes').findOne({ _id: typeId });
    
    if (!type) {
      return notFoundResponse('Machine type not found');
    }
    
    return successResponse(sanitizeObject(type), 'Machine type retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine type:', error);
    return errorResponse('Failed to retrieve machine type', 500);
  }
});

/**
 * PUT /api/v1/machine-types/:id
 * Update a machine type
 */
export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid machine type ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const typeId = toObjectId(id);
    
    const existingType = await db.collection('machineTypes').findOne({ _id: typeId });
    if (!existingType) {
      return notFoundResponse('Machine type not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    await db.collection('machineTypes').updateOne(
      { _id: typeId },
      { $set: updateData }
    );
    
    const updatedType = await db.collection('machineTypes').findOne({ _id: typeId });
    
    return successResponse(sanitizeObject(updatedType!), 'Machine type updated successfully');
  } catch (error: any) {
    console.error('Error updating machine type:', error);
    return errorResponse('Failed to update machine type', 500);
  }
});

/**
 * DELETE /api/v1/machine-types/:id
 * Delete a machine type (soft delete - sets isActive to false)
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid machine type ID');
    }
    
    const db = await getDatabase();
    const typeId = toObjectId(id);
    
    const type = await db.collection('machineTypes').findOne({ _id: typeId });
    if (!type) {
      return notFoundResponse('Machine type not found');
    }
    
    // Check if type is used in any machines
    const machinesCount = await db.collection('machines').countDocuments({ category: type.name });
    if (machinesCount > 0) {
      return errorResponse(`Cannot delete type. It is used by ${machinesCount} machine(s).`, 400);
    }
    
    // Soft delete
    await db.collection('machineTypes').updateOne(
      { _id: typeId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'Machine type deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting machine type:', error);
    return errorResponse('Failed to delete machine type', 500);
  }
});
