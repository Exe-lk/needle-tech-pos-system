import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerIdFilter = searchParams.get('customerId');
    const statusFilter = searchParams.get('status');
    const scheduleDayFilter = searchParams.get('scheduleDay');
    
    const filter: any = {};
    
    if (customerIdFilter && isValidObjectId(customerIdFilter)) {
      filter.customerId = toObjectId(customerIdFilter);
    }
    if (statusFilter) {
      filter.status = statusFilter;
    }
    if (scheduleDayFilter) {
      filter.scheduleDay = parseInt(scheduleDayFilter, 10);
    }
    
    const totalItems = await db.collection('outstandingAlerts').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const alerts = await db
      .collection('outstandingAlerts')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedAlerts = alerts.map(alert => sanitizeObject(alert));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedAlerts,
      pagination,
      'Outstanding alerts retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      undefined,
      {
        ...(customerIdFilter && { customerId: customerIdFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(scheduleDayFilter && { scheduleDay: parseInt(scheduleDayFilter, 10) }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching outstanding alerts:', error);
    return errorResponse('Failed to retrieve outstanding alerts', 500);
  }
});
