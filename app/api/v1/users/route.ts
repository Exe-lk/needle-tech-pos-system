import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject } from '@/lib/utils';
import { withAuth, withAuthAndRole, hashPassword } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// Only ADMIN and MANAGER can view users list
export const GET = withAuthAndRole(['ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const roleFilter = searchParams.get('role');
    const isActiveFilter = searchParams.get('isActive');
    
    // Build filter
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (roleFilter) {
      // Need to lookup role by name
      const rolesCollection = db.collection('roles');
      const role = await rolesCollection.findOne({ name: roleFilter });
      if (role) {
        filter.roleId = role._id;
      }
    }
    
    if (isActiveFilter !== null) {
      filter.status = isActiveFilter === 'true' ? 'ACTIVE' : { $ne: 'ACTIVE' };
    }
    
    // Get total count
    const totalItems = await db.collection('users').countDocuments(filter);
    
    // Get users with pagination
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    const users = await db
      .collection('users')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Populate role information
    const rolesCollection = db.collection('roles');
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const role = user.roleId 
          ? await rolesCollection.findOne({ _id: user.roleId })
          : null;
        
        return {
          userId: user._id.toString(),
          firstName: user.fullName?.split(' ')[0] || '',
          lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || '',
          username: user.username || '',
          role: role?.name || '',
          isActive: user.status === 'ACTIVE',
          createdDate: user.createdAt || user._id.getTimestamp(),
        };
      })
    );
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      usersWithRoles,
      pagination,
      'Users retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(roleFilter && { role: roleFilter }),
        ...(isActiveFilter !== null && { isActive: isActiveFilter === 'true' }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return errorResponse('Failed to retrieve users', 500);
  }
});

// Only ADMIN can create new users
export const POST = withAuthAndRole(['ADMIN'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, username, password, role } = body;
    
    // Validation
    if (!firstName || !lastName || !username || !password || !role) {
      return validationErrorResponse('Missing required fields', {
        firstName: !firstName ? ['First name is required'] : [],
        lastName: !lastName ? ['Last name is required'] : [],
        username: !username ? ['Username is required'] : [],
        password: !password ? ['Password is required'] : [],
        role: !role ? ['Role is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return validationErrorResponse('Username already exists', {
        username: ['Username already exists'],
      });
    }
    
    // Find role by name
    const rolesCollection = db.collection('roles');
    const roleDoc = await rolesCollection.findOne({ name: role });
    if (!roleDoc) {
      return validationErrorResponse('Invalid role', {
        role: ['Role not found'],
      });
    }
    
    // Hash password using bcrypt
    const passwordHash = await hashPassword(password);
    
    const fullName = `${firstName} ${lastName}`;
    const now = new Date();
    
    const newUser = {
      username,
      passwordHash,
      roleId: roleDoc._id,
      fullName,
      email: email || '',
      phone: phone || '',
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('users').insertOne(newUser);
    
    const createdUser = {
      userId: result.insertedId.toString(),
      firstName,
      lastName,
      email: email || '',
      phone: phone || '',
      username,
      role,
      isActive: true,
      createdDate: now.toISOString(),
    };
    
    return successResponse(createdUser, 'User created successfully', 201);
  } catch (error: any) {
    console.error('Error creating user:', error);
    return errorResponse('Failed to create user', 500);
  }
});
