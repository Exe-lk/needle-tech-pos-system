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
      tools = [],
    } = body;
    
    const hasMachines = Array.isArray(machines) && machines.length > 0;
    const hasTools = Array.isArray(tools) && tools.length > 0;
    if (!purchaseRequestId || !rentalStartDate || !rentalEndDate || (!hasMachines && !hasTools)) {
      return validationErrorResponse('Missing required fields', {
        purchaseRequestId: !purchaseRequestId ? ['Purchase request ID is required'] : [],
        rentalStartDate: !rentalStartDate ? ['Rental start date is required'] : [],
        rentalEndDate: !rentalEndDate ? ['Rental end date is required'] : [],
        machines: !hasMachines ? ['At least one machine or tool is required'] : [],
        tools: !hasTools ? ['At least one machine or tool is required'] : [],
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
    if (hasMachines) {
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
    }

    // Validate requested tool lines exist on the PO. Tools are stored as JSON lines on the purchase order.
    const poTools = Array.isArray((purchaseOrder as any).tools) ? ((purchaseOrder as any).tools as any[]) : [];
    const requestedToolLines: { toolId: string; quantity: number; unitPrice: number }[] = [];
    /** Persisted on Rental.requestedToolLines (matches schema comment + UI). */
    const requestedToolLinesJson: {
      toolId?: string;
      toolName: string;
      toolType: string;
      brand?: string | null;
      model?: string | null;
      quantity: number;
      unitPrice: number;
    }[] = [];
    if (hasTools) {
      for (const req of tools) {
        const reqToolId = String(req.toolId ?? req.id ?? '');
        const line = poTools.find((t: any) => String(t.toolId ?? t.id) === reqToolId);
        if (!line) {
          return validationErrorResponse('Invalid tool for this purchase order', {
            tools: [`Tool ${reqToolId} is not part of this purchase order`],
          });
        }
        const requestedQty = req.quantity || 0;
        if (requestedQty < 1) continue;
        const monthlyUnitPrice = typeof req.unitPrice === 'number' ? req.unitPrice : parseFloat(String(req.unitPrice || 0)) || 0;
        requestedToolLines.push({ toolId: reqToolId, quantity: requestedQty, unitPrice: monthlyUnitPrice });
        requestedToolLinesJson.push({
          toolId: reqToolId,
          toolName: String(line.toolName ?? '').trim(),
          toolType: String(line.toolType ?? '').trim(),
          brand: line.brand != null && line.brand !== '' ? String(line.brand) : null,
          model: line.model != null && line.model !== '' ? String(line.model) : null,
          quantity: requestedQty,
          unitPrice: monthlyUnitPrice,
        });
      }
      if (requestedToolLines.length === 0) {
        return validationErrorResponse('At least one tool line with quantity > 0 is required', {
          tools: ['Select at least one tool with quantity greater than zero'],
        });
      }
    }

    // Calculate totals: PO unitPrice is always MONTHLY rental fee per unit
    const machineMonthlySubtotal = (hasMachines ? machines : []).reduce(
      (sum: number, m: { quantity?: number; unitPrice?: number }) =>
        sum + (m.quantity || 0) * (typeof m.unitPrice === 'number' ? m.unitPrice : parseFloat(String(m.unitPrice || 0)) || 0),
      0
    );
    const toolsMonthlySubtotal = (hasTools ? requestedToolLines : []).reduce(
      (sum: number, t: { quantity: number; unitPrice: number }) => sum + (t.quantity || 0) * (t.unitPrice || 0),
      0
    );
    const monthlySubtotal = machineMonthlySubtotal + toolsMonthlySubtotal;
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const daysDiff = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.max(1, Math.ceil(daysDiff / 30));
    const subtotal = monthlySubtotal * months;

    // Hiring agreements created from a purchase order must match the purchase order amount.
    // Do not add VAT here based on customer type (tax handling is managed elsewhere in the system).
    const vatAmount = 0;
    const total = subtotal;
    
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
        requestedMachineLines: requestedMachineLines.length > 0 ? (requestedMachineLines as any) : undefined,
        ...(requestedToolLinesJson.length > 0 ? { requestedToolLines: requestedToolLinesJson as any } : {}),
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

    // Create RentalTool records for each selected tool (snapshot pricing/qty)
    if (requestedToolLines.length > 0) {
      for (const row of requestedToolLines) {
        await (prisma as any).rentalTool.create({
          data: {
            rentalId: newRental.id,
            toolId: row.toolId,
            unitPrice: new Decimal(row.unitPrice || 0),
            quantity: row.quantity || 0,
          },
        });
      }
    }

    // Update purchase order: add this agreement's quantities to each line's rentedQuantity; set status Completed when all lines fulfilled, else Partially Fulfilled
    const currentMachines = Array.isArray(purchaseOrder.machines) ? (purchaseOrder.machines as any[]) : [];
    const machineIdToAdded = new Map<string, number>();
    if (hasMachines) {
      for (const m of machines) {
        const id = String(m.machineId);
        machineIdToAdded.set(id, (machineIdToAdded.get(id) || 0) + (m.quantity || 0));
      }
    }
    const updatedMachines = currentMachines.map((line: any) => {
      const id = line.id != null ? String(line.id) : String(line.machineId);
      const added = machineIdToAdded.get(id) || 0;
      const prevRented = line.rentedQuantity || 0;
      return { ...line, rentedQuantity: prevRented + added };
    });

    const currentTools = Array.isArray((purchaseOrder as any).tools) ? ((purchaseOrder as any).tools as any[]) : [];
    const toolIdToAdded = new Map<string, number>();
    if (requestedToolLines.length > 0) {
      for (const t of requestedToolLines) {
        const id = String(t.toolId);
        toolIdToAdded.set(id, (toolIdToAdded.get(id) || 0) + (t.quantity || 0));
      }
    }
    const updatedTools = currentTools.map((line: any) => {
      const id = String(line.toolId ?? line.id);
      const added = toolIdToAdded.get(id) || 0;
      const prevRented = line.rentedQuantity || 0;
      return { ...line, rentedQuantity: prevRented + added };
    });

    const allMachinesFulfilled = updatedMachines.length === 0 || updatedMachines.every((m: any) => (m.rentedQuantity || 0) >= (m.quantity || 0));
    const allToolsFulfilled = updatedTools.length === 0 || updatedTools.every((t: any) => (t.rentedQuantity || 0) >= (t.quantity || 0));
    const allFulfilled = allMachinesFulfilled && allToolsFulfilled;
    const newPoStatus = allFulfilled ? 'COMPLETED' : 'PARTIALLY_FULFILLED';
    await (prisma as any).purchaseOrder.update({
      where: { id: purchaseRequestId },
      data: { machines: updatedMachines, tools: updatedTools, status: newPoStatus },
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