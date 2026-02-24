import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     summary: Get all machine models
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const brandIdFilter = searchParams.get('brandId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (brandIdFilter) where.brandId = brandIdFilter;
    
    const totalItems = await prisma.model.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const models = await prisma.model.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { brand: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      models,
      pagination,
      'Models retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      { ...(brandIdFilter && { brandId: brandIdFilter }) }
    );
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return errorResponse('Failed to retrieve models', 500);
  }
});

/**
 * @swagger
 * /api/v1/models:
 *   post:
 *     summary: Create a new model
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, brandId, code, description } = body;
    
    if (!name || !brandId) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Model name is required'] : [],
        brandId: !brandId ? ['Brand ID is required'] : [],
      });
    }
    
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    
    if (!brand) {
      return validationErrorResponse('Invalid brand', {
        brandId: ['Brand not found'],
      });
    }
    
    const existingModel = await prisma.model.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: code, mode: 'insensitive' } },
        ],
      },
    });
    
    if (existingModel) {
      return validationErrorResponse('Model already exists', {
        name: ['Model with this name or code already exists'],
      });
    }
    
    const newModel = await prisma.model.create({
      data: {
        name: name.trim(),
        code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        description: description || '',
        brandId,
        isActive: true,
      },
      include: { brand: true }
    });
    
    return successResponse(newModel, 'Model created successfully', 201);
  } catch (error: any) {
    console.error('Error creating model:', error);
    return errorResponse('Failed to create model', 500);
  }
});
