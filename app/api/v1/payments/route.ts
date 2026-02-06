import { NextRequest } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerIdFilter = searchParams.get('customerId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { receiptNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (customerIdFilter) where.customerId = customerIdFilter;
    
    const totalItems = await prisma.payment.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const payments = await prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true, invoices: true }
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      payments,
      pagination,
      'Payments retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      { ...(customerIdFilter && { customerId: customerIdFilter }) }
    );
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return errorResponse('Failed to retrieve payments', 500);
  }
});

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customerId, totalAmount, currency = 'USD', paymentMethod, referenceNumber, paidAt, notes } = body;
    
    if (!customerId || !totalAmount) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        totalAmount: !totalAmount ? ['Total amount is required'] : [],
      });
    }
    
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    
    if (!customer) {
      return validationErrorResponse('Invalid customer', {
        customerId: ['Customer not found'],
      });
    }
    
    const newPayment = await prisma.payment.create({
      data: {
        customerId,
        totalAmount: new Decimal(totalAmount),
        currency,
        paymentMethod: paymentMethod || 'CASH',
        referenceNumber: referenceNumber || '',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        notes: notes || '',
      },
      include: { customer: true, invoices: true }
    });
    
    return successResponse(newPayment, 'Payment created successfully', 201);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return errorResponse('Failed to create payment', 500);
  }
});
    
    const createdPayment = await db.collection('payments').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdPayment), 'Payment created successfully', 201);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return errorResponse('Failed to create payment', 500);
  }
});
