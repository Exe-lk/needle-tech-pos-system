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
    
    const machineIdFilter = searchParams.get('machineId');
    const rentalIdFilter = searchParams.get('rentalId');
    const resolvedFilter = searchParams.get('resolved');
    const severityFilter = searchParams.get('severity');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (machineIdFilter && isValidObjectId(machineIdFilter)) {
      filter.machineId = toObjectId(machineIdFilter);
    }
    if (rentalIdFilter && isValidObjectId(rentalIdFilter)) {
      filter.rentalId = toObjectId(rentalIdFilter);
    }
    if (resolvedFilter !== null) {
      filter.resolved = resolvedFilter === 'true';
    }
    if (severityFilter) {
      filter.severity = severityFilter;
    }
    
    const totalItems = await db.collection('damageReports').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const damageReports = await db
      .collection('damageReports')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedReports = damageReports.map(report => sanitizeObject(report));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedReports,
      pagination,
      'Damage reports retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(machineIdFilter && { machineId: machineIdFilter }),
        ...(rentalIdFilter && { rentalId: rentalIdFilter }),
        ...(resolvedFilter !== null && { resolved: resolvedFilter === 'true' }),
        ...(severityFilter && { severity: severityFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching damage reports:', error);
    return errorResponse('Failed to retrieve damage reports', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, rentalId, returnId, severity, category, description, photos, estimatedRepairCost, approvedChargeToCustomer } = body;
    
    if (!machineId || !severity || !category || !description) {
      return validationErrorResponse('Missing required fields', {
        machineId: !machineId ? ['Machine ID is required'] : [],
        severity: !severity ? ['Severity is required'] : [],
        category: !category ? ['Category is required'] : [],
        description: !description ? ['Description is required'] : [],
      });
    }
    
    if (!isValidObjectId(machineId)) {
      return validationErrorResponse('Invalid machine ID');
    }
    
    const db = await getDatabase();
    
    // Verify machine exists
    const machine = await db.collection('machines').findOne({ _id: toObjectId(machineId) });
    if (!machine) {
      return validationErrorResponse('Machine not found');
    }
    
    const now = new Date();
    const newDamageReport = {
      machineId: toObjectId(machineId),
      rentalId: rentalId && isValidObjectId(rentalId) ? toObjectId(rentalId) : null,
      returnId: returnId && isValidObjectId(returnId) ? toObjectId(returnId) : null,
      severity,
      category,
      description,
      photos: photos || [],
      estimatedRepairCost: estimatedRepairCost || 0,
      approvedChargeToCustomer: approvedChargeToCustomer || 0,
      billedInvoiceId: null,
      resolved: false,
      resolvedAt: null,
      createdByUserId: null, // TODO: Get from auth context
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('damageReports').insertOne(newDamageReport);
    const createdReport = await db.collection('damageReports').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdReport), 'Damage report created successfully', 201);
  } catch (error: any) {
    console.error('Error creating damage report:', error);
    return errorResponse('Failed to create damage report', 500);
  }
}
