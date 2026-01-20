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
    
    const rentalIdFilter = searchParams.get('rentalId');
    const machineIdFilter = searchParams.get('machineId');
    const triageCategoryFilter = searchParams.get('triageCategory');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { returnNumber: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (rentalIdFilter && isValidObjectId(rentalIdFilter)) {
      filter.rentalId = toObjectId(rentalIdFilter);
    }
    if (machineIdFilter && isValidObjectId(machineIdFilter)) {
      filter.machineId = toObjectId(machineIdFilter);
    }
    if (triageCategoryFilter) {
      filter.triageCategory = triageCategoryFilter;
    }
    
    const totalItems = await db.collection('returns').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const returns = await db
      .collection('returns')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedReturns = returns.map(returnItem => sanitizeObject(returnItem));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedReturns,
      pagination,
      'Returns retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(machineIdFilter && { machineId: machineIdFilter }),
        ...(triageCategoryFilter && { triageCategory: triageCategoryFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching returns:', error);
    return errorResponse('Failed to retrieve returns', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rentalId, machineId, returnDate, condition, triageCategory, notes, photos } = body;
    
    if (!rentalId || !machineId || !returnDate || !triageCategory) {
      return validationErrorResponse('Missing required fields', {
        rentalId: !rentalId ? ['Rental ID is required'] : [],
        machineId: !machineId ? ['Machine ID is required'] : [],
        returnDate: !returnDate ? ['Return date is required'] : [],
        triageCategory: !triageCategory ? ['Triage category is required'] : [],
      });
    }
    
    if (!isValidObjectId(rentalId) || !isValidObjectId(machineId)) {
      return validationErrorResponse('Invalid rental or machine ID');
    }
    
    const db = await getDatabase();
    
    // Verify rental and machine exist
    const rental = await db.collection('rentals').findOne({ _id: toObjectId(rentalId) });
    if (!rental) {
      return validationErrorResponse('Rental not found');
    }
    
    const machine = await db.collection('machines').findOne({ _id: toObjectId(machineId) });
    if (!machine) {
      return validationErrorResponse('Machine not found');
    }
    
    // Get settings for return number
    const settings = await db.collection('settings').findOne({ _id: 'global' });
    const returnPrefix = settings?.returnSettings?.returnPrefix || 'RET-';
    const startNumber = settings?.returnSettings?.startNumber || 1000;
    
    // Generate return number
    const lastReturn = await db.collection('returns')
      .findOne({}, { sort: { createdAt: -1 } });
    const nextNumber = lastReturn ? parseInt(lastReturn.returnNumber?.replace(returnPrefix, '') || '0') + 1 : startNumber;
    const returnNumber = `${returnPrefix}${nextNumber}`;
    
    const returnReceiptNumber = `RRCPT-${nextNumber}`;
    const now = new Date();
    
    let damageReportId = null;
    
    // Create damage report if needed
    if (triageCategory === 'DAMAGE' || triageCategory === 'MISSING_PARTS' || triageCategory === 'EXCHANGE') {
      const damageReport = {
        machineId: toObjectId(machineId),
        rentalId: toObjectId(rentalId),
        returnId: null, // Will be updated after return is created
        severity: body.severity || 'MINOR',
        category: triageCategory,
        description: notes || '',
        photos: photos || [],
        estimatedRepairCost: body.estimatedRepairCost || 0,
        approvedChargeToCustomer: body.approvedChargeToCustomer || 0,
        billedInvoiceId: null,
        resolved: false,
        resolvedAt: null,
        createdByUserId: null, // TODO: Get from auth context
        createdAt: now,
        updatedAt: now,
      };
      
      const damageResult = await db.collection('damageReports').insertOne(damageReport);
      damageReportId = damageResult.insertedId;
    }
    
    const newReturn = {
      returnNumber,
      rentalId: toObjectId(rentalId),
      customerId: rental.customerId,
      machineId: toObjectId(machineId),
      returnDate: new Date(returnDate),
      condition: condition || '',
      triageCategory,
      notes: notes || '',
      photos: photos || [],
      damageReportId,
      inspectedByUserId: null, // TODO: Get from auth context
      returnReceiptNumber,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('returns').insertOne(newReturn);
    
    // Update damage report with return ID if exists
    if (damageReportId) {
      await db.collection('damageReports').updateOne(
        { _id: damageReportId },
        { $set: { returnId: result.insertedId } }
      );
    }
    
    // Update machine status to AVAILABLE
    await db.collection('machines').updateOne(
      { _id: toObjectId(machineId) },
      {
        $set: {
          status: 'AVAILABLE',
          updatedAt: now,
        },
        $push: {
          statusHistory: {
            status: 'AVAILABLE',
            changedAt: now,
            changedByUserId: null,
            note: `Returned via ${returnNumber}`,
          },
        },
      }
    );
    
    // Update rental
    await db.collection('rentals').updateOne(
      { _id: toObjectId(rentalId) },
      {
        $push: { returnIds: result.insertedId },
        $set: {
          status: 'COMPLETED',
          actualEndDate: new Date(returnDate),
          updatedAt: now,
        },
      }
    );
    
    const createdReturn = await db.collection('returns').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdReturn), 'Return created successfully', 201);
  } catch (error: any) {
    console.error('Error creating return:', error);
    return errorResponse('Failed to create return', 500);
  }
}
