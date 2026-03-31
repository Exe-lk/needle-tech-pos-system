import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return errorResponse('Customer not found', 404);
    }
    
    // Get all rentals for this customer with their relations
    const rentals = await prisma.rental.findMany({
      where: { customerId: id },
      include: {
        machines: true,
        invoices: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return successResponse(rentals, 'Customer rental history retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental history:', error);
    return errorResponse('Failed to retrieve rental history', 500);
  }
});
