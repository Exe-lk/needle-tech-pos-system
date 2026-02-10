import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve detailed information about a specific role (Admin/Manager only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       404:
 *         description: Role not found
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            fullName: true
          },
          take: 10 // Limit users list
        }
      }
    });
    
    if (!role) {
      return notFoundResponse('Role not found');
    }
    
    return successResponse(role, 'Role retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching role:', error);
    return errorResponse('Failed to retrieve role', 500);
  }
});

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   put:
 *     summary: Update role
 *     description: Update role information (Admin only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 */
export const PUT = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return notFoundResponse('Role not found');
    }
    
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    
    const updatedRole = await prisma.role.update({
      where: { id },
      data: updateData
    });
    
    return successResponse(updatedRole, 'Role updated successfully');
  } catch (error: any) {
    console.error('Error updating role:', error);
    return errorResponse('Failed to update role', 500);
  }
});

/**
 * @swagger
 * /api/v1/roles/{id}:
 *   delete:
 *     summary: Delete role
 *     description: Delete a role (Admin only) - Cannot delete if users are assigned
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete role with assigned users
 */
export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: true
      }
    });
    
    if (!role) {
      return notFoundResponse('Role not found');
    }
    
    // Check if any users are assigned to this role
    if (role.users.length > 0) {
      return validationErrorResponse(
        `Cannot delete role. ${role.users.length} user(s) are currently assigned to this role.`,
        {
          users: [`${role.users.length} user(s) assigned`]
        }
      );
    }
    
    await prisma.role.delete({
      where: { id }
    });
    
    return successResponse(null, 'Role deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting role:', error);
    return errorResponse('Failed to delete role', 500);
  }
});
