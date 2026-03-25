import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const type = await prisma.machineType.findUnique({ where: { id } });
    
    if (!type) {
      return notFoundResponse('Machine type not found');
    }
    
    return successResponse(type, 'Machine type retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine type:', error);
    return errorResponse('Failed to retrieve machine type', 500);
  }
});

export const PUT = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingType = await prisma.machineType.findUnique({ where: { id } });
    if (!existingType) {
      return notFoundResponse('Machine type not found');
    }
    
    const updatedType = await prisma.machineType.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.code && { code: body.code }),
        ...(body.description && { description: body.description }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      }
    });
    
    return successResponse(updatedType, 'Machine type updated successfully');
  } catch (error: any) {
    console.error('Error updating machine type:', error);
    return errorResponse('Failed to update machine type', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN', 'Operational_Officer'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const type = await prisma.machineType.findUnique({ where: { id } });
    if (!type) {
      return notFoundResponse('Machine type not found');
    }
    
    await prisma.machineType.delete({ where: { id } });
    
    return successResponse({ id }, 'Machine type deleted successfully');
  } catch (error: any) {
    console.error('Error deleting machine type:', error);
    return errorResponse('Failed to delete machine type', 500);
  }
});
