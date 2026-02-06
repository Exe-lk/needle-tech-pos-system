import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/gate-passes:
 *   get:
 *     summary: Get all gate passes
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const rentalIdFilter = searchParams.get('rentalId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { gatePassNumber: { contains: search, mode: 'insensitive' } },
        { driverName: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (rentalIdFilter) where.rentalId = rentalIdFilter;
    
    const totalItems = await prisma.gatePass.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const gatePasses = await prisma.gatePass.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { rental: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      gatePasses,
      pagination,
      'Gate passes retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching gate passes:', error);
    return errorResponse('Failed to retrieve gate passes', 500);
  }
});

/**
 * @swagger
 * /api/v1/gate-passes:
 *   post:
 *     summary: Create a new gate pass
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rentalId, driverName, vehicleNumber, departureTime, returnTime, notes } = body;
    
    if (!rentalId || !driverName || !vehicleNumber) {
      return validationErrorResponse('Missing required fields', {
        rentalId: !rentalId ? ['Rental ID is required'] : [],
        driverName: !driverName ? ['Driver name is required'] : [],
        vehicleNumber: !vehicleNumber ? ['Vehicle number is required'] : [],
      });
    }
    
    const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
    
    if (!rental) {
      return validationErrorResponse('Rental not found', {
        rentalId: ['Rental does not exist'],
      });
    }
    
    const newGatePass = await prisma.gatePass.create({
      data: {
        rentalId,
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        departureTime: departureTime ? new Date(departureTime) : new Date(),
        returnTime: returnTime ? new Date(returnTime) : null,
        status: 'ACTIVE',
        notes: notes || '',
      },
      include: { rental: true }
    });
    
    return successResponse(newGatePass, 'Gate pass created successfully', 201);
  } catch (error: any) {
    console.error('Error creating gate pass:', error);
    return errorResponse('Failed to create gate pass', 500);
  }
});
