import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: Get list of roles
 *     description: Retrieve paginated list of roles (Admin/Manager only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const totalItems = await prisma.role.count({ where });
    const skip = (page - 1) * limit;
    
    const roles = await prisma.role.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limit
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      roles,
      pagination,
      'Roles retrieved successfully',
      { sortBy, sortOrder: sortOrder === 'asc' ? 'asc' : 'desc' },
      search || undefined
    );
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    return errorResponse('Failed to retrieve roles', 500);
  }
});

/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: Create new role
 *     description: Create a new role with permissions (Admin only)
 *     tags: [Roles]
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
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 */
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { name, description, permissions } = body;
    
    if (!name || !permissions || !Array.isArray(permissions)) {
      return validationErrorResponse('Missing required fields', {
        name: !name ? ['Name is required'] : [],
        permissions: !permissions || !Array.isArray(permissions) ? ['Permissions array is required'] : [],
      });
    }
    
    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });
    
    if (existingRole) {
      return validationErrorResponse('Role name already exists', {
        name: ['Role name already exists'],
      });
    }
    
    const newRole = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions
      }
    });
    
    return successResponse(newRole, 'Role created successfully', 201);
  } catch (error: any) {
    console.error('Error creating role:', error);
    return errorResponse('Failed to create role', 500);
  }
});
