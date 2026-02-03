import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid invoice ID');
    }
    
    const db = await getDatabase();
    const invoiceId = toObjectId(id);
    
    const invoice = await db.collection('invoices').findOne({ _id: invoiceId });
    
    if (!invoice) {
      return notFoundResponse('Invoice not found');
    }
    
    return successResponse(sanitizeObject(invoice), 'Invoice retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return errorResponse('Failed to retrieve invoice', 500);
  }
});

export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid invoice ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const invoiceId = toObjectId(id);
    
    const existingInvoice = await db.collection('invoices').findOne({ _id: invoiceId });
    if (!existingInvoice) {
      return notFoundResponse('Invoice not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.paidAmount !== undefined) {
      updateData.paidAmount = body.paidAmount;
      updateData.balance = existingInvoice.totals.grandTotal - body.paidAmount;
    }
    
    await db.collection('invoices').updateOne(
      { _id: invoiceId },
      { $set: updateData }
    );
    
    const updatedInvoice = await db.collection('invoices').findOne({ _id: invoiceId });
    
    return successResponse(sanitizeObject(updatedInvoice!), 'Invoice updated successfully');
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return errorResponse('Failed to update invoice', 500);
  }
});
