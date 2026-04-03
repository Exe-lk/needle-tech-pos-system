import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     summary: Get all invoices
 *     description: Retrieve paginated list of invoices with Supabase auth
 *     tags: [Invoices]
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const customerIdFilter = searchParams.get('customerId');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter;
    if (customerIdFilter) where.customerId = customerIdFilter;
    
    const totalItems = await prisma.invoice.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const invoices = await prisma.invoice.findMany(({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: {
        customer: true,
        rental: {
          include: {
            purchaseOrder: {
              select: {
                id: true,
                requestNumber: true,
              },
            },
          },
        },
        invoiceRentals: {
          include: {
            rental: {
              select: {
                id: true,
                agreementNumber: true,
                startDate: true,
                expectedEndDate: true,
                status: true,
                purchaseOrder: {
                  select: {
                    id: true,
                    requestNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    } as any));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      invoices,
      pagination,
      'Invoices retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return errorResponse('Failed to retrieve invoices', 500);
  }
});

/**
 * @swagger
 * /api/v1/invoices:
 *   post:
 *     summary: Create a new invoice
 *     description: Create a new invoice with Supabase auth (Admin/Manager only)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - rentalId
 *             properties:
 *               customerId:
 *                 type: string
 *               rentalId:
 *                 type: string
 *               totalAmount:
 *                 type: number
 */
export const POST = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'],
  async (request: NextRequest, auth: AuthUser) => {
  try {
    const body = await request.json();
    const { customerId, rentalId, rentalIds, type, taxCategory, lineItems, issueDate, dueDate, subtotal, vatAmount, grandTotal, periodFrom, periodTo } = body;
    
    if (!customerId || !type || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        type: !type ? ['Invoice type is required'] : [],
        lineItems: !lineItems || lineItems.length === 0 ? ['At least one line item is required'] : [],
      });
    }

    const rentalIdsArray: string[] | undefined = Array.isArray(rentalIds) ? rentalIds.filter(Boolean) : undefined;
    if (Array.isArray(rentalIds) && (!rentalIdsArray || rentalIdsArray.length === 0)) {
      return validationErrorResponse('Invalid rentalIds', {
        rentalIds: ['At least one rental ID is required when rentalIds is provided'],
      });
    }
    
    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return validationErrorResponse('Customer not found', {
        customerId: ['Customer not found'],
      });
    }

    // For rental invoices, tax category must follow customer type:
    // - business customers => VAT
    // - otherwise => NON_VAT
    // Current schema uses CustomerType enum; treat any non-INDIVIDUAL as "business".
    const taxCategoryFromCustomerType: 'VAT' | 'NON_VAT' =
      customer.type !== 'INDIVIDUAL' ? 'VAT' : 'NON_VAT';
    
    const validateOverlap = (r: { startDate: Date; expectedEndDate: Date | null }, from: Date, to: Date) => {
      const startOk = r.startDate <= to;
      const endOk = !r.expectedEndDate || r.expectedEndDate >= from;
      return startOk && endOk;
    };

    // Verify rental(s) if provided
    const periodFromDate = periodFrom ? new Date(periodFrom) : issueDate ? new Date(issueDate) : null;
    const periodToDate = periodTo ? new Date(periodTo) : dueDate ? new Date(dueDate) : null;

    if (rentalId && rentalIdsArray) {
      return validationErrorResponse('Invalid payload', {
        rentalId: ['Provide either rentalId or rentalIds, not both'],
        rentalIds: ['Provide either rentalId or rentalIds, not both'],
      });
    }

    if (rentalId) {
      const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
      if (!rental) {
        return validationErrorResponse('Rental not found', {
          rentalId: ['Rental not found'],
        });
      }
      if (rental.customerId !== customerId) {
        return validationErrorResponse('Rental does not belong to customer', {
          rentalId: ['Rental does not belong to provided customer'],
        });
      }
      if (rental.status !== 'ACTIVE') {
        return validationErrorResponse('Rental is not active', {
          rentalId: ['Rental must be ACTIVE to be invoiced in this flow'],
        });
      }
      if (periodFromDate && periodToDate && !validateOverlap({ startDate: rental.startDate, expectedEndDate: rental.expectedEndDate }, periodFromDate, periodToDate)) {
        return validationErrorResponse('Rental is outside invoice period', {
          rentalId: ['Rental does not overlap the invoice period'],
        });
      }
    }

    if (rentalIdsArray) {
      const rentalsForLinking = await prisma.rental.findMany({
        where: { id: { in: rentalIdsArray } },
        select: { id: true, startDate: true, expectedEndDate: true, customerId: true, status: true, agreementNumber: true },
      });
      const foundIds = new Set(rentalsForLinking.map(r => r.id));
      const missing = rentalIdsArray.filter(id => !foundIds.has(id));
      if (missing.length > 0) {
        return validationErrorResponse('Some rentals were not found', {
          rentalIds: [`Missing rentals: ${missing.join(', ')}`],
        });
      }
      const wrongCustomer = rentalsForLinking.filter(r => r.customerId !== customerId);
      if (wrongCustomer.length > 0) {
        return validationErrorResponse('Some rentals do not belong to customer', {
          rentalIds: wrongCustomer.map(r => `Rental ${r.agreementNumber} does not belong to provided customer`),
        });
      }
      const notActive = rentalsForLinking.filter(r => r.status !== 'ACTIVE');
      if (notActive.length > 0) {
        return validationErrorResponse('Some rentals are not active', {
          rentalIds: notActive.map(r => `Rental ${r.agreementNumber} is not ACTIVE`),
        });
      }
      if (periodFromDate && periodToDate) {
        const notOverlapping = rentalsForLinking.filter(r => !validateOverlap({ startDate: r.startDate, expectedEndDate: r.expectedEndDate }, periodFromDate, periodToDate));
        if (notOverlapping.length > 0) {
          return validationErrorResponse('Some rentals are outside invoice period', {
            rentalIds: notOverlapping.map(r => `Rental ${r.agreementNumber} does not overlap the invoice period`),
          });
        }
      }
    }
    
    const now = new Date();
    const invoiceNumber = `INV-${Date.now()}`;
    const userId = auth.id;

    const invoiceRentalsCreate =
      rentalIdsArray
        ? {
            invoiceRentals: {
              createMany: {
                data: rentalIdsArray.map((id: string) => ({ rentalId: id })),
                skipDuplicates: true,
              },
            },
          }
        : rentalId
          ? {
              invoiceRentals: {
                createMany: {
                  data: [{ rentalId }],
                  skipDuplicates: true,
                },
              },
            }
          : {};
    
    const newInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        rentalId: rentalId || null,
        type,
        taxCategory:
          // Always enforce rule for rental invoices (including multi-rental invoice flow).
          (type === 'RENTAL' || rentalId || rentalIdsArray)
            ? taxCategoryFromCustomerType
            : (taxCategory === 'VAT' || taxCategory === 'NON_VAT')
              ? taxCategory
              : (customer.taxCategory as 'VAT' | 'NON_VAT') || taxCategoryFromCustomerType,
        status: 'DRAFT',
        issueDate: issueDate ? new Date(issueDate) : now,
        dueDate: dueDate ? new Date(dueDate) : now,
        lineItems,
        subtotal: subtotal || 0,
        vatAmount: vatAmount || 0,
        grandTotal: grandTotal || 0,
        balance: grandTotal || 0,
        createdByUserId: userId,
        ...invoiceRentalsCreate,
      },
      include: {
        customer: true,
        rental: {
          include: {
            purchaseOrder: {
              select: {
                id: true,
                requestNumber: true,
              },
            },
          },
        },
        invoiceRentals: {
          include: {
            rental: {
              select: {
                id: true,
                agreementNumber: true,
                startDate: true,
                expectedEndDate: true,
                status: true,
                purchaseOrder: {
                  select: {
                    id: true,
                    requestNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    } as any);
    
    return successResponse(newInvoice, 'Invoice created successfully', 201);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return errorResponse('Failed to create invoice', 500);
  }
});
