import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/brands
 * Get all brands with pagination
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    
    const totalItems = await db.collection('brands').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const brands = await db
      .collection('brands')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedBrands = brands.map(brand => sanitizeObject(brand));
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedBrands,
      pagination,
      'Brands retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    return errorResponse('Failed to retrieve brands', 500);
  }
});

/**
 * POST /api/v1/brands
 * Create a new brand
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, code, description } = body;
    
    if (!name) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Brand name is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Generate code from name if not provided
    const brandCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    // Check if brand with same name or code already exists
    const existingBrand = await db.collection('brands').findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: brandCode },
      ],
    });
    
    if (existingBrand) {
      return validationErrorResponse('Brand already exists', {
        name: ['Brand with this name or code already exists'],
      });
    }
    
    const now = new Date();
    const newBrand = {
      name: name.trim(),
      code: brandCode,
      description: description || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('brands').insertOne(newBrand);
    const createdBrand = await db.collection('brands').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdBrand), 'Brand created successfully', 201);
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return errorResponse('Failed to create brand', 500);
  }
});
