import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/brands/active
 * Get all active brands (for dropdowns)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    
    const brands = await db
      .collection('brands')
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    
    const sanitizedBrands = brands.map(brand => sanitizeObject(brand));
    
    return successResponse(sanitizedBrands, 'Active brands retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching active brands:', error);
    return errorResponse('Failed to retrieve active brands', 500);
  }
});
