import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/machine-types/active
 * Get all active machine types (for dropdowns)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    
    const types = await db
      .collection('machineTypes')
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    
    const sanitizedTypes = types.map(type => sanitizeObject(type));
    
    return successResponse(sanitizedTypes, 'Active machine types retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching active machine types:', error);
    return errorResponse('Failed to retrieve active machine types', 500);
  }
});
