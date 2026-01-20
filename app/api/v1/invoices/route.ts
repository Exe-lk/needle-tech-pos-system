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
    
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');
    const rentalIdFilter = searchParams.get('rentalId');
    const paymentStatusFilter = searchParams.get('paymentStatus');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (statusFilter) filter.status = statusFilter;
    if (paymentStatusFilter) filter.paymentStatus = paymentStatusFilter;
    if (customerIdFilter && isValidObjectId(customerIdFilter)) {
      filter.customerId = toObjectId(customerIdFilter);
    }
    if (rentalIdFilter && isValidObjectId(rentalIdFilter)) {
      filter.rentalId = toObjectId(rentalIdFilter);
    }
    
    const totalItems = await db.collection('invoices').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const invoices = await db
      .collection('invoices')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedInvoices = invoices.map(invoice => sanitizeObject(invoice));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedInvoices,
      pagination,
      'Invoices retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return errorResponse('Failed to retrieve invoices', 500);
  }
}

export async function POST(request: NextRequest) {
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
    
    if (!isValidObjectId(customerId)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    
    // Get customer and settings
    const customer = await db.collection('customers').findOne({ _id: toObjectId(customerId) });
    if (!customer) {
      return validationErrorResponse('Customer not found');
    }
    
    const settings = await db.collection('settings').findOne({ _id: 'global' as any });
    const invoicePrefix = settings?.invoiceSettings?.prefix || 'INV-';
    const startNumber = settings?.invoiceSettings?.startNumber || 1000;
    
    // Generate invoice number
    const lastInvoice = await db.collection('invoices')
      .findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastInvoice ? parseInt(lastInvoice.invoiceNumber?.replace(invoicePrefix, '') || '0') + 1 : startNumber;
    const invoiceNumber = `${invoicePrefix}${nextNumber}`;
    
    // Calculate totals
    let subtotal = 0;
    const processedLineItems = [];
    
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const vatRate = item.vatRate || (customer.taxProfile?.vatApplicable ? (settings?.tax?.defaultVatRate || 18) : 0);
      const lineTotalExclVat = (item.unitPrice || 0) * (item.quantity || 1);
      const vatAmount = lineTotalExclVat * (vatRate / 100);
      const lineTotalInclVat = lineTotalExclVat + vatAmount;
      
      subtotal += lineTotalExclVat;
      
      processedLineItems.push({
        lineNo: i + 1,
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        machineId: item.machineId && isValidObjectId(item.machineId) ? toObjectId(item.machineId) : null,
        rentalId: rentalId && isValidObjectId(rentalId) ? toObjectId(rentalId) : null,
        vatRate,
        vatAmount,
        lineTotalExclVat,
        lineTotalInclVat,
      });
    }
    
    const vatAmount = processedLineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const grandTotal = subtotal + vatAmount;
    
    const taxCategory = customer.taxProfile?.vatApplicable ? 'VAT' : 'NON_VAT';
    const now = new Date();
    
    const newInvoice = {
      invoiceNumber,
      customerId: toObjectId(customerId),
      rentalId: rentalId && isValidObjectId(rentalId) ? toObjectId(rentalId) : null,
      type,
      taxCategory,
      status: 'ISSUED',
      issueDate: issueDate ? new Date(issueDate) : now,
      dueDate: dueDate ? new Date(dueDate) : now,
      lineItems: processedLineItems,
      totals: {
        subtotal,
        vatAmount,
        grandTotal,
        currency: settings?.company?.currency || 'LKR',
      },
      paymentStatus: 'PENDING',
      paidAmount: 0,
      balance: grandTotal,
      createdByUserId: null, // TODO: Get from auth context
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('invoices').insertOne(newInvoice);
    
    // Update rental if applicable
    if (rentalId && isValidObjectId(rentalId)) {
      await db.collection('rentals').updateOne(
        { _id: toObjectId(rentalId) },
        { $push: { invoiceIds: result.insertedId } as any }
      );
    }
    
    const createdInvoice = await db.collection('invoices').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdInvoice), 'Invoice created successfully', 201);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return errorResponse('Failed to create invoice', 500);
  }
}
