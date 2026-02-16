import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/rentals/by-number:
 *   get:
 *     summary: Get rental agreement by number
 *     description: Lookup rental agreement by agreement number for returns or machine assignment
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agreementNumber = searchParams.get('number');
    
    if (!agreementNumber) {
      return validationErrorResponse('Missing required parameter', {
        number: ['Agreement number is required'],
      });
    }
    
    const rental = await prisma.rental.findFirst({
      where: {
        agreementNumber: {
          contains: agreementNumber,
          mode: 'insensitive',
        },
      },
      include: {
        customer: true,
        purchaseOrder: true,
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
    
    if (!rental) {
      return notFoundResponse('Rental agreement not found');
    }
    
    // Calculate rental period
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.expectedEndDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    const rentalPeriod = `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    
    // Transform machines
    const machines = rental.machines.map((rm: any) => ({
      id: rm.machineId,
      model: rm.machine.model?.name || '',
      serialNumber: rm.machine.serialNumber,
      boxNumber: rm.machine.boxNumber || '',
      description: `${rm.machine.brand?.name || ''} ${rm.machine.model?.name || ''} - ${rm.machine.type?.name || ''}`.trim(),
    }));
    
    // Get expected machine categories from purchase order if available
    let expectedMachineCategories: any[] = [];
    if (rental.purchaseOrder && Array.isArray(rental.purchaseOrder.machines)) {
      // Group by brand/model/type and sum quantities
      const categoryMap = new Map<string, any>();
      rental.purchaseOrder.machines.forEach((m: any) => {
        const key = `${m.brand || ''}_${m.model || ''}_${m.type || ''}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            id: m.id || m.machineId || key,
            brand: m.brand || '',
            model: m.model || '',
            type: m.type || '',
            quantity: 0,
          });
        }
        const category = categoryMap.get(key);
        category.quantity += m.quantity || 0;
      });
      expectedMachineCategories = Array.from(categoryMap.values());
    }
    
    const transformed = {
      id: rental.agreementNumber,
      rentalId: rental.id,
      agreementNo: rental.agreementNumber,
      status: rental.status,
      customerName: rental.customer.name,
      customerAddress: [
        rental.customer.billingAddressLine1,
        rental.customer.billingAddressLine2,
        rental.customer.billingCity,
        rental.customer.billingRegion,
        rental.customer.billingPostalCode,
        rental.customer.billingCountry,
      ].filter(Boolean).join(', '),
      customerPhone: rental.customer.phones[0] || '',
      customerEmail: rental.customer.emails[0] || '',
      rentalStartDate: rental.startDate,
      rentalEndDate: rental.expectedEndDate,
      rentalPeriod,
      monthlyRate: parseFloat(rental.subtotal.toString()) / diffMonths,
      totalAmount: parseFloat(rental.total.toString()),
      paidAmount: parseFloat(rental.paidAmount.toString()),
      outstandingAmount: parseFloat(rental.balance.toString()),
      securityDeposit: parseFloat(rental.depositTotal.toString()),
      dispatchedDate: rental.startDate,
      expectedReturnDate: rental.expectedEndDate,
      machines,
      expectedMachines: expectedMachineCategories.reduce((sum, cat) => sum + cat.quantity, 0),
      addedMachines: rental.machines.length,
      expectedMachineCategories,
      purchaseRequestId: rental.purchaseOrderId,
      purchaseRequestNumber: rental.purchaseOrder?.requestNumber,
    };
    
    return successResponse(transformed, 'Rental agreement retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental by number:', error);
    return errorResponse('Failed to retrieve rental agreement', 500);
  }
});
