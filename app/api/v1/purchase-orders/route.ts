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
        customer: {
          include: {
            locations: {
              orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
        customerLocation: true,
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
        customerLocationId: po.customerLocationId ?? null,
        customerLocation: po.customerLocation ? {
          id: po.customerLocation.id,
          name: po.customerLocation.name,
          addressLine1: po.customerLocation.addressLine1,
          addressLine2: po.customerLocation.addressLine2,
          city: po.customerLocation.city,
          region: po.customerLocation.region,
          postalCode: po.customerLocation.postalCode,
          country: po.customerLocation.country,
        } : null,
        customerLocations: po.customer?.locations || [],
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
      customerLocationId,
    } = body;
    
    if (!customerId || !requestDate || !machines.length) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        requestDate: !requestDate ? ['Request date is required'] : [],
        machines: !machines.length ? ['At least one machine is required'] : [],
      });
    }
    
    // startDate is required, endDate is optional (open-ended)
    if (!startDate) {
      return validationErrorResponse('Rental start date is required', {
        startDate: ['Rental start date is required'],
      });
    }
    
    const customer = await prisma.customer.findUnique({ 
      where: { id: customerId },
      include: { locations: true },
    });
    
    if (!customer) {
      return validationErrorResponse('Invalid customer', {
        customerId: ['Customer not found'],
      });
    }
    
    // Validate customerLocationId if provided
    if (customerLocationId) {
      const location = await prisma.customerLocation.findFirst({
        where: {
          id: customerLocationId,
          customerId: customerId,
        },
      });
      
      if (!location) {
        return validationErrorResponse('Invalid customer location', {
          customerLocationId: ['Customer location not found or does not belong to this customer'],
        });
      }
    }
    
    // Generate request number
    const count = await prisma.purchaseOrder.count();
    const requestNumber = `PO${new Date().getFullYear().toString().substr(2)}${String(count + 1).padStart(6, '0')}`;
    
    // Store machines as JSON with all details
    const machineData = machines.map((m: any) => ({
      id: m.id || m.machineId,
      brand: m.brand,
      model: m.model,
      type: m.type,
      quantity: m.quantity,
      availableStock: m.availableStock || 0,
      unitPrice: m.unitPrice,
      totalPrice: m.totalPrice,
      rentedQuantity: m.rentedQuantity || 0,
      pendingQuantity: m.pendingQuantity || 0,
    }));
    
    const newPurchaseOrder = await prisma.purchaseOrder.create({
      data: {
        requestNumber,
        customerId,
        requestDate: new Date(requestDate),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        customerLocationId: customerLocationId || null,
        totalAmount: new Decimal(totalAmount || 0),
        status: 'PENDING',
        machines: machineData,
      },
      include: {
        customer: {
          include: {
            locations: {
              orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
        customerLocation: true,
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
      customerLocationId: (newPurchaseOrder as any).customerLocationId ?? null,
      customerLocation: (newPurchaseOrder as any).customerLocation ? {
        id: (newPurchaseOrder as any).customerLocation.id,
        name: (newPurchaseOrder as any).customerLocation.name,
        addressLine1: (newPurchaseOrder as any).customerLocation.addressLine1,
        addressLine2: (newPurchaseOrder as any).customerLocation.addressLine2,
        city: (newPurchaseOrder as any).customerLocation.city,
        region: (newPurchaseOrder as any).customerLocation.region,
        postalCode: (newPurchaseOrder as any).customerLocation.postalCode,
        country: (newPurchaseOrder as any).customerLocation.country,
      } : null,
      customerLocations: (newPurchaseOrder as any).customer?.locations || [],
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
