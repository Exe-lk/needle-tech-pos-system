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
      return validationErrorResponse('Invalid machine ID');
    }
    
    const db = await getDatabase();
    const machineId = toObjectId(params.id);
    
    const machine = await db.collection('machines').findOne({ _id: machineId });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    return successResponse(sanitizeObject(machine), 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine:', error);
    return errorResponse('Failed to retrieve machine', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid machine ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const machineId = toObjectId(params.id);
    
    const existingMachine = await db.collection('machines').findOne({ _id: machineId });
    if (!existingMachine) {
      return notFoundResponse('Machine not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.boxNumber !== undefined) updateData.boxNumber = body.boxNumber;
    if (body.photos !== undefined) updateData.photos = body.photos;
    if (body.specs !== undefined) updateData.specs = body.specs;
    if (body.currentLocation !== undefined) updateData.currentLocation = body.currentLocation;
    
    // Handle status change with history
    if (body.status !== undefined && body.status !== existingMachine.status) {
      updateData.status = body.status;
      updateData.statusHistory = [
        ...(existingMachine.statusHistory || []),
        {
          status: body.status,
          changedAt: new Date(),
          changedByUserId: null, // TODO: Get from auth context
          note: body.statusNote || 'Status updated',
        },
      ];
    }
    
    await db.collection('machines').updateOne(
      { _id: machineId },
      { $set: updateData }
    );
    
    const updatedMachine = await db.collection('machines').findOne({ _id: machineId });
    
    return successResponse(sanitizeObject(updatedMachine!), 'Machine updated successfully');
  } catch (error: any) {
    console.error('Error updating machine:', error);
    return errorResponse('Failed to update machine', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid machine ID');
    }
    
    const db = await getDatabase();
    const machineId = toObjectId(params.id);
    
    const machine = await db.collection('machines').findOne({ _id: machineId });
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    // Soft delete - set status to RETIRED
    await db.collection('machines').updateOne(
      { _id: machineId },
      { 
        $set: { 
          status: 'RETIRED',
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'Machine deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting machine:', error);
    return errorResponse('Failed to delete machine', 500);
  }
}
