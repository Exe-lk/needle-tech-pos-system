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
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const rentalIdFilter = searchParams.get('rentalId');
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (rentalIdFilter) where.rentalId = rentalIdFilter;
    if (statusFilter) where.status = statusFilter;
    
    const totalItems = await prisma.return.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const returns = await prisma.return.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { rental: true, inspector: true }
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
        ...(statusFilter && { status: statusFilter }),
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
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rentalId, status = 'PENDING', notes = '' } = body;
    
    if (!rentalId) {
      return validationErrorResponse('Missing required fields', {
        rentalId: ['Rental ID is required'],
      });
    }
    
    const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
    
    if (!rental) {
      return validationErrorResponse('Invalid rental', {
        rentalId: ['Rental not found'],
      });
    }
    
    const newReturn = await prisma.return.create({
      data: {
        rentalId,
        status,
        notes,
      },
      include: { rental: true, inspector: true }
    });
    
    return successResponse(newReturn, 'Return created successfully', 201);
  } catch (error: any) {
    console.error('Error creating return:', error);
    return errorResponse('Failed to create return', 500);
  }
});
