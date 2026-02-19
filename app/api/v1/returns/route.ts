import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import type { AuthUser } from '@/lib/auth-supabase';
import { Decimal } from '@prisma/client/runtime/client';

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
      generateInvoice = false,
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
      
      let invoiceId: string | null = null;
      
      // Generate invoice if requested
      if (generateInvoice) {
        // Get rental machines for the returned machines to calculate billing
        const rentalMachinesForReturn = await tx.rentalMachine.findMany({
          where: {
            rentalId: rental.id,
            machineId: {
              in: returnMachines.map((rm: any) => rm.machineId),
            },
          },
        });
        
        // Calculate line items for invoice
        const lineItems: any[] = [];
        let invoiceSubtotal = 0;
        
        for (const returnMachine of returnMachines) {
          const rentalMachine = rentalMachinesForReturn.find(
            (rm: any) => rm.machineId === returnMachine.machineId
          );
          
          if (!rentalMachine) continue;
          
          // Determine billing period: from lastBilledToDate (or rental startDate) to return date
          const periodStart = rentalMachine.lastBilledToDate 
            ? new Date(rentalMachine.lastBilledToDate)
            : new Date(rental.startDate);
          
          const periodEnd = returnDate;
          
          // Calculate days in period
          const daysDiff = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 0) continue; // Skip if no days to bill
          
          // Calculate amount based on paymentBasis
          let lineAmount = 0;
          const dailyRate = parseFloat(rentalMachine.dailyRate.toString());
          const quantity = rentalMachine.quantity || 1;
          
          if (rental.paymentBasis === 'DAILY') {
            lineAmount = dailyRate * quantity * daysDiff;
          } else {
            // MONTHLY: use monthly rate (dailyRate * 30) or prorated
            const monthlyRate = dailyRate * 30;
            if (rental.firstMonthProrated && periodStart.getTime() === new Date(rental.startDate).getTime()) {
              // First period prorated
              const daysInMonth = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0).getDate();
              lineAmount = (monthlyRate * quantity * daysDiff) / daysInMonth;
            } else {
              // Full month or prorated based on days
              const daysInPeriod = daysDiff;
              const daysInMonth = 30; // Standard month
              lineAmount = (monthlyRate * quantity * daysInPeriod) / daysInMonth;
            }
          }
          
          invoiceSubtotal += lineAmount;
          
          // Find machine details for line item
          const machine = await tx.machine.findUnique({
            where: { id: returnMachine.machineId },
            include: {
              brand: true,
              model: true,
              type: true,
            },
          });
          
          lineItems.push({
            description: `${machine?.brand?.name || ''} ${machine?.model?.name || ''} - ${machine?.type?.name || ''}`.trim() || 'Machine Rental',
            quantity: quantity,
            unitPrice: rental.paymentBasis === 'DAILY' ? dailyRate : dailyRate * 30,
            machineId: returnMachine.machineId,
            brand: machine?.brand?.name || '',
            model: machine?.model?.name || '',
            type: machine?.type?.name || '',
            serialNumber: machine?.serialNumber || '',
            periodFrom: periodStart.toISOString().split('T')[0],
            periodTo: periodEnd.toISOString().split('T')[0],
            days: daysDiff,
            vatRate: 0.15, // 15% VAT
          });
        }
        
        if (lineItems.length > 0) {
          const vatAmount = invoiceSubtotal * 0.15;
          const grandTotal = invoiceSubtotal + vatAmount;
          
          // Generate invoice number
          const invoiceCount = await tx.invoice.count();
          const invoiceNumber = `INV${new Date().getFullYear().toString().substr(2)}${String(invoiceCount + 1).padStart(6, '0')}`;
          
          // Calculate due date (30 days from issue date)
          const dueDate = new Date(returnDate);
          dueDate.setDate(dueDate.getDate() + 30);
          
          // Create invoice
          const invoice = await tx.invoice.create({
            data: {
              invoiceNumber,
              customerId: rental.customerId,
              rentalId: rental.id,
              type: 'RENTAL',
              taxCategory: rental.customer.vatApplicable ? 'VAT' : 'NON_VAT',
              status: 'ISSUED',
              issueDate: returnDate,
              dueDate: dueDate,
              lineItems: lineItems,
              subtotal: new Decimal(invoiceSubtotal),
              vatAmount: new Decimal(vatAmount),
              grandTotal: new Decimal(grandTotal),
              balance: new Decimal(grandTotal),
              paidAmount: new Decimal(0),
              createdByUserId: auth.id,
            },
          });
          
          invoiceId = invoice.id;
          
          // Update lastBilledToDate for returned rental machines
          for (const returnMachine of returnMachines) {
            await tx.rentalMachine.updateMany({
              where: {
                rentalId: rental.id,
                machineId: returnMachine.machineId,
              },
              data: {
                lastBilledToDate: returnDate,
              },
            });
          }
          
          // Update return with invoice ID
          await tx.return.update({
            where: { id: returnRecord.id },
            data: { invoiceId },
          });
        }
      }
      
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
      
      // Create damage reports if needed
      let damageReportId: string | null = null;
      if (damageReports.length > 0) {
        const damageReport = await tx.damageReport.create({
          data: damageReports[0], // Create one damage report for the return
        });
        damageReportId = damageReport.id;
        
        // Update return with damage report ID
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
          invoice: true,
        },
      });
    });
    
    // Transform response to match frontend expectations
    const transformed: any = {
      id: newReturn!.id,
      returnNumber: newReturn!.returnNumber,
      agreementId: rental.agreementNumber,
      createdAt: newReturn!.createdAt,
      createdBy: createdBy || auth.name || 'System',
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
    
    // Include invoice info if generated
    if (generateInvoice && newReturn!.invoiceId && newReturn!.invoice) {
      transformed.invoice = {
        id: newReturn!.invoice.id,
        invoiceNumber: newReturn!.invoice.invoiceNumber,
        subtotal: parseFloat(newReturn!.invoice.subtotal.toString()),
        vatAmount: parseFloat(newReturn!.invoice.vatAmount.toString()),
        grandTotal: parseFloat(newReturn!.invoice.grandTotal.toString()),
      };
    }
    
    return successResponse(transformed, 'Return created successfully', 201);
  } catch (error: any) {
    console.error('Error creating return:', error);
    return errorResponse('Failed to create return', 500);
  }
});
