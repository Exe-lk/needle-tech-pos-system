import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

/**
 * @swagger
 * /api/v1/tools:
 *   get:
 *     summary: Get all tools
 *     description: Retrieve paginated list of tools with filtering and search
 *     tags: [Tools]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, IN_USE, MAINTENANCE, RETIRED]
 *       - in: query
 *         name: toolType
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const toolTypeFilter = searchParams.get('toolType');
    const locationFilter = searchParams.get('location');
    
    const where: any = {
      isDeleted: false, // Only show non-deleted tools
    };
    
    if (search) {
      where.OR = [
        { toolName: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (toolTypeFilter) where.toolType = toolTypeFilter;
    if (locationFilter) where.location = locationFilter;
    
    const totalItems = await prisma.tool.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const tools = await prisma.tool.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      tools,
      pagination,
      'Tools retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(toolTypeFilter && { toolType: toolTypeFilter }),
        ...(locationFilter && { location: locationFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching tools:', error);
    return errorResponse('Failed to retrieve tools', 500);
  }
});

/**
 * @swagger
 * /api/v1/tools:
 *   post:
 *     summary: Create a new tool
 *     description: Create a new tool (Admin/Manager only)
 *     tags: [Tools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolName
 *               - toolType
 *               - quantity
 *               - status
 *               - location
 *               - condition
 *             properties:
 *               toolName:
 *                 type: string
 *               toolType:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, IN_USE, MAINTENANCE, RETIRED]
 *               location:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *               condition:
 *                 type: string
 *                 enum: [NEW, GOOD, FAIR, POOR]
 *               notes:
 *                 type: string
 *               toolPhotoUrls:
 *                 type: array
 *                 items:
 *                   type: string
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      toolName,
      toolType,
      brand,
      model,
      serialNumber,
      quantity,
      unitPrice,
      status,
      location,
      purchaseDate,
      condition,
      notes,
      toolPhotoUrls = [],
    } = body;
    
    // Validation
    if (!toolName || !toolType || !quantity || !status || !location || !condition) {
      return validationErrorResponse('Missing required fields', {
        toolName: !toolName ? ['Tool name is required'] : [],
        toolType: !toolType ? ['Tool type is required'] : [],
        quantity: !quantity ? ['Quantity is required'] : [],
        status: !status ? ['Status is required'] : [],
        location: !location ? ['Location is required'] : [],
        condition: !condition ? ['Condition is required'] : [],
      });
    }
    
    // Validate status enum
    const validStatuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];
    if (!validStatuses.includes(status)) {
      return validationErrorResponse('Invalid status', {
        status: [`Status must be one of: ${validStatuses.join(', ')}`],
      });
    }
    
    // Validate condition enum
    const validConditions = ['NEW', 'GOOD', 'FAIR', 'POOR'];
    if (!validConditions.includes(condition)) {
      return validationErrorResponse('Invalid condition', {
        condition: [`Condition must be one of: ${validConditions.join(', ')}`],
      });
    }
    
    // Validate quantity
    if (quantity < 1) {
      return validationErrorResponse('Invalid quantity', {
        quantity: ['Quantity must be at least 1'],
      });
    }
    
    const newTool = await prisma.tool.create({
      data: {
        toolName: toolName.trim(),
        toolType: toolType.trim(),
        brand: brand?.trim() || null,
        model: model?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        quantity: parseInt(quantity),
        unitPrice: unitPrice ? new Decimal(unitPrice) : null,
        status,
        location: location.trim(),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        condition,
        notes: notes?.trim() || null,
        toolPhotoUrls: Array.isArray(toolPhotoUrls) ? toolPhotoUrls.filter((url: any) => typeof url === 'string') : [],
      },
    });
    
    return successResponse(newTool, 'Tool created successfully', 201);
  } catch (error: any) {
    console.error('Error creating tool:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return validationErrorResponse('Duplicate entry', {
        [error.meta?.target?.[0] || 'field']: ['This value already exists'],
      });
    }
    
    return errorResponse('Failed to create tool', 500);
  }
});
