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
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER'], async (request: NextRequest, context: any) => {
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
    
    if (new Date(rentalEndDate) < new Date(rentalStartDate)) {
      return validationErrorResponse('Rental end date must be after start date', {
        rentalEndDate: ['Rental end date must be after start date'],
      });
    }
    
    // Get purchase order
    const purchaseOrder = await (prisma as any).purchaseOrder.findUnique({
      where: { id: purchaseRequestId },
      include: { customer: true },
    });
    
    if (!purchaseOrder) {
      return notFoundResponse('Purchase request not found');
    }
    
    const allowedStatuses = ['APPROVED', 'PARTIALLY_FULFILLED','PENDING'];
    if (!allowedStatuses.includes(purchaseOrder.status)) {
      return validationErrorResponse('Invalid purchase request status', {
        purchaseRequestId: ['Purchase request must be approved or partially fulfilled to create another hiring agreement'],
      });
    }
    
    // Validate requested machine lines exist on the PO (we do not assign specific machines here; assignment happens on machine-assign-page)
    // Purchase order stores unitPrice as MONTHLY rental fee per unit (from purchase-order create page).
    const poMachines = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    const requestedMachineLines: { brand: string; model: string; type: string; quantity: number; dailyRate: number }[] = [];
    for (const req of machines) {
      const line = poMachines.find((m: any) => String(m.id || m.machineId) === String(req.machineId));
      if (!line) {
        return validationErrorResponse('Invalid machine for this purchase order', {
          machines: [`Machine ${req.machineId} is not part of this purchase order`],
        });
      }
      const requested = req.quantity || 0;
      if (requested < 1) continue;
      // PO unitPrice is monthly; store daily rate for RentalMachine compatibility (monthly / 30)
      const monthlyRate = typeof req.unitPrice === 'number' ? req.unitPrice : parseFloat(String(req.unitPrice || 0)) || 0;
      const dailyRate = monthlyRate / 30;
      requestedMachineLines.push({
        brand: String(line.brand || '').trim(),
        model: String(line.model || '').trim(),
        type: String(line.type || '').trim(),
        quantity: requested,
        dailyRate,
      });
    }
    if (requestedMachineLines.length === 0) {
      return validationErrorResponse('At least one machine line with quantity > 0 is required', {
        machines: ['Select at least one machine with quantity greater than zero'],
      });
    }

    // Calculate totals: PO unitPrice is always MONTHLY rental fee per unit
    const monthlySubtotal = machines.reduce(
      (sum: number, m: { quantity?: number; unitPrice?: number }) =>
        sum + (m.quantity || 0) * (typeof m.unitPrice === 'number' ? m.unitPrice : parseFloat(String(m.unitPrice || 0)) || 0),
      0
    );
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const daysDiff = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(daysDiff / 30));
    const subtotal = monthlySubtotal * months;

    const vatAmount = subtotal * 0.15; // 15% VAT
    const total = subtotal + vatAmount;
    
    // Generate agreement number
    const count = await prisma.rental.count();
    const agreementNumber = `RA${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    const userId = context.id;
    
    // Create rental agreement with status PENDING; no machines are assigned (assignment happens on machine-assign-page)
    // Balance = 0 for new agreements so outstanding is not shown until first invoice/payment (avoids new customers showing incorrect outstanding)
    const newRental = await prisma.rental.create({
      data: {
        agreementNumber,
        customerId: purchaseOrder.customerId,
        purchaseOrderId: purchaseRequestId,
        status: 'PENDING',
        requestedMachineLines: requestedMachineLines as any,
        startDate: new Date(rentalStartDate),
        expectedEndDate: new Date(rentalEndDate),
        subtotal: new Decimal(subtotal),
        vatAmount: new Decimal(vatAmount),
        total: new Decimal(total),
        balance: new Decimal(0),
        paidAmount: new Decimal(0),
        depositTotal: new Decimal(0),
        createdByUserId: userId,
      } as any,
      include: {
        customer: true,
        machines: true,
      },
    });

    // Update purchase order: add this agreement's quantities to each line's rentedQuantity; set status Completed when all lines fulfilled, else Partially Fulfilled
    const currentMachines = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    const machineIdToAdded = new Map<string, number>();
    for (const m of machines) {
      const id = String(m.machineId);
      machineIdToAdded.set(id, (machineIdToAdded.get(id) || 0) + (m.quantity || 0));
    }
    const updatedMachines = currentMachines.map((line: any) => {
      const id = line.id != null ? String(line.id) : String(line.machineId);
      const added = machineIdToAdded.get(id) || 0;
      const prevRented = line.rentedQuantity || 0;
      return { ...line, rentedQuantity: prevRented + added };
    });
    const allFulfilled = updatedMachines.every((m: any) => (m.rentedQuantity || 0) >= (m.quantity || 0));
    const newPoStatus = allFulfilled ? 'COMPLETED' : 'PARTIALLY_FULFILLED';
    await (prisma as any).purchaseOrder.update({
      where: { id: purchaseRequestId },
      data: { machines: updatedMachines, status: newPoStatus },
    });
    
    // Transform response
    const r = newRental as any;
    const transformed = {
      id: r.id,
      agreementNo: r.agreementNumber,
      customerId: r.customerId,
      customerName: r.customer?.name ?? '',
      startDate: r.startDate,
      endDate: r.expectedEndDate ?? undefined,
      status: 'Pending',
    };
    
    return successResponse(transformed, 'Rental agreement created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental from purchase request:', error);
    return errorResponse('Failed to create rental agreement', 500);
  }
});