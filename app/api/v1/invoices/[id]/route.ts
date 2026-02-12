import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, rental: true }
    });
    
    if (!invoice) {
      return notFoundResponse('Invoice not found');
    }
    
    return successResponse(invoice, 'Invoice retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return errorResponse('Failed to retrieve invoice', 500);
  }
});

export const PUT = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingInvoice = await prisma.invoice.findUnique({ where: { id } });
    if (!existingInvoice) {
      return notFoundResponse('Invoice not found');
    }
    
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.paymentStatus && { paymentStatus: body.paymentStatus }),
      },
      include: { customer: true, rental: true }
    });
    
    return successResponse(updatedInvoice, 'Invoice updated successfully');
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return errorResponse('Failed to update invoice', 500);
  }
});

export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return notFoundResponse('Invoice not found');
    }
    
    await prisma.invoice.delete({ where: { id } });
    
    return successResponse({ id }, 'Invoice deleted successfully');
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return errorResponse('Failed to delete invoice', 500);
  }
});
