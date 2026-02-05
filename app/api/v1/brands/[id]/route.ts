import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/brands/:id
 * Get a single brand by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid brand ID');
    }
    
    const db = await getDatabase();
    const brandId = toObjectId(id);
    
    const brand = await db.collection('brands').findOne({ _id: brandId });
    
    if (!brand) {
      return notFoundResponse('Brand not found');
    }
    
    return successResponse(sanitizeObject(brand), 'Brand retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching brand:', error);
    return errorResponse('Failed to retrieve brand', 500);
  }
});

/**
 * PUT /api/v1/brands/:id
 * Update a brand
 */
export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid brand ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const brandId = toObjectId(id);
    
    const existingBrand = await db.collection('brands').findOne({ _id: brandId });
    if (!existingBrand) {
      return notFoundResponse('Brand not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    await db.collection('brands').updateOne(
      { _id: brandId },
      { $set: updateData }
    );
    
    const updatedBrand = await db.collection('brands').findOne({ _id: brandId });
    
    return successResponse(sanitizeObject(updatedBrand!), 'Brand updated successfully');
  } catch (error: any) {
    console.error('Error updating brand:', error);
    return errorResponse('Failed to update brand', 500);
  }
});

/**
 * DELETE /api/v1/brands/:id
 * Delete a brand (soft delete - sets isActive to false)
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid brand ID');
    }
    
    const db = await getDatabase();
    const brandId = toObjectId(id);
    
    const brand = await db.collection('brands').findOne({ _id: brandId });
    if (!brand) {
      return notFoundResponse('Brand not found');
    }
    
    // Check if brand is used in any machines
    const machinesCount = await db.collection('machines').countDocuments({ brand: brand.name });
    if (machinesCount > 0) {
      return errorResponse(`Cannot delete brand. It is used by ${machinesCount} machine(s).`, 400);
    }
    
    // Soft delete
    await db.collection('brands').updateOne(
      { _id: brandId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'Brand deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    return errorResponse('Failed to delete brand', 500);
  }
});
