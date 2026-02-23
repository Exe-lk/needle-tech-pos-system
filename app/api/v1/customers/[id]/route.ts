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
      include: { locations: true },
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
      ...(body.name != null && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.contactPerson != null && { contactPerson: body.contactPerson }),
      ...(body.phones && { phones: body.phones }),
      ...(body.emails && { emails: body.emails }),
      ...(body.billingAddressLine1 != null && { billingAddressLine1: body.billingAddressLine1 }),
      ...(body.billingAddressLine2 != null && { billingAddressLine2: body.billingAddressLine2 }),
      ...(body.billingCity != null && { billingCity: body.billingCity }),
      ...(body.billingRegion != null && { billingRegion: body.billingRegion }),
      ...(body.billingPostalCode != null && { billingPostalCode: body.billingPostalCode }),
      ...(body.billingCountry != null && { billingCountry: body.billingCountry }),
      ...(body.shippingAddressLine1 != null && { shippingAddressLine1: body.shippingAddressLine1 }),
      ...(body.shippingAddressLine2 != null && { shippingAddressLine2: body.shippingAddressLine2 }),
      ...(body.shippingCity != null && { shippingCity: body.shippingCity }),
      ...(body.shippingRegion != null && { shippingRegion: body.shippingRegion }),
      ...(body.shippingPostalCode != null && { shippingPostalCode: body.shippingPostalCode }),
      ...(body.shippingCountry != null && { shippingCountry: body.shippingCountry }),
      ...(body.vatRegistrationNumber != null && { vatRegistrationNumber: body.vatRegistrationNumber }),
      ...(body.status && { status: body.status }),
    };

    if (body.locations && Array.isArray(body.locations)) {
      await prisma.customerLocation.deleteMany({ where: { customerId: id } });
      const validLocations = body.locations.filter((loc: any) => loc && (loc.name || loc.address));
      if (validLocations.length > 0) {
        await prisma.customerLocation.createMany({
          data: validLocations.map((loc: any, index: number) => ({
            customerId: id,
            name: (loc.name && String(loc.name).trim()) || `Location ${index + 1}`,
            addressLine1: (loc.address && String(loc.address).trim()) || null,
            isDefault: index === 0,
          })),
        });
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
      include: { locations: true },
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
