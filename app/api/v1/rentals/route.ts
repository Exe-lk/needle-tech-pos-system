import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

function parseExpectedFromLockedReason(lockedReason: string | null): { expectedMachineCount?: number; expectedMachineCategories?: { id: string; brand: string; model: string; type: string; quantity: number }[] } {
  if (!lockedReason) return {};
  try {
    const p = JSON.parse(lockedReason);
    if (p && typeof p.expectedMachineCount === 'number') {
      return {
        expectedMachineCount: p.expectedMachineCount,
        expectedMachineCategories: Array.isArray(p.expectedMachineCategories) ? p.expectedMachineCategories : undefined,
      };
    }
  } catch {
    // ignore
  }
  return {};
}

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

    const withExpected = rentals.map((r: any) => ({ ...r, ...parseExpectedFromLockedReason(r.lockedReason) }));
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      withExpected,
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
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest, auth: { id: string }) => {
  try {
    const body = await request.json();
    const { 
      customerId, 
      startDate, 
      endDate, 
      machines: machinesInput = [],
      paymentBasis = 'MONTHLY',
      firstMonthProrated = false,
    } = body;
    
    if (!customerId || !startDate) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        startDate: !startDate ? ['Start date is required'] : [],
      });
    }
    
    // Validate endDate if provided
    if (endDate && new Date(endDate) < new Date(startDate)) {
      return validationErrorResponse('End date must be after start date', {
        endDate: ['End date must be after start date'],
      });
    }
    
    // Validate paymentBasis
    if (paymentBasis && !['MONTHLY', 'DAILY'].includes(paymentBasis)) {
      return validationErrorResponse('Invalid payment basis', {
        paymentBasis: ['Payment basis must be MONTHLY or DAILY'],
      });
    }
    
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    
    if (!customer) {
      return validationErrorResponse('Invalid customer', {
        customerId: ['Customer not found'],
      });
    }
    
    const count = await prisma.rental.count();
    const agreementNumber = `RA${new Date().getFullYear().toString().slice(-2)}${String(count + 1).padStart(6, '0')}`;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    // Compute totals from machines (daily rates); if no machines, use zero
    let subtotalNum = 0;
    const resolvedMachines: { machineId: string; quantity: number; dailyRate: number }[] = [];

    if (Array.isArray(machinesInput) && machinesInput.length > 0) {
      for (const row of machinesInput) {
        const brandName = String(row.brand || '').trim();
        const modelName = String(row.model || '').trim();
        const typeName = row.type != null && row.type !== '' ? String(row.type).trim() : null;
        const quantity = Math.max(1, parseInt(String(row.quantity), 10) || 1);
        const dailyRate = parseFloat(String(row.dailyRate ?? 0)) || 0;

        if (!brandName || !modelName) {
          return validationErrorResponse('Invalid machine line', {
            machines: ['Each machine must have brand and model'],
          });
        }

        const brand = await prisma.brand.findFirst({
          where: { name: { equals: brandName, mode: 'insensitive' }, isActive: true },
        });
        if (!brand) {
          return validationErrorResponse('Brand not found', {
            machines: [`No brand "${brandName}" found in database`],
          });
        }
        const model = await prisma.model.findFirst({
          where: { name: { equals: modelName, mode: 'insensitive' }, brandId: brand.id, isActive: true },
        });
        if (!model) {
          return validationErrorResponse('Model not found', {
            machines: [`No model "${modelName}" for brand "${brandName}" found in database`],
          });
        }
        let typeId: string | null = null;
        if (typeName) {
          const machineType = await prisma.machineType.findFirst({
            where: { name: { equals: typeName, mode: 'insensitive' }, isActive: true },
          });
          if (machineType) typeId = machineType.id;
        }
        const machineWhere: { brandId: string; modelId: string; typeId?: string | null } = {
          brandId: brand.id,
          modelId: model.id,
        };
        if (typeId != null) machineWhere.typeId = typeId;
        const machine = await prisma.machine.findFirst({
          where: machineWhere,
        });
        if (!machine) {
          return validationErrorResponse('No machine found for this line', {
            machines: [`No machine in inventory for ${brandName} / ${modelName}${typeName ? ` / ${typeName}` : ''}. Ensure at least one machine exists with this brand and model.`],
          });
        }

        resolvedMachines.push({ machineId: machine.id, quantity, dailyRate });
        subtotalNum += quantity * dailyRate;
      }
    }

    const vatNum = subtotalNum * 0.15;
    const totalNum = subtotalNum + vatNum;
    const subtotal = new Decimal(subtotalNum);
    const vatAmount = new Decimal(vatNum);
    const total = new Decimal(totalNum);
    const balance = new Decimal(totalNum);
    
    const newRental = await prisma.rental.create({
      data: {
        agreementNumber,
        customerId,
        startDate: start,
        expectedEndDate: end,
        paymentBasis: paymentBasis === 'DAILY' ? 'DAILY' : 'MONTHLY',
        firstMonthProrated: firstMonthProrated === true,
        status: 'ACTIVE',
        subtotal,
        vatAmount,
        total,
        balance,
        paidAmount: new Decimal(0),
        depositTotal: new Decimal(0),
        createdByUserId: auth.id,
      },
      include: { customer: true, machines: true }
    });

    // Create RentalMachine records for each resolved machine
    for (const { machineId, quantity, dailyRate } of resolvedMachines) {
      await prisma.rentalMachine.create({
        data: {
          rentalId: newRental.id,
          machineId,
          dailyRate: new Decimal(dailyRate),
          securityDeposit: new Decimal(0),
          quantity,
        },
      });
    }

    // Re-fetch rental with machines included for response
    const rentalWithMachines = await prisma.rental.findUnique({
      where: { id: newRental.id },
      include: { customer: true, machines: { include: { machine: { include: { brand: true, model: true, type: true } } } } },
    });
    
    return successResponse(rentalWithMachines ?? newRental, 'Rental created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental:', error);
    return errorResponse('Failed to create rental', 500);
  }
});
