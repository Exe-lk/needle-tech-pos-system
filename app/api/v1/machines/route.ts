import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/machines:
 *   get:
 *     summary: Get all machines
 *     description: Retrieve paginated list of machines with Supabase auth
 *     tags: [Machines]
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
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const brandIdFilter = searchParams.get('brandId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { boxNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (brandIdFilter) where.brandId = brandIdFilter;
    
    const totalItems = await prisma.machine.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const machines = await prisma.machine.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { brand: true, model: true, machineType: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      machines,
      pagination,
      'Machines retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(brandIdFilter && { brandId: brandIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    return errorResponse('Failed to retrieve machines', 500);
  }
});

/**
 * @swagger
 * /api/v1/machines:
 *   post:
 *     summary: Create a new machine
 *     description: Create a new machine with Supabase auth (Admin/Manager only)
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serialNumber
 *               - brandId
 *               - modelId
 *             properties:
 *               serialNumber:
 *                 type: string
 *               boxNumber:
 *                 type: string
 *               brandId:
 *                 type: string
 *                 format: uuid
 *               modelId:
 *                 type: string
 *                 format: uuid
 *               machineTypeId:
 *                 type: string
 *                 format: uuid
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { serialNumber, boxNumber, brandId, modelId, machineTypeId } = body;
    
    if (!serialNumber || !brandId || !modelId) {
      return validationErrorResponse('Missing required fields', {
        serialNumber: !serialNumber ? ['Serial number is required'] : [],
        brandId: !brandId ? ['Brand ID is required'] : [],
        modelId: !modelId ? ['Model ID is required'] : [],
      });
    }
    
    // Check if serial number already exists
    const existingMachine = await prisma.machine.findFirst({
      where: { serialNumber }
    });
    
    if (existingMachine) {
      return validationErrorResponse('Serial number already exists', {
        serialNumber: ['Serial number already exists'],
      });
    }
    
    const newMachine = await prisma.machine.create({
      data: {
        serialNumber,
        boxNumber: boxNumber || '',
        brandId,
        modelId,
        machineTypeId: machineTypeId || undefined,
        status: 'AVAILABLE',
      },
      include: { brand: true, model: true, machineType: true }
    });
    
    return successResponse(newMachine, 'Machine created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine:', error);
    return errorResponse('Failed to create machine', 500);
  }
});
