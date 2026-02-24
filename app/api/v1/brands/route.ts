import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/brands:
 *   get:
 *     summary: Get all brands
 *     description: Retrieve brands with Supabase auth
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
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
    
    const totalItems = await prisma.brand.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const brands = await prisma.brand.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      brands,
      pagination,
      'Brands retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching brands:', error);
    return errorResponse('Failed to retrieve brands', 500);
  }
});

/**
 * @swagger
 * /api/v1/brands:
 *   post:
 *     summary: Create a new brand
 *     description: Create brand with Supabase auth (Admin/Manager only)
 *     tags: [Brands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 */
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, code, description } = body;
    
    if (!name) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Brand name is required'] : [],
      });
    }
    
    const brandCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    // Check if brand with same name or code already exists
    const existingBrand = await prisma.brand.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: brandCode },
        ],
      },
    });
    
    if (existingBrand) {
      return validationErrorResponse('Brand already exists', {
        name: ['Brand with this name or code already exists'],
      });
    }
    
    const newBrand = await prisma.brand.create({
      data: {
        name: name.trim(),
        code: brandCode,
        description: description || '',
        isActive: true,
      },
    });
    
    return successResponse(newBrand, 'Brand created successfully', 201);
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return errorResponse('Failed to create brand', 500);
  }
});
