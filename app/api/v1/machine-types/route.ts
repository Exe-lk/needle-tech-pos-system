import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/machine-types:
 *   get:
 *     summary: Get all machine types
 *     tags: [Machine Types]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const totalItems = await prisma.machineType.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const types = await prisma.machineType.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      types,
      pagination,
      'Machine types retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching machine types:', error);
    return errorResponse('Failed to retrieve machine types', 500);
  }
});

/**
 * @swagger
 * /api/v1/machine-types:
 *   post:
 *     summary: Create a new machine type
 *     tags: [Machine Types]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, code, description } = body;
    
    if (!name) {
      return validationErrorResponse('Missing required fields', {
        name: ['Type name is required'],
      });
    }
    
    const typeCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    const existingType = await prisma.machineType.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: typeCode },
        ],
      },
    });
    
    if (existingType) {
      return validationErrorResponse('Machine type already exists', {
        name: ['Type with this name or code already exists'],
      });
    }
    
    const newType = await prisma.machineType.create({
      data: {
        name: name.trim(),
        code: typeCode,
        description: description || '',
        isActive: true,
      },
    });
    
    return successResponse(newType, 'Machine type created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine type:', error);
    return errorResponse('Failed to create machine type', 500);
  }
});
    
    return successResponse(sanitizeObject(createdType), 'Machine type created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine type:', error);
    return errorResponse('Failed to create machine type', 500);
  }
});
