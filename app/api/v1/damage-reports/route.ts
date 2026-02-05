import { NextRequest } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/damage-reports:
 *   get:
 *     summary: Get all damage reports
 *     tags: [Damage Reports]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const machineIdFilter = searchParams.get('machineId');
    const rentalIdFilter = searchParams.get('rentalId');
    const resolvedFilter = searchParams.get('resolved');
    const severityFilter = searchParams.get('severity');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (machineIdFilter) where.machineId = machineIdFilter;
    if (rentalIdFilter) where.rentalId = rentalIdFilter;
    if (resolvedFilter !== null) where.resolved = resolvedFilter === 'true';
    if (severityFilter) where.severity = severityFilter;
    
    const totalItems = await prisma.damageReport.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const damageReports = await prisma.damageReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { machine: true, rental: true, inspector: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      damageReports,
      pagination,
      'Damage reports retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(machineIdFilter && { machineId: machineIdFilter }),
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(resolvedFilter && { resolved: resolvedFilter === 'true' }),
        ...(severityFilter && { severity: severityFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching damage reports:', error);
    return errorResponse('Failed to retrieve damage reports', 500);
  }
});

/**
 * @swagger
 * /api/v1/damage-reports:
 *   post:
 *     summary: Create a new damage report
 *     tags: [Damage Reports]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { machineId, rentalId, severity, category, description, estimatedRepairCost = 0 } = body;
    
    if (!machineId || !severity || !category || !description) {
      return validationErrorResponse('Missing required fields', {
        machineId: !machineId ? ['Machine ID is required'] : [],
        severity: !severity ? ['Severity is required'] : [],
        category: !category ? ['Category is required'] : [],
        description: !description ? ['Description is required'] : [],
      });
    }
    
    const machine = await prisma.machine.findUnique({ where: { id: machineId } });
    
    if (!machine) {
      return validationErrorResponse('Invalid machine', {
        machineId: ['Machine not found'],
      });
    }
    
    if (rentalId) {
      const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
      if (!rental) {
        return validationErrorResponse('Invalid rental', {
          rentalId: ['Rental not found'],
        });
      }
    }
    
    const newReport = await prisma.damageReport.create({
      data: {
        machineId,
        rentalId: rentalId || null,
        severity,
        category,
        description,
        estimatedRepairCost: new Decimal(estimatedRepairCost),
      },
      include: { machine: true, rental: true, inspector: true }
    });
    
    return successResponse(newReport, 'Damage report created successfully', 201);
  } catch (error: any) {
    console.error('Error creating damage report:', error);
    return errorResponse('Failed to create damage report', 500);
  }
});
