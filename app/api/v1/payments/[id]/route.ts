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
      return validationErrorResponse('Invalid payment ID');
    }
    
    const db = await getDatabase();
    const paymentId = toObjectId(params.id);
    
    const payment = await db.collection('payments').findOne({ _id: paymentId });
    
    if (!payment) {
      return notFoundResponse('Payment not found');
    }
    
    return successResponse(sanitizeObject(payment), 'Payment retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return errorResponse('Failed to retrieve payment', 500);
  }
}
