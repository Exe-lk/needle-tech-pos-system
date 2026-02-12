import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/returns:
 *   get:
 *     summary: Get all returns
 *     description: Retrieve paginated list of returns with Supabase auth
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const rentalIdFilter = searchParams.get('rentalId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (rentalIdFilter) where.rentalId = rentalIdFilter;
    
    const totalItems = await prisma.return.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const returns = await prisma.return.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: {
        rental: { include: { customer: true } },
        inspectedBy: true,
        machine: { include: { brand: true, model: true, type: true } },
        damageReport: true,
      },
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      returns,
      pagination,
      'Returns retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching returns:', error);
    return errorResponse('Failed to retrieve returns', 500);
  }
});

/**
 * @swagger
 * /api/v1/returns:
 *   post:
 *     summary: Create a new return
 *     description: Create a new return record with Supabase auth
 *     tags: [Returns]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rentalId, notes = '' } = body;
    
    if (!rentalId) {
      return validationErrorResponse('Missing required fields', {
        rentalId: ['Rental ID is required'],
      });
    }
    
    const rental = await prisma.rental.findUnique({
      where: { id: rentalId },
      include: { machines: true },
    });
    
    if (!rental) {
      return validationErrorResponse('Invalid rental', {
        rentalId: ['Rental not found'],
      });
    }
    
    const firstMachineId = rental.machines?.[0]?.machineId;
    if (!body.machineId && !firstMachineId) {
      return validationErrorResponse('Invalid rental', {
        machineId: ['Rental has no machines; provide machineId'],
      });
    }
    
    const newReturn = await prisma.return.create({
      data: {
        rentalId,
        customerId: rental.customerId,
        machineId: body.machineId ?? firstMachineId,
        returnDate: body.returnDate ? new Date(body.returnDate) : new Date(),
        inspectedByUserId: body.inspectedByUserId ?? rental.createdByUserId,
        returnNumber: body.returnNumber ?? `RET-${Date.now()}`,
        notes: notes || undefined,
      },
      include: {
        rental: { include: { customer: true } },
        inspectedBy: true,
        machine: { include: { brand: true, model: true, type: true } },
        damageReport: true,
      },
    });
    
    return successResponse(newReturn, 'Return created successfully', 201);
  } catch (error: any) {
    console.error('Error creating return:', error);
    return errorResponse('Failed to create return', 500);
  }
});
