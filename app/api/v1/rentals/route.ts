import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/rentals:
 *   get:
 *     summary: Get all rentals
 *     description: Retrieve paginated list of rentals with Supabase auth
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { agreementNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (customerIdFilter) where.customerId = customerIdFilter;
    
    const totalItems = await prisma.rental.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const rentals = await prisma.rental.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: {
        customer: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              },
            },
          },
        },
      },
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      rentals,
      pagination,
      'Rentals retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching rentals:', error);
    return errorResponse('Failed to retrieve rentals', 500);
  }
});

/**
 * @swagger
 * /api/v1/rentals:
 *   post:
 *     summary: Create a new rental
 *     description: Create a new rental agreement with Supabase auth
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customerId, startDate, endDate, machineIds = [] } = body;
    
    if (!customerId || !startDate || !endDate) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        startDate: !startDate ? ['Start date is required'] : [],
        endDate: !endDate ? ['End date is required'] : [],
      });
    }
    
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    
    if (!customer) {
      return validationErrorResponse('Invalid customer', {
        customerId: ['Customer not found'],
      });
    }
    
    const newRental = await prisma.rental.create({
      data: {
        customerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'ACTIVE',
      },
      include: { customer: true, machines: true }
    });
    
    return successResponse(newRental, 'Rental created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental:', error);
    return errorResponse('Failed to create rental', 500);
  }
});
