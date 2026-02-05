import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/v1/models/:id
 * Get a single model by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid model ID');
    }
    
    const db = await getDatabase();
    const modelId = toObjectId(id);
    
    const model = await db.collection('models').findOne({ _id: modelId });
    
    if (!model) {
      return notFoundResponse('Model not found');
    }
    
    // Populate brand
    const brand = model.brandName
      ? await db.collection('brands').findOne({ name: model.brandName })
      : null;
    
    const populatedModel = {
      ...model,
      brand: sanitizeObject(brand),
    };
    
    return successResponse(sanitizeObject(populatedModel), 'Model retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching model:', error);
    return errorResponse('Failed to retrieve model', 500);
  }
});

/**
 * PUT /api/v1/models/:id
 * Update a model
 */
export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid model ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const modelId = toObjectId(id);
    
    const existingModel = await db.collection('models').findOne({ _id: modelId });
    if (!existingModel) {
      return notFoundResponse('Model not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.code !== undefined) updateData.code = body.code;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    // Handle brand change
    if (body.brandId !== undefined || body.brandName !== undefined) {
      let finalBrandName = body.brandName;
      if (body.brandId) {
        const brand = await db.collection('brands').findOne({ _id: new ObjectId(body.brandId) });
        if (!brand) {
          return validationErrorResponse('Brand not found', {
            brandId: ['Invalid brand ID'],
          });
        }
        finalBrandName = brand.name;
      }
      if (finalBrandName) {
        updateData.brandName = finalBrandName;
      }
    }
    
    await db.collection('models').updateOne(
      { _id: modelId },
      { $set: updateData }
    );
    
    const updatedModel = await db.collection('models').findOne({ _id: modelId });
    
    // Populate brand
    const brand = updatedModel?.brandName
      ? await db.collection('brands').findOne({ name: updatedModel.brandName })
      : null;
    
    const populatedModel = {
      ...updatedModel,
      brand: sanitizeObject(brand),
    };
    
    return successResponse(sanitizeObject(populatedModel!), 'Model updated successfully');
  } catch (error: any) {
    console.error('Error updating model:', error);
    return errorResponse('Failed to update model', 500);
  }
});

/**
 * DELETE /api/v1/models/:id
 * Delete a model (soft delete - sets isActive to false)
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid model ID');
    }
    
    const db = await getDatabase();
    const modelId = toObjectId(id);
    
    const model = await db.collection('models').findOne({ _id: modelId });
    if (!model) {
      return notFoundResponse('Model not found');
    }
    
    // Check if model is used in any machines
    const machinesCount = await db.collection('machines').countDocuments({ 
      brand: model.brandName,
      model: model.name,
    });
    if (machinesCount > 0) {
      return errorResponse(`Cannot delete model. It is used by ${machinesCount} machine(s).`, 400);
    }
    
    // Soft delete
    await db.collection('models').updateOne(
      { _id: modelId },
      { 
        $set: { 
          isActive: false,
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'Model deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting model:', error);
    return errorResponse('Failed to delete model', 500);
  }
});
