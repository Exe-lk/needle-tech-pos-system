import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   get:
 *     summary: Get machine by ID
 *     tags: [Machines]
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
    
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: { brand: true, model: true, machineType: true }
    });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    return successResponse(machine, 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine:', error);
    return errorResponse('Failed to retrieve machine', 500);
  }
});

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   put:
 *     summary: Update machine
 *     tags: [Machines]
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
    
    const existingMachine = await prisma.machine.findUnique({ where: { id } });
    if (!existingMachine) {
      return notFoundResponse('Machine not found');
    }
    
    const updatedMachine = await prisma.machine.update({
      where: { id },
      data: {
        ...(body.brandId && { brandId: body.brandId }),
        ...(body.modelId && { modelId: body.modelId }),
        ...(body.machineTypeId && { machineTypeId: body.machineTypeId }),
        ...(body.serialNumber && { serialNumber: body.serialNumber }),
        ...(body.status && { status: body.status }),
        ...(body.currentLocation && { currentLocation: body.currentLocation }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: { brand: true, model: true, machineType: true }
    });
    
    return successResponse(updatedMachine, 'Machine updated successfully');
  } catch (error: any) {
    console.error('Error updating machine:', error);
    return errorResponse('Failed to update machine', 500);
  }
});

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   delete:
 *     summary: Delete machine
 *     tags: [Machines]
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
    
    const machine = await prisma.machine.findUnique({ where: { id } });
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    await prisma.machine.delete({ where: { id } });
    
    return successResponse({ id }, 'Machine deleted successfully');
  } catch (error: any) {
    console.error('Error deleting machine:', error);
    return errorResponse('Failed to delete machine', 500);
  }
});
