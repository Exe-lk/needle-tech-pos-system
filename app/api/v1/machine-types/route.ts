import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

/**
 * GET /api/v1/machine-types
 * Get all machine types (categories) with pagination
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
    
    const totalItems = await db.collection('machineTypes').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const types = await db
      .collection('machineTypes')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedTypes = types.map(type => sanitizeObject(type));
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedTypes,
      pagination,
      'Machine types retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching machine types:', error);
    return errorResponse('Failed to retrieve machine types', 500);
  }
});

/**
 * POST /api/v1/machine-types
 * Create a new machine type (category)
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, code, description } = body;
    
    if (!name) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Type name is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Generate code from name if not provided
    const typeCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    // Check if type with same name or code already exists
    const existingType = await db.collection('machineTypes').findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: typeCode },
      ],
    });
    
    if (existingType) {
      return validationErrorResponse('Machine type already exists', {
        name: ['Type with this name or code already exists'],
      });
    }
    
    const now = new Date();
    const newType = {
      name: name.trim(),
      code: typeCode,
      description: description || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('machineTypes').insertOne(newType);
    const createdType = await db.collection('machineTypes').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdType), 'Machine type created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine type:', error);
    return errorResponse('Failed to create machine type', 500);
  }
});
