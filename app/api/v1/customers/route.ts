import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

/**
 * @swagger
 * /api/v1/customers:
 *   get:
 *     summary: Get all customers
 *     description: Retrieve a paginated list of customers with optional filtering and search
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, code, or contact person
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [INDIVIDUAL, COMPANY]
 *         description: Filter by customer type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PaginatedResponse'
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'contactPerson': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (typeFilter) {
      filter.type = typeFilter;
    }
    
    if (statusFilter) {
      filter.status = statusFilter;
    }
    
    const totalItems = await db.collection('customers').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const customers = await db
      .collection('customers')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedCustomers = customers.map(customer => sanitizeObject(customer));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedCustomers,
      pagination,
      'Customers retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
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
 *     description: Create a new customer with required information
 *     tags: [Customers]
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
 *                 description: Unique customer code
 *               type:
 *                 type: string
 *                 enum: [INDIVIDUAL, COMPANY]
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
 *               billingAddress:
 *                 type: object
 *               shippingAddress:
 *                 type: object
 *               taxProfile:
 *                 type: object
 *                 properties:
 *                   vatApplicable:
 *                     type: boolean
 *                   vatRegistrationNumber:
 *                     type: string
 *                   taxCategory:
 *                     type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error - missing required fields or duplicate code
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { code, type, name, contactPerson, phones, emails, billingAddress, shippingAddress, taxProfile } = body;
    
    if (!code || !type || !name) {
      return validationErrorResponse('Missing required fields', {
        code: !code ? ['Code is required'] : [],
        type: !type ? ['Type is required'] : [],
        name: !name ? ['Name is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Check if code already exists
    const existingCustomer = await db.collection('customers').findOne({ code });
    if (existingCustomer) {
      return validationErrorResponse('Customer code already exists', {
        code: ['Code already exists'],
      });
    }
    
    const now = new Date();
    const newCustomer = {
      code,
      type,
      name,
      contactPerson: contactPerson || '',
      phones: phones || [],
      emails: emails || [],
      billingAddress: billingAddress || {},
      shippingAddress: shippingAddress || null,
      taxProfile: {
        vatApplicable: taxProfile?.vatApplicable || false,
        vatRegistrationNumber: taxProfile?.vatRegistrationNumber || null,
        taxCategory: taxProfile?.taxCategory || (taxProfile?.vatApplicable ? 'VAT' : 'NON_VAT'),
      },
      financials: {
        creditLimit: 0,
        paymentTermsDays: 0,
        currentBalance: 0,
        oldestOutstandingInvoiceDate: null,
        isCreditLocked: false,
        creditLockReason: null,
      },
      alertPreferences: {
        channels: ['EMAIL'],
        language: 'en',
      },
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('customers').insertOne(newCustomer);
    const createdCustomer = await db.collection('customers').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdCustomer), 'Customer created successfully', 201);
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return errorResponse('Failed to create customer', 500);
  }
});
