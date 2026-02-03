import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { agreementNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (statusFilter) filter.status = statusFilter;
    if (customerIdFilter && isValidObjectId(customerIdFilter)) {
      filter.customerId = toObjectId(customerIdFilter);
    }
    
    const totalItems = await db.collection('rentals').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const rentals = await db
      .collection('rentals')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Populate customer and machine data
    const populatedRentals = await Promise.all(
      rentals.map(async (rental) => {
        const customer = rental.customerId 
          ? await db.collection('customers').findOne({ _id: rental.customerId })
          : null;
        
        const machines = await Promise.all(
          (rental.machines || []).map(async (machine: any) => {
            const machineDoc = machine.machineId 
              ? await db.collection('machines').findOne({ _id: machine.machineId })
              : null;
            return {
              ...machine,
              machine: sanitizeObject(machineDoc),
            };
          })
        );
        
        return {
          ...sanitizeObject(rental),
          customer: sanitizeObject(customer),
          machines,
        };
      })
    );
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      populatedRentals,
      pagination,
      'Rentals retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching rentals:', error);
    return errorResponse('Failed to retrieve rentals', 500);
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { customerId, agreementType, startDate, expectedEndDate, machines } = body;
    
    if (!customerId || !agreementType || !startDate || !machines || !Array.isArray(machines) || machines.length === 0) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        agreementType: !agreementType ? ['Agreement type is required'] : [],
        startDate: !startDate ? ['Start date is required'] : [],
        machines: !machines || machines.length === 0 ? ['At least one machine is required'] : [],
      });
    }
    
    if (!isValidObjectId(customerId)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    
    // Check customer exists and is not credit locked
    const customer = await db.collection('customers').findOne({ _id: toObjectId(customerId) });
    if (!customer) {
      return validationErrorResponse('Customer not found');
    }
    
    if (customer.financials?.isCreditLocked) {
      return validationErrorResponse('Customer is credit locked', {
        customerId: ['Customer has outstanding balance'],
      });
    }
    
    // Get settings for agreement number generation
    const settings = await db.collection('settings').findOne({ _id: 'global' } as any);
    const agreementPrefix = settings?.rentalSettings?.agreementPrefix || 'AGR-';
    const startNumber = settings?.rentalSettings?.startNumber || 1000;
    
    // Generate agreement number
    const lastRental = await db.collection('rentals')
      .findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastRental ? parseInt(lastRental.agreementNumber?.replace(agreementPrefix, '') || '0') + 1 : startNumber;
    const agreementNumber = `${agreementPrefix}${nextNumber}`;
    
    // Validate machines and calculate totals
    let subtotal = 0;
    let depositTotal = 0;
    const machineDocs = [];
    
    for (const machineItem of machines) {
      if (!isValidObjectId(machineItem.machineId)) {
        return validationErrorResponse('Invalid machine ID');
      }
      
      const machine = await db.collection('machines').findOne({ _id: toObjectId(machineItem.machineId) });
      if (!machine) {
        return validationErrorResponse(`Machine ${machineItem.machineId} not found`);
      }
      
      if (machine.status !== 'AVAILABLE') {
        return validationErrorResponse(`Machine ${machine.serialNumber} is not available`);
      }
      
      const rate = machineItem.rate || 0;
      const deposit = machineItem.depositAmount || 0;
      subtotal += rate * (machineItem.quantity || 1);
      depositTotal += deposit * (machineItem.quantity || 1);
      
      machineDocs.push({
        machineId: machine._id,
        serialNumberSnapshot: machine.serialNumber,
        brandSnapshot: machine.brand,
        modelSnapshot: machine.model,
        rateType: machineItem.rateType || 'MONTHLY',
        rate: rate,
        depositAmount: deposit,
        quantity: machineItem.quantity || 1,
      });
    }
    
    // Calculate VAT
    const vatRate = customer.taxProfile?.vatApplicable ? (settings?.tax?.defaultVatRate || 18) : 0;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    
    const now = new Date();
    const newRental = {
      agreementNumber,
      customerId: toObjectId(customerId),
      status: 'ACTIVE',
      agreementType,
      startDate: new Date(startDate),
      expectedEndDate: new Date(expectedEndDate),
      actualEndDate: null,
      machines: machineDocs,
      financials: {
        subtotal,
        vatAmount,
        total,
        depositTotal,
        paidAmount: 0,
        balance: total,
        currency: settings?.company?.currency || 'LKR',
      },
      invoiceIds: [],
      securityDepositInvoiceId: null,
      gatePassIds: [],
      returnIds: [],
      isLockedForNewTransactions: false,
      lockedReason: null,
      createdByUserId: null, // TODO: Get from auth context
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('rentals').insertOne(newRental);
    
    // Update machine statuses
    for (const machineItem of machineDocs) {
      await db.collection('machines').updateOne(
        { _id: machineItem.machineId },
        { 
          $set: { 
            status: 'RENTED',
            updatedAt: now,
          },
          $push: {
            statusHistory: {
              status: 'RENTED',
              changedAt: now,
              changedByUserId: null,
              note: `Rented via ${agreementNumber}`,
            },
          },
        } as any
      );
    }
    
    const createdRental = await db.collection('rentals').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdRental), 'Rental created successfully', 201);
  } catch (error: any) {
    console.error('Error creating rental:', error);
    return errorResponse('Failed to create rental', 500);
  }
});
