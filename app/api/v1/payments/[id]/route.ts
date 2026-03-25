import { NextRequest } from 'next/server';
import { Decimal } from '@prisma/client/runtime/client';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { customer: true, invoices: true }
    });
    
    if (!payment) {
      return notFoundResponse('Payment not found');
    }
    
    return successResponse(payment, 'Payment retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return errorResponse('Failed to retrieve payment', 500);
  }
});

export const PUT = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingPayment = await prisma.payment.findUnique({ where: { id } });
    if (!existingPayment) {
      return notFoundResponse('Payment not found');
    }
    
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        ...(body.totalAmount && { totalAmount: new Decimal(body.totalAmount) }),
        ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
        ...(body.referenceNumber && { referenceNumber: body.referenceNumber }),
        ...(body.notes && { notes: body.notes }),
      },
      include: { customer: true, invoices: true }
    });
    
    return successResponse(updatedPayment, 'Payment updated successfully');
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return errorResponse('Failed to update payment', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN', 'Operational_Officer'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return notFoundResponse('Payment not found');
    }
    
    await prisma.payment.delete({ where: { id } });
    
    return successResponse({ id }, 'Payment deleted successfully');
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return errorResponse('Failed to delete payment', 500);
  }
});
