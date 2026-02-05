import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/models/active
 * Get all active models (for dropdowns)
 * Query params: brandId (optional) - filter by brand
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    
    const filter: any = { isActive: true };
    
    if (brandId && isValidObjectId(brandId)) {
      const brand = await db.collection('brands').findOne({ _id: toObjectId(brandId) });
      if (brand) {
        filter.brandName = brand.name;
      }
    }
    
    const models = await db
      .collection('models')
      .find(filter)
      .sort({ name: 1 })
      .toArray();
    
    // Populate brand information
    const populatedModels = await Promise.all(
      models.map(async (model) => {
        const brand = model.brandName
          ? await db.collection('brands').findOne({ name: model.brandName })
          : null;
        return {
          ...model,
          brand: sanitizeObject(brand),
        };
      })
    );
    
    const sanitizedModels = populatedModels.map(model => sanitizeObject(model));
    
    return successResponse(sanitizedModels, 'Active models retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching active models:', error);
    return errorResponse('Failed to retrieve active models', 500);
  }
});
