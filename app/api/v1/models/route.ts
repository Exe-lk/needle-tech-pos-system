import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * GET /api/v1/models
 * Get all models with pagination
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const brandFilter = searchParams.get('brandId');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (brandFilter && isValidObjectId(brandFilter)) {
      const brand = await db.collection('brands').findOne({ _id: toObjectId(brandFilter) });
      if (brand) {
        filter.brandName = brand.name;
      }
    }
    
    const totalItems = await db.collection('models').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const models = await db
      .collection('models')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
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
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedModels,
      pagination,
      'Models retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(brandFilter && { brandId: brandFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return errorResponse('Failed to retrieve models', 500);
  }
});

/**
 * POST /api/v1/models
 * Create a new model
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, brandId, brandName, code, description } = body;
    
    if (!name) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Model name is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Get brand name from brandId or use provided brandName
    let finalBrandName = brandName;
    if (brandId) {
      if (!isValidObjectId(brandId)) {
        return validationErrorResponse('Invalid brand ID format');
      }
      const brand = await db.collection('brands').findOne({ _id: toObjectId(brandId) });
      if (!brand) {
        return validationErrorResponse('Brand not found', {
          brandId: ['Invalid brand ID'],
        });
      }
      finalBrandName = brand.name;
    }
    
    if (!finalBrandName) {
      return validationErrorResponse('Missing required fields', {
        brandId: !brandId && !brandName ? ['Either brandId or brandName is required'] : [],
      });
    }
    
    // Generate code from name if not provided
    const modelCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    // Check if model with same name for this brand already exists
    const existingModel = await db.collection('models').findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      brandName: finalBrandName,
    });
    
    if (existingModel) {
      return validationErrorResponse('Model already exists', {
        name: ['Model with this name already exists for this brand'],
      });
    }
    
    const now = new Date();
    const newModel = {
      name: name.trim(),
      brandName: finalBrandName,
      code: modelCode,
      description: description || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('models').insertOne(newModel);
    const createdModel = await db.collection('models').findOne({ _id: result.insertedId });
    
    // Populate brand
    const brand = await db.collection('brands').findOne({ name: finalBrandName });
    const populatedModel = {
      ...createdModel,
      brand: sanitizeObject(brand),
    };
    
    return successResponse(sanitizeObject(populatedModel), 'Model created successfully', 201);
  } catch (error: any) {
    console.error('Error creating model:', error);
    return errorResponse('Failed to create model', 500);
  }
});
