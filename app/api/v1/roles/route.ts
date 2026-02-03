import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject } from '@/lib/utils';
import { withAuth, withAuthAndRole } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Only ADMIN and MANAGER can view roles
export const GET = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    const totalItems = await db.collection('roles').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const roles = await db
      .collection('roles')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedRoles = roles.map(role => sanitizeObject(role));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedRoles,
      pagination,
      'Roles retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return errorResponse('Failed to retrieve roles', 500);
  }
});

// Only ADMIN can create roles
export const POST = withAuthAndRole(['ADMIN'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;
    
    if (!name || !permissions || !Array.isArray(permissions)) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Name is required'] : [],
        permissions: !permissions || !Array.isArray(permissions) ? ['Permissions array is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Check if role name already exists
    const existingRole = await db.collection('roles').findOne({ name });
    if (existingRole) {
      return validationErrorResponse('Role name already exists', {
        name: ['Role name already exists'],
      });
    }
    
    const now = new Date();
    const newRole = {
      name,
      description: description || '',
      permissions,
      createdAt: now,
    };
    
    const result = await db.collection('roles').insertOne(newRole);
    const createdRole = await db.collection('roles').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdRole), 'Role created successfully', 201);
  } catch (error: any) {
    console.error('Error creating role:', error);
    return errorResponse('Failed to create role', 500);
  }
});
