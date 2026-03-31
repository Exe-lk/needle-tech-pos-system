import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/outstanding-alerts/{id}:
 *   get:
 *     summary: Get outstanding alert by ID
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const alert = await prisma.outstandingAlert.findUnique({
      where: { id },
      include: { customer: true }
    });
    
    if (!alert) {
      return notFoundResponse('Alert not found');
    }
    
    // Transform for frontend
    const transformed = {
      id: alert.id,
      customerId: alert.customerId,
      customerName: alert.customer?.name || '',
      customerType: alert.customer?.type === 'GARMENT_FACTORY' ? 'Company' : 'Individual',
      alertType: alert.alertType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '',
      description: alert.description || '',
      amount: alert.amount ? parseFloat(alert.amount.toString()) : null,
      dueDate: alert.dueDate,
      severity: alert.severity ? alert.severity.charAt(0) + alert.severity.slice(1).toLowerCase() : '',
      status: alert.status === 'RESOLVED' ? 'Resolved' : 'Active',
      createdAt: alert.createdAt,
      relatedAgreement: alert.relatedAgreement || null,
      relatedMachine: alert.relatedMachine || null,
      daysOverdue: alert.daysOverdue || null,
    };
    
    return successResponse(transformed, 'Alert retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching alert:', error);
    return errorResponse('Failed to retrieve alert', 500);
  }
});

/**
 * @swagger
 * /api/v1/outstanding-alerts/{id}:
 *   patch:
 *     summary: Update outstanding alert
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const PATCH = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingAlert = await prisma.outstandingAlert.findUnique({ where: { id } });
    if (!existingAlert) {
      return notFoundResponse('Alert not found');
    }
    
    const updateData: any = {};
    
    if (body.status !== undefined) {
      updateData.status = body.status.toUpperCase();
      if (body.status === 'Resolved' && body.resolvedAt) {
        updateData.resolvedAt = new Date(body.resolvedAt);
      } else if (body.status === 'Active') {
        updateData.resolvedAt = null;
      }
    }
    
    if (body.resolvedAt !== undefined) {
      updateData.resolvedAt = body.resolvedAt ? new Date(body.resolvedAt) : null;
    }
    
    const updatedAlert = await prisma.outstandingAlert.update({
      where: { id },
      data: updateData,
      include: { customer: true }
    });
    
    return successResponse(
      {
        id: updatedAlert.id,
        status: updatedAlert.status === 'RESOLVED' ? 'Resolved' : 'Active',
        resolvedAt: updatedAlert.resolvedAt,
      },
      'Alert updated successfully'
    );
  } catch (error: any) {
    console.error('Error updating alert:', error);
    return errorResponse('Failed to update alert', 500);
  }
});
