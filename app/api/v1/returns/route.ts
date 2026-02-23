import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import type { AuthUser } from '@/lib/auth-supabase';

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
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest, auth: AuthUser) => {
  try {
    const body = await request.json();
    const { 
      agreementId, 
      rentalId, 
      customerName, 
      totalMachines, 
      createdBy, 
      machines = [],
      notes = '',
    } = body;
    
    // Support both agreementId (agreement number) and rentalId (UUID)
    let rental;
    if (agreementId) {
      rental = await prisma.rental.findFirst({
        where: {
          agreementNumber: {
            contains: agreementId,
            mode: 'insensitive',
          },
        },
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
    } else if (rentalId) {
      rental = await prisma.rental.findUnique({
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
                },
              },
            },
          },
        },
      });
    }
    
    if (!rental) {
      return validationErrorResponse('Invalid rental', {
        agreementId: agreementId ? ['Rental agreement not found'] : [],
        rentalId: rentalId ? ['Rental not found'] : [],
      });
    }

    // Set of machine IDs that belong to this rental (must be returning only these)
    const rentalMachineIds = new Set((rental.machines as { machineId: string }[]).map((m) => m.machineId));
    
    if (!machines || !Array.isArray(machines) || machines.length === 0) {
      return validationErrorResponse('Missing required fields', {
        machines: ['At least one machine is required'],
      });
    }
    
    // Validate machines and find machine records
    const returnMachines: any[] = [];
    const damageReports: any[] = [];
    
    for (const machineData of machines) {
      const serialNumber = machineData.serialNumber || machineData.serialNo;
      const returnType = machineData.returnType || 'Standard';
      const damageNote = machineData.damageNote;
      const photosCount = machineData.photosCount || 0;
      
      if (!serialNumber) {
        return validationErrorResponse('Invalid machine data', {
          machines: ['Each machine must have a serialNumber'],
        });
      }
      
      // Find machine by serial number
      const machine = await prisma.machine.findUnique({
        where: { serialNumber },
        include: {
          brand: true,
          model: true,
          type: true,
        },
      });
      
      if (!machine) {
        return validationErrorResponse('Machine not found', {
          machines: [`Machine with serial number ${serialNumber} not found`],
        });
      }

      // Ensure machine belongs to this rental
      if (!rentalMachineIds.has(machine.id)) {
        return validationErrorResponse('Machine not in this rental', {
          machines: [`Machine ${serialNumber} is not assigned to this rental agreement.`],
        });
      }

      // Ensure machine is currently RENTED (dispatched via gate pass)
      if (machine.status !== 'RENTED') {
        return validationErrorResponse('Machine not rented', {
          machines: [`Machine ${serialNumber} is not in RENTED status (may already be returned or not yet dispatched).`],
        });
      }
      
      // Validate damage/missing requirements
      if ((returnType === 'Damage' || returnType === 'Missing') && (!damageNote || photosCount === 0)) {
        return validationErrorResponse('Validation failed', {
          machines: [`Machine ${serialNumber}: Damage/Missing items require damageNote and at least one photo`],
        });
      }
      
      // Map returnType to triageCategory
      const triageCategoryMap: Record<string, 'STANDARD' | 'DAMAGE' | 'MISSING_PARTS' | 'EXCHANGE'> = {
        'Good': 'STANDARD',
        'Standard': 'STANDARD',
        'Damage': 'DAMAGE',
        'Missing': 'MISSING_PARTS',
        'Exchange': 'EXCHANGE',
      };
      const triageCategory = triageCategoryMap[returnType] || 'STANDARD';
      
      returnMachines.push({
        machineId: machine.id,
        returnType,
        damageNote: (returnType === 'Damage' || returnType === 'Missing') ? damageNote : null,
        photos: [], // Photos would be uploaded separately and URLs stored here
        triageCategory,
        brand: machine.brand?.name ?? 'Unknown',
        model: machine.model?.name ?? 'Unknown',
        machineType: machine.type?.name ?? null,
        serialNumber: machine.serialNumber,
      });
      
      // Create damage report if needed
      if (returnType === 'Damage' || returnType === 'Missing') {
        damageReports.push({
          machineId: machine.id,
          rentalId: rental.id,
          severity: 'MODERATE', // Default, can be enhanced (MINOR, MODERATE, MAJOR)
          category: returnType === 'Damage' ? 'DAMAGE' : 'MISSING_PARTS', // DAMAGE, MISSING_PARTS, EXCHANGE
          description: damageNote || '',
          photos: [], // Photos would be uploaded separately
          estimatedRepairCost: 0,
          approvedChargeToCustomer: 0,
          createdByUserId: auth.id,
        });
      }
    }
    
    // Generate return number
    const count = await prisma.return.count();
    const returnNumber = `RET-${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    const returnDate = new Date();
    
    // Create return with machines in a transaction
    const newReturn = await prisma.$transaction(async (tx) => {
      // Create the return record
      const returnRecord = await tx.return.create({
        data: {
          returnNumber,
          rentalId: rental.id,
          customerId: rental.customerId,
          machineId: returnMachines[0]?.machineId || null, // Keep for backward compatibility
          returnDate: returnDate,
          triageCategory: returnMachines.some(rm => rm.triageCategory !== 'STANDARD') 
            ? 'DAMAGE' 
            : 'STANDARD',
          notes: notes || undefined,
          inspectedByUserId: auth.id,
        },
      });
      
      // Create return machines
      for (const rm of returnMachines) {
        await tx.returnMachine.create({
          data: {
            returnId: returnRecord.id,
            machineId: rm.machineId,
            returnType: rm.returnType,
            damageNote: rm.damageNote,
            photos: rm.photos,
          },
        });
      }

      // Set all returned machines to AVAILABLE (inventory back in stock)
      const returnedMachineIds = returnMachines.map((rm) => rm.machineId);
      if (returnedMachineIds.length > 0) {
        await tx.machine.updateMany({
          where: { id: { in: returnedMachineIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      // Create bincard RETURN_IN entries for each returned machine (inventory update)
      const performedBy = auth?.fullName ?? auth?.username ?? 'System';
      for (const rm of returnMachines) {
        const brand = rm.brand ?? 'Unknown';
        const model = rm.model ?? 'Unknown';
        const machineType = rm.machineType ?? null;
        const lastEntry = await (tx as any).bincardEntry.findFirst({
          where: { brand, model },
          orderBy: { date: 'desc' },
          select: { balance: true },
        });
        const previousBalance = lastEntry?.balance ?? 0;
        const newBalance = previousBalance + 1;
        await (tx as any).bincardEntry.create({
          data: {
            date: returnDate,
            transactionType: 'RETURN_IN',
            brand,
            model,
            machineType,
            reference: returnNumber,
            quantityIn: 1,
            quantityOut: 0,
            balance: newBalance,
            performedBy,
            notes: `Return ${returnNumber} – machine ${rm.serialNumber} returned`,
          },
        });
      }
      
      // Create damage reports (one per damaged/missing machine); link first to Return
      let damageReportId: string | null = null;
      if (damageReports.length > 0) {
        for (const dr of damageReports) {
          const report = await tx.damageReport.create({ data: dr });
          if (!damageReportId) damageReportId = report.id;
        }
        await tx.return.update({
          where: { id: returnRecord.id },
          data: { damageReportId },
        });
      }
      
      // Fetch complete return with relations
      return await tx.return.findUnique({
        where: { id: returnRecord.id },
        include: {
          rental: { include: { customer: true } },
          inspectedBy: true,
          machine: { include: { brand: true, model: true, type: true } },
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
          damageReport: true,
        },
      });
    });
    
    // Transform response to match frontend expectations
    const transformed: any = {
      id: newReturn!.id,
      returnNumber: newReturn!.returnNumber,
      agreementId: rental.agreementNumber,
      createdAt: newReturn!.createdAt,
      createdBy: createdBy || auth.fullName || 'System',
      customerName: customerName || rental.customer.name,
      totalMachines: totalMachines || machines.length,
      machines: newReturn!.machines.map((rm: any) => ({
        serialNumber: rm.machine.serialNumber,
        boxNumber: rm.machine.boxNumber || '',
        model: rm.machine.model?.name || '',
        description: `${rm.machine.brand?.name || ''} ${rm.machine.model?.name || ''} - ${rm.machine.type?.name || ''}`.trim(),
        returnType: rm.returnType,
        damageNote: rm.damageNote,
        photosCount: rm.photos.length,
      })),
    };
    
    return successResponse(transformed, 'Return created successfully', 201);
  } catch (error: any) {
    console.error('Error creating return:', error);
    return errorResponse('Failed to create return', 500);
  }
});
