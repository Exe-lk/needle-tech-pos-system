import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/outstanding-alerts/by-customer/{customerId}:
 *   get:
 *     summary: Get outstanding alerts by customer ID
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: alertType
 *         schema: { type: string }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'],
  async (
    request: NextRequest,
    _auth,
    { params }: { params: Promise<{ customerId: string }> }
  ) => {
    try {
      const { customerId } = await params;

      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return notFoundResponse('Customer not found');
      }

      const searchParams = request.nextUrl.searchParams;
      const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
      const statusFilter = searchParams.get('status');
      const alertTypeFilter = searchParams.get('alertType');
      const severityFilter = searchParams.get('severity');

      const where: Record<string, unknown> = { customerId };

      if (statusFilter) {
        where.status = statusFilter.toUpperCase();
      }
      if (alertTypeFilter) {
        where.alertType = alertTypeFilter.toUpperCase().replace(/ /g, '_');
      }
      if (severityFilter) {
        where.severity = severityFilter.toUpperCase();
      }

      const usePagination = searchParams.get('paginate') !== 'false';
      const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';

      if (usePagination) {
        const totalItems = await prisma.outstandingAlert.count({ where });
        const skip = (page - 1) * limit;

        const alerts = await prisma.outstandingAlert.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder_ },
          include: { customer: true },
        });

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
          transformed,
          pagination,
          'Outstanding alerts for customer retrieved successfully',
          { sortBy, sortOrder: sortOrder_ },
          undefined,
          {
            ...(statusFilter && { status: statusFilter }),
            ...(alertTypeFilter && { alertType: alertTypeFilter }),
            ...(severityFilter && { severity: severityFilter }),
          }
        );
      }

      const alerts = await prisma.outstandingAlert.findMany({
        where,
        orderBy: { [sortBy]: sortOrder_ },
        take: 100,
        include: { customer: true },
      });

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

      return successResponse(
        { outstandingAlerts: transformed },
        'Outstanding alerts for customer retrieved successfully'
      );
    } catch (error: any) {
      console.error('Error fetching outstanding alerts by customer:', error);
      return errorResponse('Failed to retrieve outstanding alerts for customer', 500);
    }
  }
);