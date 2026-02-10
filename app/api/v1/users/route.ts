import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { registerUser } from '@/lib/auth-supabase';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get list of users
 *     description: Retrieve paginated list of users with filtering and sorting (Admin/Manager only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (roleFilter) {
      const role = await prisma.role.findFirst({
        where: { name: roleFilter }
      });
      if (role) {
        where.roleId = role.id;
      }
    }
    
    if (statusFilter) {
      where.status = statusFilter;
    }
    
    // Get total count
    const totalItems = await prisma.user.count({ where });
    
    // Get users with pagination
    const skip = (page - 1) * limit;
    const users = await prisma.user.findMany({
      where,
      include: {
        role: true
      },
      orderBy: {
        [sortBy]: sortOrder
      },
      skip,
      take: limit
    });
    
    // Format response
    const formattedUsers = users.map(user => ({
      userId: user.id,
      firstName: user.fullName.split(' ')[0] || '',
      lastName: user.fullName.split(' ').slice(1).join(' ') || '',
      email: user.email || '',
      phone: user.phone || '',
      username: user.username,
      role: user.role.name,
      isActive: user.status === 'ACTIVE',
      createdDate: user.createdAt,
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      formattedUsers,
      pagination,
      'Users retrieved successfully',
      { sortBy, sortOrder: sortOrder === 'asc' ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return errorResponse('Failed to retrieve users', 500);
  }
});

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create new user
 *     description: Create a new user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *               - firstName
 *               - lastName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
export const POST = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, username, password, role } = body;
    
    // Validation
    if (!firstName || !lastName || !username || !password || !role || !email) {
      return validationErrorResponse('Missing required fields', {
        firstName: !firstName ? ['First name is required'] : [],
        lastName: !lastName ? ['Last name is required'] : [],
        email: !email ? ['Email is required'] : [],
        username: !username ? ['Username is required'] : [],
        password: !password ? ['Password is required'] : [],
        role: !role ? ['Role is required'] : [],
      });
    }
    
    // Find role by name
    const roleDoc = await prisma.role.findFirst({
      where: { name: role }
    });
    
    if (!roleDoc) {
      return validationErrorResponse('Invalid role', {
        role: ['Role not found'],
      });
    }
    
    // Register user via Supabase
    const fullName = `${firstName} ${lastName}`;
    const result = await registerUser({
      email,
      password,
      username,
      fullName,
      roleId: roleDoc.id,
      phone
    });
    
    const createdUser = {
      userId: result.user.id,
      firstName,
      lastName,
      email,
      phone: phone || '',
      username,
      role,
      isActive: true,
      createdDate: new Date().toISOString(),
    };
    
    return successResponse(createdUser, 'User created successfully', 201);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      return validationErrorResponse(error.message);
    }
    return errorResponse('Failed to create user', 500);
  }
});
