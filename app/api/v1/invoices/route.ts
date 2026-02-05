import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: Get all invoices
 *     description: Retrieve paginated list of invoices with Supabase auth
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (customerIdFilter) where.customerId = customerIdFilter;
    
    const totalItems = await prisma.invoice.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const invoices = await prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true, rental: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      invoices,
      pagination,
      'Invoices retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return errorResponse('Failed to retrieve invoices', 500);
  }
});

/**
 * @swagger
 * /api/v1/invoices:
 *   post:
 *     summary: Create a new invoice
 *     description: Create a new invoice with Supabase auth (Admin/Manager only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - rentalId
 *             properties:
 *               customerId:
 *                 type: string
 *               rentalId:
 *                 type: string
 *               totalAmount:
 *                 type: number
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customerId, rentalId, totalAmount = 0, notes = '' } = body;
    
    if (!customerId || !rentalId) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        rentalId: !rentalId ? ['Rental ID is required'] : [],
      });
    }
    
    // Verify customer and rental exist
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
    
    if (!customer || !rental) {
      return validationErrorResponse('Invalid customer or rental', {
        customerId: !customer ? ['Customer not found'] : [],
        rentalId: !rental ? ['Rental not found'] : [],
      });
    }
    
    const newInvoice = await prisma.invoice.create({
      data: {
        customerId,
        rentalId,
        totalAmount,
        status: 'DRAFT',
        notes,
      },
      include: { customer: true, rental: true }
    });
    
    return successResponse(newInvoice, 'Invoice created successfully', 201);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return errorResponse('Failed to create invoice', 500);
  }
});
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return errorResponse('Failed to retrieve invoices', 500);
  }
});

export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customerId, rentalId, type, lineItems, issueDate, dueDate } = body;
    
    if (!customerId || !type || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        type: !type ? ['Invoice type is required'] : [],
        lineItems: !lineItems || lineItems.length === 0 ? ['At least one line item is required'] : [],
      });
    }
    
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return validationErrorResponse('Customer not found', {
        customerId: ['Customer not found'],
      });
    }
    
    let rentalCheck = null;
    if (rentalId) {
      rentalCheck = await prisma.rental.findUnique({ where: { id: rentalId } });
      if (!rentalCheck) {
        return validationErrorResponse('Rental not found', {
          rentalId: ['Rental not found'],
        });
      }
    }
    
    const now = new Date();
    const newInvoice = await prisma.invoice.create({
      data: {
        customerId,
        rentalId: rentalId || null,
        type,
        status: 'ISSUED',
        issueDate: issueDate ? new Date(issueDate) : now,
        dueDate: dueDate ? new Date(dueDate) : now,
      },
      include: { customer: true, rental: true }
    });
    
    return successResponse(newInvoice, 'Invoice created successfully', 201);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return errorResponse('Failed to create invoice', 500);
  }
});
