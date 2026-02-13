import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

/**
 * @swagger
 * /api/v1/rentals/from-purchase-request:
 *   post:
 *     summary: Create rental agreement from purchase request
 *     description: Creates a rental agreement from an approved purchase request
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest, context: any) => {
  try {
    const body = await request.json();
    const {
      purchaseRequestId,
      rentalStartDate,
      rentalEndDate,
      machines = [],
    } = body;
    
    if (!purchaseRequestId || !rentalStartDate || !rentalEndDate || !machines.length) {
      return validationErrorResponse('Missing required fields', {
        purchaseRequestId: !purchaseRequestId ? ['Purchase request ID is required'] : [],
        rentalStartDate: !rentalStartDate ? ['Rental start date is required'] : [],
        rentalEndDate: !rentalEndDate ? ['Rental end date is required'] : [],
        machines: !machines.length ? ['At least one machine is required'] : [],
      });
    }
    
    // Get purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseRequestId },
      include: { customer: true },
    });
    
    if (!purchaseOrder) {
      return notFoundResponse('Purchase request not found');
    }
    
    if (purchaseOrder.status !== 'APPROVED') {
      return validationErrorResponse('Invalid purchase request status', {
        purchaseRequestId: ['Purchase request must be approved'],
      });
    }
    
    // Calculate totals
    let subtotal = 0;
    for (const machine of machines) {
      const quantity = machine.quantity || 0;
      const unitPrice = machine.unitPrice || 0;
      subtotal += quantity * unitPrice;
    }
    
    const vatAmount = subtotal * 0.15; // 15% VAT
    const total = subtotal + vatAmount;
    
    // Generate agreement number
    const count = await prisma.rental.count();
    const agreementNumber = `RA${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    const userId = context.user?.id || 'system';
    
    // Create rental agreement
    const newRental = await prisma.rental.create({
      data: {
        agreementNumber,
        customerId: purchaseOrder.customerId,
        purchaseOrderId: purchaseRequestId,
        status: 'ACTIVE',
        startDate: new Date(rentalStartDate),
        expectedEndDate: new Date(rentalEndDate),
        subtotal: new Decimal(subtotal),
        vatAmount: new Decimal(vatAmount),
        total: new Decimal(total),
        balance: new Decimal(total),
        paidAmount: new Decimal(0),
        depositTotal: new Decimal(0),
        createdByUserId: userId,
      },
      include: {
        customer: true,
        machines: true,
      },
    });
    
    // Create rental machines
    for (const machine of machines) {
      await prisma.rentalMachine.create({
        data: {
          rentalId: newRental.id,
          machineId: machine.machineId,
          dailyRate: new Decimal(machine.unitPrice || 0),
          securityDeposit: new Decimal(0),
          quantity: machine.quantity || 1,
        },
      });
    }
    
    // Update purchase order status
    await prisma.purchaseOrder.update({
      where: { id: purchaseRequestId },
      data: { status: 'COMPLETED' },
    });
    
    // Transform response
    const transformed = {
      id: newRental.id,
      agreementNo: newRental.agreementNumber,
      customerId: newRental.customerId,
      customerName: newRental.customer.name,
      startDate: newRental.startDate,
      endDate: newRental.expectedEndDate,
      status: 'Pending',
    };
    
    return successResponse(transformed, 'Rental agreement created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental from purchase request:', error);
    return errorResponse('Failed to create rental agreement', 500);
  }
});
