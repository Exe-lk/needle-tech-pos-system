import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/outstanding-alerts:
 *   get:
 *     summary: Get all outstanding alerts
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerTypeFilter = searchParams.get('customerType');
    const alertTypeFilter = searchParams.get('alertType');
    const severityFilter = searchParams.get('severity');
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (customerTypeFilter) {
      const customerType = customerTypeFilter === 'Company' ? 'GARMENT_FACTORY' : 'INDIVIDUAL';
      where.customer = { type: customerType };
    }
    
    if (alertTypeFilter) {
      where.alertType = alertTypeFilter.toUpperCase().replace(/ /g, '_');
    }
    
    if (severityFilter) {
      where.severity = severityFilter.toUpperCase();
    }
    
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }
    
    const totalItems = await prisma.outstandingAlert.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const alerts = await prisma.outstandingAlert.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true }
    });
    
    // Transform for frontend
    const transformed = alerts.map((alert: any) => ({
      id: alert.id,
      customerId: alert.customerId,
      customerName: alert.customer?.name || '',
      customerType: alert.customer?.type === 'GARMENT_FACTORY' ? 'Company' : 'Individual',
      alertType: alert.alertType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '',
      description: alert.description || '',
      amount: alert.amount ? parseFloat(alert.amount.toString()) : null,
      dueDate: alert.dueDate,
      severity: alert.severity?.charAt(0) + alert.severity?.slice(1).toLowerCase() || '',
      status: alert.status === 'RESOLVED' ? 'Resolved' : 'Active',
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      relatedAgreement: alert.relatedAgreement || null,
      relatedMachine: alert.relatedMachine || null,
      daysOverdue: alert.daysOverdue || null,
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      { outstandingAlerts: transformed },
      pagination,
      'Outstanding alerts retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(customerTypeFilter && { customerType: customerTypeFilter }),
        ...(alertTypeFilter && { alertType: alertTypeFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching outstanding alerts:', error);
    return errorResponse('Failed to retrieve outstanding alerts', 500);
  }
});
