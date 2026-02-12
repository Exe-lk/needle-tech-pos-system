import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import type { AuthUser } from '@/lib/auth-supabase';

/**
 * @swagger
 * /api/v1/gate-passes:
 *   get:
 *     summary: Get all gate passes
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest, auth: AuthUser) => {
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
    
    const gatePasses = await prisma.gatePass.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: { 
        rental: {
          include: {
            customer: true,
          }
        },
        customer: true,
        issuedBy: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              }
            }
          }
        }
      }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      gatePasses,
      pagination,
      'Gate passes retrieved successfully',
      { sortBy, sortOrder },
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
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest, auth: AuthUser) => {
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
    
    const rental = await prisma.rental.findUnique({ 
      where: { id: rentalId },
      include: { 
        customer: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              }
            }
          }
        }
      }
    });
    
    if (!rental) {
      return validationErrorResponse('Rental not found', {
        rentalId: ['Rental does not exist'],
      });
    }
    
    // Get settings for gate pass number generation
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const prefix = settings?.gatePassPrefix || 'GP';
    const startNumber = settings?.gatePassStartNumber || 1000;
    
    // Get the last gate pass number
    const lastGatePass = await prisma.gatePass.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { gatePassNumber: true }
    });
    
    let nextNumber = startNumber;
    if (lastGatePass?.gatePassNumber) {
      const lastNumberMatch = lastGatePass.gatePassNumber.match(/\d+$/);
      if (lastNumberMatch) {
        nextNumber = parseInt(lastNumberMatch[0]) + 1;
      }
    }
    
    const gatePassNumber = `${prefix}${String(nextNumber).padStart(6, '0')}`;
    
    // Create gate pass with machines
    const newGatePass = await prisma.gatePass.create({
      data: {
        gatePassNumber,
        rentalId,
        customerId: rental.customerId,
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        departureTime: departureTime ? new Date(departureTime) : new Date(),
        arrivalTime: returnTime ? new Date(returnTime) : null,
        status: 'PENDING',
        issuedByUserId: auth.id,
        machines: {
          create: rental.machines.map(m => ({
            machineId: m.machineId,
            quantity: 1,
          }))
        }
      },
      include: { 
        rental: {
          include: {
            customer: true,
          }
        },
        customer: true,
        issuedBy: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              }
            }
          }
        }
      }
    });
    
    return successResponse(newGatePass, 'Gate pass created successfully', 201);
  } catch (error: any) {
    console.error('Error creating gate pass:', error);
    return errorResponse('Failed to create gate pass', 500);
  }
});
