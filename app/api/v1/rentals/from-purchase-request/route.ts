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
    
    // Get purchase order (PurchaseOrder model on PrismaClient)
    const purchaseOrder = await (prisma as any).purchaseOrder.findUnique({
      where: { id: purchaseRequestId },
      include: { customer: true },
    });
    
    if (!purchaseOrder) {
      return notFoundResponse('Purchase request not found');
    }
    
    const allowedStatuses = ['APPROVED', 'PARTIALLY_FULFILLED', 'PENDING', 'ACTIVE'];
    if (!allowedStatuses.includes(purchaseOrder.status)) {
      return validationErrorResponse('Invalid purchase request status', {
        purchaseRequestId: ['Purchase request must be approved, active, or partially fulfilled to create another hiring agreement'],
      });
    }
    
    // Validate requested quantities do not exceed available per line (stock-aware)
    const poMachinesList = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    for (const req of machines) {
      const line = poMachinesList.find((m: any) => String(m.id || m.machineId) === String(req.machineId));
      if (!line) {
        return validationErrorResponse('Invalid machine for this purchase order', {
          machines: [`Machine ${req.machineId} is not part of this purchase order`],
        });
      }
      const requested = req.quantity || 0;
      const ordered = line.quantity || 0;
      const alreadyRented = line.rentedQuantity || 0;
      const available = Math.min(line.availableStock || 0, ordered - alreadyRented);
      if (requested > available) {
        return validationErrorResponse('Quantity exceeds available stock for this line', {
          machines: [`Requested ${requested} but only ${available} available for this machine line`],
        });
      }
    }

    // Number of months in rental period (same formula as rental-agreement page for consistent display)
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const monthsInPeriod = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));

    // Calculate totals: use PO line monthly fee as single source of truth (full period = monthly × months)
    let subtotalMonthly = 0;
    for (const machine of machines) {
      const line = poMachinesList.find((m: any) => String(m.id || m.machineId) === String(machine.machineId));
      const monthlyFee = line != null
        ? (typeof (line as any).monthlyRentalFee === 'number' ? (line as any).monthlyRentalFee : parseFloat(String((line as any).unitPrice ?? 0)) || 0)
        : (parseFloat(String(machine.unitPrice ?? 0)) || 0);
      const quantity = Math.max(0, Number(machine.quantity) || 0);
      subtotalMonthly += quantity * monthlyFee;
    }
    const periodSubtotal = subtotalMonthly * monthsInPeriod;
    const vatAmount = periodSubtotal * 0.15; // 15% VAT
    const total = periodSubtotal + vatAmount;
    
    // Generate agreement number
    const count = await prisma.rental.count();
    const agreementNumber = `RA${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    const userId = context.id;

    // Build expected machine categories for this rental (for UI and for PUT expected count). No machines assigned yet.
    const expectedMachineCategories: { id: string; brand: string; model: string; type: string; quantity: number }[] = [];
    let expectedMachineCount = 0;
    for (const machine of machines) {
      const line = poMachinesList.find((m: any) => String(m.id || m.machineId) === String(machine.machineId));
      if (!line || !line.brand || !line.model) {
        return validationErrorResponse('Invalid machine line', {
          machines: [`Could not find PO line or missing brand/model for line ${machine.machineId}`],
        });
      }
      const qty = machine.quantity || 1;
      expectedMachineCount += qty;
      expectedMachineCategories.push({
        id: String(machine.machineId),
        brand: String(line.brand || '').trim(),
        model: String(line.model || '').trim(),
        type: line.type ? String(line.type).trim() : '',
        quantity: qty,
      });
    }
    const expectedPayload = JSON.stringify({
      expectedMachineCount,
      expectedMachineCategories,
    });

    // Create rental agreement (PENDING, no machines assigned; assign via machine-assign / Update Agreement)
    const newRental = await prisma.rental.create({
      data: {
        agreementNumber,
        customerId: purchaseOrder.customerId,
        purchaseOrderId: purchaseRequestId,
        status: 'PENDING',
        startDate: new Date(rentalStartDate),
        expectedEndDate: new Date(rentalEndDate),
        subtotal: new Decimal(periodSubtotal),
        vatAmount: new Decimal(vatAmount),
        total: new Decimal(total),
        balance: new Decimal(total),
        paidAmount: new Decimal(0),
        depositTotal: new Decimal(0),
        createdByUserId: userId,
        lockedReason: expectedPayload,
      } as any,
      include: {
        customer: true,
        machines: true,
      },
    });

    // Update purchase order: add rented quantities to each line and set status
    const currentMachines = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    const machineIdToRented = new Map<string, number>();
    for (const m of machines) {
      const id = String(m.machineId);
      machineIdToRented.set(id, (machineIdToRented.get(id) || 0) + (m.quantity || 0));
    }
    const updatedMachines = currentMachines.map((m: any) => {
      const id = m.id != null ? String(m.id) : String(m.machineId);
      const added = machineIdToRented.get(id) || 0;
      const prevRented = m.rentedQuantity || 0;
      return { ...m, rentedQuantity: prevRented + added };
    });
    const allFulfilled = updatedMachines.every((m: any) => (m.rentedQuantity || 0) >= (m.quantity || 0));
    // When at least one hiring agreement is created from this PO, mark PO as ACTIVE; COMPLETED when all lines fulfilled
    const newStatus = allFulfilled ? 'COMPLETED' : 'ACTIVE';
    
    await (prisma as any).purchaseOrder.update({
      where: { id: purchaseRequestId },
      data: { machines: updatedMachines, status: newStatus },
    });
    
    // Transform response (status PENDING until machines assigned in machine-assign-page)
    const rentalWithCustomer = newRental as typeof newRental & { customer?: { name: string } };
    const transformed = {
      id: newRental.id,
      agreementNo: newRental.agreementNumber,
      customerId: newRental.customerId,
      customerName: rentalWithCustomer.customer?.name ?? '',
      startDate: newRental.startDate,
      endDate: newRental.expectedEndDate,
      status: newRental.status,
    };
    
    return successResponse(transformed, 'Rental agreement created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental from purchase request:', error);
    return errorResponse('Failed to create rental agreement', 500);
  }
});
