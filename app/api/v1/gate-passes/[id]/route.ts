import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const gatePass = await prisma.gatePass.findUnique({
      where: { id },
      include: { rental: true }
    });
    
    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    return successResponse(gatePass, 'Gate pass retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching gate pass:', error);
    return errorResponse('Failed to retrieve gate pass', 500);
  }
});

export const PUT = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingGatePass = await prisma.gatePass.findUnique({ where: { id } });
    if (!existingGatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    const updatedGatePass = await prisma.gatePass.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.returnTime && { returnTime: new Date(body.returnTime) }),
        ...(body.notes && { notes: body.notes }),
      },
      include: { rental: true }
    });
    
    return successResponse(updatedGatePass, 'Gate pass updated successfully');
  } catch (error: any) {
    console.error('Error updating gate pass:', error);
    return errorResponse('Failed to update gate pass', 500);
  }
});

export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const gatePass = await prisma.gatePass.findUnique({ where: { id } });
    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    await prisma.gatePass.delete({ where: { id } });
    
    return successResponse({ id }, 'Gate pass deleted successfully');
  } catch (error: any) {
    console.error('Error deleting gate pass:', error);
    return errorResponse('Failed to delete gate pass', 500);
  }
});

