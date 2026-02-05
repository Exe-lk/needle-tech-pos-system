import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const report = await prisma.damageReport.findUnique({
      where: { id },
      include: { machine: true, rental: true }
    });
    
    if (!report) {
      return notFoundResponse('Damage report not found');
    }
    
    return successResponse(report, 'Damage report retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching damage report:', error);
    return errorResponse('Failed to retrieve damage report', 500);
  }
});

export const PUT = withAuthAndRole(['ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingReport = await prisma.damageReport.findUnique({ where: { id } });
    if (!existingReport) {
      return notFoundResponse('Damage report not found');
    }
    
    const updatedReport = await prisma.damageReport.update({
      where: { id },
      data: {
        ...(body.severity && { severity: body.severity }),
        ...(body.category && { category: body.category }),
        ...(body.description && { description: body.description }),
        ...(body.estimatedRepairCost !== undefined && { estimatedRepairCost: new Decimal(body.estimatedRepairCost) }),
        ...(body.resolved !== undefined && { resolved: body.resolved }),
      },
      include: { machine: true, rental: true }
    });
    
    return successResponse(updatedReport, 'Damage report updated successfully');
  } catch (error: any) {
    console.error('Error updating damage report:', error);
    return errorResponse('Failed to update damage report', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const report = await prisma.damageReport.findUnique({ where: { id } });
    if (!report) {
      return notFoundResponse('Damage report not found');
    }
    
    await prisma.damageReport.delete({ where: { id } });
    
    return successResponse({ id }, 'Damage report deleted successfully');
  } catch (error: any) {
    console.error('Error deleting damage report:', error);
    return errorResponse('Failed to delete damage report', 500);
  }
});
