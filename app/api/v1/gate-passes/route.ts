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
    const rentalIdFilter = searchParams.get('rentalId');
    const customerIdFilter = searchParams.get('customerId');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { gatePassNumber: { $regex: search, $options: 'i' } },
        { driverName: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (statusFilter) filter.status = statusFilter;
    if (rentalIdFilter && isValidObjectId(rentalIdFilter)) {
      filter.rentalId = toObjectId(rentalIdFilter);
    }
    if (customerIdFilter && isValidObjectId(customerIdFilter)) {
      filter.customerId = toObjectId(customerIdFilter);
    }
    
    const totalItems = await db.collection('gatePasses').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const gatePasses = await db
      .collection('gatePasses')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedGatePasses = gatePasses.map(gatePass => sanitizeObject(gatePass));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedGatePasses,
      pagination,
      'Gate passes retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching gate passes:', error);
    return errorResponse('Failed to retrieve gate passes', 500);
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { rentalId, driverName, vehicleNumber, machines, departureTime } = body;
    
    if (!rentalId || !driverName || !vehicleNumber || !machines || !Array.isArray(machines) || machines.length === 0) {
      return validationErrorResponse('Missing required fields', {
        rentalId: !rentalId ? ['Rental ID is required'] : [],
        driverName: !driverName ? ['Driver name is required'] : [],
        vehicleNumber: !vehicleNumber ? ['Vehicle number is required'] : [],
        machines: !machines || machines.length === 0 ? ['At least one machine is required'] : [],
      });
    }
    
    if (!isValidObjectId(rentalId)) {
      return validationErrorResponse('Invalid rental ID');
    }
    
    const db = await getDatabase();
    
    // Verify rental exists and has payment
    const rental = await db.collection('rentals').findOne({ _id: toObjectId(rentalId) });
    if (!rental) {
      return validationErrorResponse('Rental not found');
    }
    
    // Check if payment has been made (No-Pay, No-Go)
    if (rental.financials.paidAmount <= 0) {
      return validationErrorResponse('Payment required before gate pass can be issued', {
        rentalId: ['Rental has no payment recorded'],
      });
    }
    
    // Get settings for gate pass number
    const settings = await db.collection('settings').findOne({ _id: 'global' } as any);
    const gatePassPrefix = settings?.gatePassSettings?.prefix || 'GP-';
    const startNumber = settings?.gatePassSettings?.startNumber || 1000;
    
    // Generate gate pass number
    const lastGatePass = await db.collection('gatePasses')
      .findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastGatePass ? parseInt(lastGatePass.gatePassNumber?.replace(gatePassPrefix, '') || '0') + 1 : startNumber;
    const gatePassNumber = `${gatePassPrefix}${nextNumber}`;
    
    // Process machines
    const processedMachines = [];
    for (const machineItem of machines) {
      if (!isValidObjectId(machineItem.machineId)) {
        return validationErrorResponse('Invalid machine ID');
      }
      
      const machine = await db.collection('machines').findOne({ _id: toObjectId(machineItem.machineId) });
      if (!machine) {
        return validationErrorResponse(`Machine ${machineItem.machineId} not found`);
      }
      
      processedMachines.push({
        machineId: machine._id,
        serialNumberSnapshot: machine.serialNumber,
      });
    }
    
    const now = new Date();
    const newGatePass = {
      gatePassNumber,
      rentalId: toObjectId(rentalId),
      customerId: rental.customerId,
      machines: processedMachines,
      driverName,
      vehicleNumber,
      departureTime: departureTime ? new Date(departureTime) : now,
      arrivalTime: null,
      issuedByUserId: null, // TODO: Get from auth context
      status: 'DEPARTED',
      printedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('gatePasses').insertOne(newGatePass);
    
    // Update rental with gate pass ID
    await db.collection('rentals').updateOne(
      { _id: toObjectId(rentalId) },
      { $push: { gatePassIds: result.insertedId } } as any
    );
    
    const createdGatePass = await db.collection('gatePasses').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdGatePass), 'Gate pass created successfully', 201);
  } catch (error: any) {
    console.error('Error creating gate pass:', error);
    return errorResponse('Failed to create gate pass', 500);
  }
});
