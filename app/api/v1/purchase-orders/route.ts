import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

/**
 * @swagger
 * /api/v1/purchase-orders:
 *   get:
 *     summary: Get all purchase orders (purchase requests)
 *     description: Retrieve paginated list of purchase orders with filtering
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (statusFilter) {
      where.status = statusFilter.toUpperCase().replace(/ /g, '_');
    }
    
    const totalItems = await prisma.purchaseOrder.count({ where });
    const skip = (page - 1) * limit;
    const sortOrderDir = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrderDir },
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
    
    // Transform for frontend
    const transformed = purchaseOrders.map((po: any) => {
      const machines = Array.isArray(po.machines) ? po.machines : [];
      const requestedMachines = machines.reduce((sum: number, m: any) => sum + (m.quantity || 0), 0);
      const rentedQuantity = machines.reduce((sum: number, m: any) => sum + (m.rentedQuantity || 0), 0);
      
      return {
        id: po.id,
        requestNumber: po.requestNumber,
        customerId: po.customerId,
        customerName: po.customer?.name || '',
        customerType: po.customer?.type === 'GARMENT_FACTORY' ? 'Business' : 'Individual',
        requestDate: po.requestDate,
        startDate: (po as any).startDate ?? null,
        endDate: (po as any).endDate ?? null,
        totalAmount: parseFloat(po.totalAmount.toString()),
        status: po.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
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
        rentalAgreementIds: po.rentals.map((r: any) => r.id),
      };
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      transformed,
      pagination,
      'Purchase orders retrieved successfully',
      { sortBy, sortOrder: sortOrderDir },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return errorResponse('Failed to retrieve purchase orders', 500);
  }
});

/**
 * @swagger
 * /api/v1/purchase-orders:
 *   post:
 *     summary: Create a new purchase order
 *     description: Create a new purchase request for a customer
 *     tags: [Purchase Orders]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      startDate,
      endDate,
      requestDate,
      machines = [],
      totalAmount,
    } = body;
    
    if (!customerId || !requestDate || !machines.length) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        requestDate: !requestDate ? ['Request date is required'] : [],
        machines: !machines.length ? ['At least one machine is required'] : [],
      });
    }
    if (!startDate || !endDate) {
      return validationErrorResponse('Rental period is required', {
        startDate: !startDate ? ['Rental start date is required'] : [],
        endDate: !endDate ? ['Rental end date is required'] : [],
      });
    }
    
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    
    if (!customer) {
      return validationErrorResponse('Invalid customer', {
        customerId: ['Customer not found'],
      });
    }
    
    // Generate request number
    const count = await prisma.purchaseOrder.count();
    const requestNumber = `PO${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    // Store machines as JSON with all details (monthlyRentalFee optional; used for total when provided)
    const machineData = machines.map((m: any) => {
      const monthlyRentalFee = typeof m.monthlyRentalFee === 'number' ? m.monthlyRentalFee : (m.unitPrice ?? 0);
      const qty = Number(m.quantity) || 0;
      return {
        id: m.id || m.machineId,
        brand: m.brand,
        model: m.model,
        type: m.type,
        quantity: m.quantity,
        availableStock: m.availableStock || 0,
        unitPrice: m.unitPrice ?? monthlyRentalFee,
        totalPrice: m.totalPrice ?? monthlyRentalFee * qty,
        monthlyRentalFee,
        rentedQuantity: m.rentedQuantity || 0,
        pendingQuantity: m.pendingQuantity ?? 0,
      };
    });
    // Always compute total on API from line items (single source of truth)
    const computedTotal = machineData.reduce((sum: number, m: any) => sum + (Number(m.totalPrice) || 0), 0);
    
    const newPurchaseOrder = await prisma.purchaseOrder.create({
      data: {
        requestNumber,
        customerId,
        requestDate: new Date(requestDate),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalAmount: new Decimal(computedTotal),
        status: 'PENDING',
        machines: machineData,
      },
      include: {
        customer: true,
        rentals: true,
      },
    });
    
    // Transform response
    const transformed = {
      id: newPurchaseOrder.id,
      requestNumber: newPurchaseOrder.requestNumber,
      customerId: newPurchaseOrder.customerId,
      customerName: newPurchaseOrder.customer.name,
      requestDate: newPurchaseOrder.requestDate,
      startDate: (newPurchaseOrder as any).startDate ?? null,
      endDate: (newPurchaseOrder as any).endDate ?? null,
      totalAmount: parseFloat(newPurchaseOrder.totalAmount.toString()),
      status: newPurchaseOrder.status,
      machines: machineData,
    };
    
    return successResponse(transformed, 'Purchase request created successfully', 201);
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return errorResponse('Failed to create purchase order', 500);
  }
});
