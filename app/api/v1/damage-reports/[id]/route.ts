import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid damage report ID');
    }
    
    const db = await getDatabase();
    const reportId = toObjectId(id);
    
    const report = await db.collection('damageReports').findOne({ _id: reportId });
    
    if (!report) {
      return notFoundResponse('Damage report not found');
    }
    
    return successResponse(sanitizeObject(report), 'Damage report retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching damage report:', error);
    return errorResponse('Failed to retrieve damage report', 500);
  }
});

export const PUT = withAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid damage report ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const reportId = toObjectId(id);
    
    const existingReport = await db.collection('damageReports').findOne({ _id: reportId });
    if (!existingReport) {
      return notFoundResponse('Damage report not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.photos !== undefined) updateData.photos = body.photos;
    if (body.estimatedRepairCost !== undefined) updateData.estimatedRepairCost = body.estimatedRepairCost;
    if (body.approvedChargeToCustomer !== undefined) updateData.approvedChargeToCustomer = body.approvedChargeToCustomer;
    if (body.resolved !== undefined) {
      updateData.resolved = body.resolved;
      if (body.resolved && !existingReport.resolved) {
        updateData.resolvedAt = new Date();
      }
    }
    
    await db.collection('damageReports').updateOne(
      { _id: reportId },
      { $set: updateData }
    );
    
    const updatedReport = await db.collection('damageReports').findOne({ _id: reportId });
    
    return successResponse(sanitizeObject(updatedReport!), 'Damage report updated successfully');
  } catch (error: any) {
    console.error('Error updating damage report:', error);
    return errorResponse('Failed to update damage report', 500);
  }
});
