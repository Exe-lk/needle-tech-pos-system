import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/outstanding-alerts:
 *   get:
 *     summary: Get all outstanding alerts
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerIdFilter = searchParams.get('customerId');
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (customerIdFilter) where.customerId = customerIdFilter;
    if (statusFilter) where.status = statusFilter;
    
    const totalItems = await prisma.outstandingAlert.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const alerts = await prisma.outstandingAlert.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      alerts,
      pagination,
      'Outstanding alerts retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      undefined,
      {
        ...(customerIdFilter && { customerId: customerIdFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching outstanding alerts:', error);
    return errorResponse('Failed to retrieve outstanding alerts', 500);
  }
});
