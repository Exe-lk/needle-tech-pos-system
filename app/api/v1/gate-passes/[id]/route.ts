import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid gate pass ID');
    }
    
    const db = await getDatabase();
    const gatePassId = toObjectId(id);
    
    const gatePass = await db.collection('gatePasses').findOne({ _id: gatePassId });
    
    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    return successResponse(sanitizeObject(gatePass), 'Gate pass retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching gate pass:', error);
    return errorResponse('Failed to retrieve gate pass', 500);
  }
});

export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid gate pass ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const gatePassId = toObjectId(id);
    
    const existingGatePass = await db.collection('gatePasses').findOne({ _id: gatePassId });
    if (!existingGatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.arrivalTime !== undefined) updateData.arrivalTime = new Date(body.arrivalTime);
    if (body.printedAt !== undefined) updateData.printedAt = new Date(body.printedAt);
    
    await db.collection('gatePasses').updateOne(
      { _id: gatePassId },
      { $set: updateData }
    );
    
    const updatedGatePass = await db.collection('gatePasses').findOne({ _id: gatePassId });
    
    return successResponse(sanitizeObject(updatedGatePass!), 'Gate pass updated successfully');
  } catch (error: any) {
    console.error('Error updating gate pass:', error);
    return errorResponse('Failed to update gate pass', 500);
  }
});
