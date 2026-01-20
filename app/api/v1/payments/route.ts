import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerIdFilter = searchParams.get('customerId');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (customerIdFilter && isValidObjectId(customerIdFilter)) {
      filter.customerId = toObjectId(customerIdFilter);
    }
    
    const totalItems = await db.collection('payments').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const payments = await db
      .collection('payments')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedPayments = payments.map(payment => sanitizeObject(payment));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedPayments,
      pagination,
      'Payments retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return errorResponse('Failed to retrieve payments', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, invoices, totalAmount, currency, paymentMethod, referenceNumber, paidAt, notes } = body;
    
    if (!customerId || !invoices || !Array.isArray(invoices) || invoices.length === 0 || !totalAmount) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        invoices: !invoices || invoices.length === 0 ? ['At least one invoice is required'] : [],
        totalAmount: !totalAmount ? ['Total amount is required'] : [],
      });
    }
    
    if (!isValidObjectId(customerId)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    
    // Verify customer exists
    const customer = await db.collection('customers').findOne({ _id: toObjectId(customerId) });
    if (!customer) {
      return validationErrorResponse('Customer not found');
    }
    
    // Get settings for receipt number
    const settings = await db.collection('settings').findOne({ _id: 'global' });
    
    // Generate receipt number
    const lastPayment = await db.collection('payments')
      .findOne({}, { sort: { createdAt: -1 } });
    const receiptNumber = `RCPT-${(lastPayment ? parseInt(lastPayment.receiptNumber?.replace('RCPT-', '') || '0') : 0) + 1}`;
    
    // Process invoices
    const processedInvoices = [];
    for (const invoiceItem of invoices) {
      if (!isValidObjectId(invoiceItem.invoiceId)) {
        return validationErrorResponse('Invalid invoice ID');
      }
      
      const invoice = await db.collection('invoices').findOne({ _id: toObjectId(invoiceItem.invoiceId) });
      if (!invoice) {
        return validationErrorResponse(`Invoice ${invoiceItem.invoiceId} not found`);
      }
      
      processedInvoices.push({
        invoiceId: invoice._id,
        amount: invoiceItem.amount || 0,
      });
    }
    
    const now = new Date();
    const newPayment = {
      receiptNumber,
      customerId: toObjectId(customerId),
      invoices: processedInvoices,
      totalAmount,
      currency: currency || settings?.company?.currency || 'LKR',
      paymentMethod: paymentMethod || 'CASH',
      referenceNumber: referenceNumber || '',
      paidAt: paidAt ? new Date(paidAt) : now,
      receivedByUserId: null, // TODO: Get from auth context
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('payments').insertOne(newPayment);
    
    // Update invoices
    for (const invoiceItem of processedInvoices) {
      const invoice = await db.collection('invoices').findOne({ _id: invoiceItem.invoiceId });
      if (invoice) {
        const newPaidAmount = (invoice.paidAmount || 0) + invoiceItem.amount;
        const newBalance = invoice.totals.grandTotal - newPaidAmount;
        
        await db.collection('invoices').updateOne(
          { _id: invoiceItem.invoiceId },
          {
            $set: {
              paidAmount: newPaidAmount,
              balance: newBalance,
              paymentStatus: newBalance <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'PENDING'),
              updatedAt: now,
            },
          }
        );
      }
    }
    
    // Update customer balance
    const customerPayments = await db.collection('payments')
      .find({ customerId: toObjectId(customerId) })
      .toArray();
    const totalPaid = customerPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    
    const customerInvoices = await db.collection('invoices')
      .find({ customerId: toObjectId(customerId) })
      .toArray();
    const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.totals.grandTotal, 0);
    
    await db.collection('customers').updateOne(
      { _id: toObjectId(customerId) },
      {
        $set: {
          'financials.currentBalance': totalInvoiced - totalPaid,
          updatedAt: now,
        },
      }
    );
    
    const createdPayment = await db.collection('payments').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdPayment), 'Payment created successfully', 201);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return errorResponse('Failed to create payment', 500);
  }
}
