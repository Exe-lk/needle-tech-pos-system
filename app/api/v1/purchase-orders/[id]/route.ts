import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/purchase-orders/{id}:
 *   get:
 *     summary: Get purchase order by ID
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        rentals: {
          select: {
            id: true,
            agreementNumber: true,
          },
        },
      },
    });
    
    if (!purchaseOrder) {
      return notFoundResponse('Purchase order not found');
    }
    
    // Transform for frontend
    const machines = Array.isArray(purchaseOrder.machines) ? purchaseOrder.machines : [];
    const requestedMachines = machines.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
    
    const transformed = {
      id: purchaseOrder.id,
      requestNumber: purchaseOrder.requestNumber,
      customerId: purchaseOrder.customerId,
      customerName: purchaseOrder.customer?.name || '',
      customerType: purchaseOrder.customer?.type === 'GARMENT_FACTORY' ? 'Business' : 'Individual',
      requestDate: purchaseOrder.requestDate,
      startDate: (purchaseOrder as any).startDate ?? null,
      endDate: (purchaseOrder as any).endDate ?? null,
      totalAmount: parseFloat(purchaseOrder.totalAmount.toString()),
      status: purchaseOrder.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      requestedMachines,
      machines: machines.map((m: any) => ({
        id: m.id || m.machineId,
        brand: m.brand,
        model: m.model,
        type: m.type,
        quantity: m.quantity,
        availableStock: m.availableStock || 0,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice,
        monthlyRentalFee: m.monthlyRentalFee ?? m.unitPrice ?? 0,
        rentedQuantity: m.rentedQuantity || 0,
        pendingQuantity: m.quantity - (m.rentedQuantity || 0),
        expectedAvailabilityDate: m.expectedAvailabilityDate || null,
      })),
      rentalAgreementIds: purchaseOrder.rentals.map((r: any) => r.id),
    };
    
    return successResponse(transformed, 'Purchase order retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching purchase order:', error);
    return errorResponse('Failed to retrieve purchase order', 500);
  }
});

/**
 * @swagger
 * /api/v1/purchase-orders/{id}:
 *   put:
 *     summary: Update purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 */
export const PUT = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingPO = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existingPO) {
      return notFoundResponse('Purchase order not found');
    }
    
    const updateData: any = {};
    
    if (body.status !== undefined) {
      updateData.status = body.status.toUpperCase().replace(/ /g, '_');
    }
    if (body.machines !== undefined) {
      updateData.machines = body.machines;
    }
    if (body.totalAmount !== undefined) {
      updateData.totalAmount = body.totalAmount;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        rentals: true,
      },
    });
    
    return successResponse(updatedPO, 'Purchase order updated successfully');
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    return errorResponse('Failed to update purchase order', 500);
  }
});

/**
 * @swagger
 * /api/v1/purchase-orders/{id}:
 *   delete:
 *     summary: Delete purchase order
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 */
export const DELETE = withAuthAndRole(['SUPER_ADMIN', 'ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!purchaseOrder) {
      return notFoundResponse('Purchase order not found');
    }
    
    await prisma.purchaseOrder.delete({ where: { id } });
    
    return successResponse({ id }, 'Purchase order deleted successfully');
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    return errorResponse('Failed to delete purchase order', 500);
  }
});
