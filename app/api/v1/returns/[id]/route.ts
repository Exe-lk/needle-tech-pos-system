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
      return validationErrorResponse('Invalid return ID');
    }
    
    const db = await getDatabase();
    const returnId = toObjectId(params.id);
    
    const returnItem = await db.collection('returns').findOne({ _id: returnId });
    
    if (!returnItem) {
      return notFoundResponse('Return not found');
    }
    
    return successResponse(sanitizeObject(returnItem), 'Return retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching return:', error);
    return errorResponse('Failed to retrieve return', 500);
  }
}
