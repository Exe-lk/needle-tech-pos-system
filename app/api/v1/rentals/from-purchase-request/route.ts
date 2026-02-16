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
    
    const allowedStatuses = ['APPROVED', 'PARTIALLY_FULFILLED','PENDING'];
    if (!allowedStatuses.includes(purchaseOrder.status)) {
      return validationErrorResponse('Invalid purchase request status', {
        purchaseRequestId: ['Purchase request must be approved or partially fulfilled to create another hiring agreement'],
      });
    }
    
    // Validate requested quantities do not exceed available per line (stock-aware)
    const poMachines = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    for (const req of machines) {
      const line = poMachines.find((m: any) => String(m.id || m.machineId) === String(req.machineId));
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
    
    const userId = context.id;
    
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
    
    // Resolve PO line (brand, model, type) to a Machine.id (UUID) for each request line
    const poMachinesList = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    for (const machine of machines) {
      const line = poMachinesList.find((m: any) => String(m.id || m.machineId) === String(machine.machineId));
      if (!line || !line.brand || !line.model) {
        return validationErrorResponse('Invalid machine line', {
          machines: [`Could not find PO line or missing brand/model for line ${machine.machineId}`],
        });
      }
      const brandName = String(line.brand).trim();
      const modelName = String(line.model).trim();
      const typeName = line.type ? String(line.type).trim() : null;

      const brand = await prisma.brand.findFirst({
        where: { name: { equals: brandName, mode: 'insensitive' }, isActive: true },
      });
      if (!brand) {
        return validationErrorResponse('Brand not found', {
          machines: [`No brand "${brandName}" found in database for line ${line.brand} / ${line.model}`],
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
      const machineWhere: { brandId: string; modelId?: string; typeId?: string | null } = {
        brandId: brand.id,
        modelId: model.id,
      };
      if (typeId != null) machineWhere.typeId = typeId;
      const resolvedMachine = await prisma.machine.findFirst({
        where: machineWhere,
      });
      if (!resolvedMachine) {
        return validationErrorResponse('No machine found for this line', {
          machines: [`No machine in inventory for ${brandName} / ${modelName}${typeName ? ` / ${typeName}` : ''}. Ensure at least one machine exists with this brand and model.`],
        });
      }

      await prisma.rentalMachine.create({
        data: {
          rentalId: newRental.id,
          machineId: resolvedMachine.id,
          dailyRate: new Decimal(machine.unitPrice || 0),
          securityDeposit: new Decimal(0),
          quantity: machine.quantity || 1,
        },
      });
    }
    
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
    const newStatus = allFulfilled ? 'COMPLETED' : 'PARTIALLY_FULFILLED';
    
    await prisma.purchaseOrder.update({
      where: { id: purchaseRequestId },
      data: { machines: updatedMachines, status: newStatus },
    });
    
    // Transform response
    const rentalWithCustomer = newRental as typeof newRental & { customer?: { name: string } };
    const transformed = {
      id: newRental.id,
      agreementNo: newRental.agreementNumber,
      customerId: newRental.customerId,
      customerName: rentalWithCustomer.customer?.name ?? '',
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
