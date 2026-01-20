import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid invoice ID');
    }
    
    const db = await getDatabase();
    const invoiceId = toObjectId(params.id);
    
    const invoice = await db.collection('invoices').findOne({ _id: invoiceId });
    
    if (!invoice) {
      return notFoundResponse('Invoice not found');
    }
    
    return successResponse(sanitizeObject(invoice), 'Invoice retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return errorResponse('Failed to retrieve invoice', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid invoice ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const invoiceId = toObjectId(params.id);
    
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
}
