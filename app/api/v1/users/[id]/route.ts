import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve detailed information about a specific user (Admin/Manager only)
 *     tags: [Users]
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
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });
    
    if (!user) {
      return notFoundResponse('User not found');
    }
    
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const userData = {
      userId: user.id,
      firstName,
      lastName,
      email: user.email || '',
      phone: user.phone || '',
      username: user.username,
      role: user.role.name,
      isActive: user.status === 'ACTIVE',
      createdDate: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
    
    return successResponse(userData, 'User retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return errorResponse('Failed to retrieve user', 500);
  }
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user information (Admin only)
 *     tags: [Users]
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
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
export const PUT = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, phone, role, isActive } = body;
    
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    });
    
    if (!existingUser) {
      return notFoundResponse('User not found');
    }
    
    const updateData: any = {};
    
    if (firstName !== undefined || lastName !== undefined) {
      const currentName = existingUser.fullName.split(' ');
      const newFirstName = firstName !== undefined ? firstName : (currentName[0] || '');
      const newLastName = lastName !== undefined ? lastName : (currentName.slice(1).join(' ') || '');
      updateData.fullName = `${newFirstName} ${newLastName}`.trim();
    }
    
    if (email !== undefined && email !== existingUser.email) {
      // Update email in Supabase Auth
      try {
        await supabaseAdmin.auth.admin.updateUserById(id, { email });
        updateData.email = email;
      } catch (error: any) {
        console.error('Error updating Supabase email:', error);
        return validationErrorResponse('Failed to update email in authentication system');
      }
    }
    
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) {
      updateData.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }
    
    if (role !== undefined) {
      const roleDoc = await prisma.role.findFirst({
        where: { name: role }
      });
      if (!roleDoc) {
        return validationErrorResponse('Invalid role', {
          role: ['Role not found'],
        });
      }
      updateData.roleId = roleDoc.id;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    });
    
    const nameParts = updatedUser.fullName.split(' ');
    const firstNameFinal = firstName !== undefined ? firstName : nameParts[0] || '';
    const lastNameFinal = lastName !== undefined ? lastName : nameParts.slice(1).join(' ') || '';
    
    const userData = {
      userId: updatedUser.id,
      firstName: firstNameFinal,
      lastName: lastNameFinal,
      email: updatedUser.email || '',
      phone: updatedUser.phone || '',
      username: updatedUser.username,
      role: updatedUser.role.name,
      isActive: updatedUser.status === 'ACTIVE',
      createdDate: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
    
    return successResponse(userData, 'User updated successfully');
  } catch (error: any) {
    console.error('Error updating user:', error);
    return errorResponse('Failed to update user', 500);
  }
});

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Soft delete a user by setting status to INACTIVE (Admin only)
 *     tags: [Users]
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
 *         description: User deleted successfully
 */
export const DELETE = withAuthAndRole(['ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) {
      return notFoundResponse('User not found');
    }
    
    // Soft delete - set status to INACTIVE
    await prisma.user.update({
      where: { id },
      data: { 
        status: 'INACTIVE'
      }
    });
    
    return successResponse(null, 'User deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return errorResponse('Failed to delete user', 500);
  }
});
