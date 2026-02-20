import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndPermission } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndPermission(['customers:view', 'management:*', '*'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const customer = await prisma.customer.findUnique({
      where: { id },
    });
    
    if (!customer) {
      return notFoundResponse('Customer not found');
    }
    
    return successResponse(customer, 'Customer retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return errorResponse('Failed to retrieve customer', 500);
  }
});

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   put:
 *     summary: Update customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
export const PUT = withAuthAndPermission(['customers:update', 'management:*', '*'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return notFoundResponse('Customer not found');
    }
    
    const updateData: any = {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.contactPerson && { contactPerson: body.contactPerson }),
      ...(body.phones && { phones: body.phones }),
      ...(body.emails && { emails: body.emails }),
      ...(body.billingAddress && { billingAddress: body.billingAddress }),
      ...(body.shippingAddress && { shippingAddress: body.shippingAddress }),
      ...(body.status && { status: body.status }),
    };
    
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });
    
    return successResponse(updatedCustomer, 'Customer updated successfully');
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return errorResponse('Failed to update customer', 500);
  }
});

/**
 * @swagger
 * /api/v1/customers/{id}:
 *   delete:
 *     summary: Delete customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 */
export const DELETE = withAuthAndPermission(['customers:delete', 'management:*', '*'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return notFoundResponse('Customer not found');
    }
    
    await prisma.customer.delete({ where: { id } });
    
    return successResponse({ id }, 'Customer deleted successfully');
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return errorResponse('Failed to delete customer', 500);
  }
});
