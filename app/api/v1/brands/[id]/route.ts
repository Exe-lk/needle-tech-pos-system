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
    
    const brand = await prisma.brand.findUnique({ where: { id } });
    
    if (!brand) {
      return notFoundResponse('Brand not found');
    }
    
    return successResponse(brand, 'Brand retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching brand:', error);
    return errorResponse('Failed to retrieve brand', 500);
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
    
    const existingBrand = await prisma.brand.findUnique({ where: { id } });
    if (!existingBrand) {
      return notFoundResponse('Brand not found');
    }
    
    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.code && { code: body.code }),
        ...(body.description && { description: body.description }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      }
    });
    
    return successResponse(updatedBrand, 'Brand updated successfully');
  } catch (error: any) {
    console.error('Error updating brand:', error);
    return errorResponse('Failed to update brand', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN', 'Operational_Officer'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return notFoundResponse('Brand not found');
    }
    
    await prisma.brand.delete({ where: { id } });
    
    return successResponse({ id }, 'Brand deleted successfully');
  } catch (error: any) {
    console.error('Error deleting brand:', error);
    return errorResponse('Failed to delete brand', 500);
  }
});
