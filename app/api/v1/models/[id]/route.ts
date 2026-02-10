import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const model = await prisma.model.findUnique({
      where: { id },
      include: { brand: true }
    });
    
    if (!model) {
      return notFoundResponse('Model not found');
    }
    
    return successResponse(model, 'Model retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching model:', error);
    return errorResponse('Failed to retrieve model', 500);
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
    
    const existingModel = await prisma.model.findUnique({ where: { id } });
    if (!existingModel) {
      return notFoundResponse('Model not found');
    }
    
    if (body.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: body.brandId } });
      if (!brand) {
        return validationErrorResponse('Invalid brand', {
          brandId: ['Brand not found'],
        });
      }
    }
    
    const updatedModel = await prisma.model.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.code && { code: body.code }),
        ...(body.description && { description: body.description }),
        ...(body.brandId && { brandId: body.brandId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { brand: true }
    });
    
    return successResponse(updatedModel, 'Model updated successfully');
  } catch (error: any) {
    console.error('Error updating model:', error);
    return errorResponse('Failed to update model', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const model = await prisma.model.findUnique({ where: { id } });
    if (!model) {
      return notFoundResponse('Model not found');
    }
    
    await prisma.model.delete({ where: { id } });
    
    return successResponse({ id }, 'Model deleted successfully');
  } catch (error: any) {
    console.error('Error deleting model:', error);
    return errorResponse('Failed to delete model', 500);
  }
});
