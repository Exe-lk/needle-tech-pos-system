import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/outstanding-alerts/{id}/resolve:
 *   patch:
 *     summary: Resolve outstanding alert
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const PATCH = withAuthAndRole(['ADMIN', 'MANAGER'], async (
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
    
    const updateData: any = {
      status: 'RESOLVED',
      resolvedAt: body.resolvedAt ? new Date(body.resolvedAt) : new Date(),
    };
    
    const updatedAlert = await prisma.outstandingAlert.update({
      where: { id },
      data: updateData,
    });
    
    return successResponse(
      {
        id: updatedAlert.id,
        status: 'Resolved',
        resolvedAt: updatedAlert.resolvedAt,
      },
      'Alert resolved successfully'
    );
  } catch (error: any) {
    console.error('Error resolving alert:', error);
    return errorResponse('Failed to resolve alert', 500);
  }
});
