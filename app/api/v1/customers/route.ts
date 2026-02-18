import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndPermission } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers
 *     description: Retrieve a paginated list of customers with filtering and search using Supabase auth
 *     tags: [Customers]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [GARMENT_FACTORY, INDIVIDUAL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 */
export const GET = withAuthAndPermission(['customers:view', 'management:*', '*'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (typeFilter) {
      where.type = typeFilter;
    }
    
    if (statusFilter) {
      where.status = statusFilter;
    }
    
    const totalItems = await prisma.customer.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      customers,
      pagination,
      'Customers retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(typeFilter && { type: typeFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return errorResponse('Failed to retrieve customers', 500);
  }
});

/**
 * @swagger
 * /api/v1/customers:
 *   post:
 *     summary: Create a new customer
 *     description: Create a new customer with Supabase auth (Admin/Manager only)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - type
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [GARMENT_FACTORY, INDIVIDUAL]
 *               name:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               phones:
 *                 type: array
 *                 items:
 *                   type: string
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Validation error
 */
export const POST = withAuthAndPermission(['customers:create', 'management:*', '*'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { code, type, name, contactPerson, phones = [], emails = [] } = body;
    
    if (!code || !type || !name) {
      return validationErrorResponse('Missing required fields', {
        code: !code ? ['Code is required'] : [],
        type: !type ? ['Type is required'] : [],
        name: !name ? ['Name is required'] : [],
      });
    }
    
    // Check if code already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { code },
    });
    
    if (existingCustomer) {
      return validationErrorResponse('Customer code already exists', {
        code: ['Code already exists'],
      });
    }
    
    const newCustomer = await prisma.customer.create({
      data: {
        code,
        type,
        name,
        contactPerson: contactPerson || '',
        phones: phones || [],
        emails: emails || [],
        status: 'ACTIVE',
      },
    });
    
    return successResponse(newCustomer, 'Customer created successfully', 201);
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return errorResponse('Failed to create customer', 500);
  }
});
