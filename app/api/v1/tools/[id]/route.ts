import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @swagger
 * /api/v1/tools/{id}:
 *   get:
 *     summary: Get tool by ID
 *     tags: [Tools]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const tool = await prisma.tool.findUnique({
      where: { id },
    });
    
    if (!tool || tool.isDeleted) {
      return notFoundResponse('Tool not found');
    }
    
    return successResponse(tool, 'Tool retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching tool:', error);
    return errorResponse('Failed to retrieve tool', 500);
  }
});

/**
 * @swagger
 * /api/v1/tools/{id}:
 *   put:
 *     summary: Update tool
 *     tags: [Tools]
 *     security:
 *       - bearerAuth: []
 */
export const PUT = withAuthAndRole(['ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingTool = await prisma.tool.findUnique({ where: { id } });
    if (!existingTool || existingTool.isDeleted) {
      return notFoundResponse('Tool not found');
    }
    
    // Validate status if provided
    if (body.status) {
      const validStatuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'];
      if (!validStatuses.includes(body.status)) {
        return validationErrorResponse('Invalid status', {
          status: [`Status must be one of: ${validStatuses.join(', ')}`],
        });
      }
    }
    
    // Validate condition if provided
    if (body.condition) {
      const validConditions = ['NEW', 'GOOD', 'FAIR', 'POOR'];
      if (!validConditions.includes(body.condition)) {
        return validationErrorResponse('Invalid condition', {
          condition: [`Condition must be one of: ${validConditions.join(', ')}`],
        });
      }
    }
    
    // Validate quantity if provided
    if (body.quantity !== undefined && body.quantity < 1) {
      return validationErrorResponse('Invalid quantity', {
        quantity: ['Quantity must be at least 1'],
      });
    }
    
    const updateData: any = {};
    
    if (body.toolName !== undefined) updateData.toolName = body.toolName.trim();
    if (body.toolType !== undefined) updateData.toolType = body.toolType.trim();
    if (body.brand !== undefined) updateData.brand = body.brand?.trim() || null;
    if (body.model !== undefined) updateData.model = body.model?.trim() || null;
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber?.trim() || null;
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity);
    if (body.unitPrice !== undefined) updateData.unitPrice = body.unitPrice ? new Decimal(body.unitPrice) : null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.location !== undefined) updateData.location = body.location.trim();
    if (body.purchaseDate !== undefined) updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    if (body.toolPhotoUrls !== undefined) {
      updateData.toolPhotoUrls = Array.isArray(body.toolPhotoUrls) 
        ? body.toolPhotoUrls.filter((url: any) => typeof url === 'string') 
        : [];
    }
    
    const updatedTool = await prisma.tool.update({
      where: { id },
      data: updateData,
    });
    
    return successResponse(updatedTool, 'Tool updated successfully');
  } catch (error: any) {
    console.error('Error updating tool:', error);
    
    if (error.code === 'P2002') {
      return validationErrorResponse('Duplicate entry', {
        [error.meta?.target?.[0] || 'field']: ['This value already exists'],
      });
    }
    
    return errorResponse('Failed to update tool', 500);
  }
});

/**
 * @swagger
 * /api/v1/tools/{id}:
 *   delete:
 *     summary: Delete tool (soft delete)
 *     tags: [Tools]
 *     security:
 *       - bearerAuth: []
 */
export const DELETE = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const tool = await prisma.tool.findUnique({ where: { id } });
    if (!tool || tool.isDeleted) {
      return notFoundResponse('Tool not found');
    }
    
    // Soft delete
    await prisma.tool.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    
    return successResponse({ id }, 'Tool deleted successfully');
  } catch (error: any) {
    console.error('Error deleting tool:', error);
    return errorResponse('Failed to delete tool', 500);
  }
});
