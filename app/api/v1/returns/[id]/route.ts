import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { rental: true, inspector: true }
    });
    
    if (!returnRecord) {
      return notFoundResponse('Return not found');
    }
    
    return successResponse(returnRecord, 'Return retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching return:', error);
    return errorResponse('Failed to retrieve return', 500);
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
    
    const existingReturn = await prisma.return.findUnique({ where: { id } });
    if (!existingReturn) {
      return notFoundResponse('Return not found');
    }
    
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.notes && { notes: body.notes }),
      },
      include: { rental: true, inspector: true }
    });
    
    return successResponse(updatedReturn, 'Return updated successfully');
  } catch (error: any) {
    console.error('Error updating return:', error);
    return errorResponse('Failed to update return', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const returnRecord = await prisma.return.findUnique({ where: { id } });
    if (!returnRecord) {
      return notFoundResponse('Return not found');
    }
    
    await prisma.return.delete({ where: { id } });
    
    return successResponse({ id }, 'Return deleted successfully');
  } catch (error: any) {
    console.error('Error deleting return:', error);
    return errorResponse('Failed to delete return', 500);
  }
});
