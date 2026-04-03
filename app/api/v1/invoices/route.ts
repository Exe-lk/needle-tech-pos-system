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
    
    const rentalIdsArray: string[] | undefined = Array.isArray(rentalIds) ? rentalIds.filter(Boolean) : undefined;

    const hasProvidedLineItems = Array.isArray(lineItems) && lineItems.length > 0;
    const hasRentalLink = Boolean(rentalId) || Boolean(rentalIdsArray && rentalIdsArray.length > 0);

    if (!customerId || !type || (!hasProvidedLineItems && !hasRentalLink)) {
      return validationErrorResponse('Missing required fields', {
        customerId: !customerId ? ['Customer ID is required'] : [],
        type: !type ? ['Invoice type is required'] : [],
        lineItems: !hasProvidedLineItems && !hasRentalLink ? ['At least one line item is required'] : [],
      });
    }

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

    const VAT_RATE = 0.18;
    const toValidDateOrNull = (d: unknown): Date | null => {
      if (!d) return null;
      const dt = new Date(d as any);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };
    const computeDiffMonths = (from: Date, to: Date): number => {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(0, 0, 0, 0);
      const diffMs = toDate.getTime() - fromDate.getTime();
      const diffDays = Math.max(1, diffMs / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.ceil(diffDays / 30));
    };
    const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

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

    // If the client didn't provide line items but linked rental(s), derive line items and totals from rental machines.
    // This matches the invoice UI flow where user selects agreements + period and expects backend to generate items.
    let finalLineItems: any[] = hasProvidedLineItems ? lineItems : [];
    let finalSubtotal = typeof subtotal === 'number' ? subtotal : Number(subtotal) || 0;
    let finalVatAmount = typeof vatAmount === 'number' ? vatAmount : Number(vatAmount) || 0;
    let finalGrandTotal = typeof grandTotal === 'number' ? grandTotal : Number(grandTotal) || 0;

    if (!hasProvidedLineItems && hasRentalLink) {
      const idsToFetch = rentalIdsArray && rentalIdsArray.length > 0 ? rentalIdsArray : rentalId ? [rentalId] : [];
      const rentals = await prisma.rental.findMany({
        where: { id: { in: idsToFetch } },
        select: {
          id: true,
          agreementNumber: true,
          startDate: true,
          expectedEndDate: true,
          machines: {
            select: {
              quantity: true,
              dailyRate: true,
              machine: {
                select: {
                  brand: { select: { name: true } },
                  model: { select: { name: true } },
                  type: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      const from = toValidDateOrNull(periodFromDate) ?? (issueDate ? toValidDateOrNull(issueDate) : null) ?? now;
      const to = toValidDateOrNull(periodToDate) ?? (dueDate ? toValidDateOrNull(dueDate) : null) ?? now;
      const months = computeDiffMonths(from, to);

      // Group machines by agreement + brand/model/type so multi-agreement invoices stay readable.
      const categoryMap = new Map<string, { agreementNumber: string; brand: string; model: string; type: string; count: number; monthlyRatePerMachine: number }>();
      for (const r of rentals) {
        const agreementNo = r.agreementNumber ?? '';
        const rms = Array.isArray(r.machines) ? r.machines : [];
        for (const rm of rms) {
          const brand = rm.machine?.brand?.name ?? 'Unknown';
          const model = rm.machine?.model?.name ?? 'Unknown';
          const mtype = rm.machine?.type?.name ?? '';
          const qty = typeof rm.quantity === 'number' ? rm.quantity : Number(rm.quantity) || 1;
          const daily = Number(rm.dailyRate) || 0;
          const monthlyPerMachine = daily * 30;
          const key = `${agreementNo}|${brand}|${model}|${mtype}|${monthlyPerMachine}`;
          if (!categoryMap.has(key)) {
            categoryMap.set(key, { agreementNumber: agreementNo, brand, model, type: mtype, count: 0, monthlyRatePerMachine: monthlyPerMachine });
          }
          categoryMap.get(key)!.count += qty;
        }
      }

      let itemIndex = 0;
      finalLineItems = Array.from(categoryMap.values()).map((cat) => {
        const baseDesc = [cat.brand, cat.model, cat.type].filter(Boolean).join(' ').toUpperCase() || 'Machine';
        const desc = cat.agreementNumber ? `${baseDesc} (AGREEMENT ${cat.agreementNumber})` : baseDesc;
        return {
          description: desc,
          quantity: cat.count,
          unitPrice: round2(cat.monthlyRatePerMachine * months),
          machineId: null,
          brand: cat.brand,
          model: cat.model,
          type: cat.type,
          brandId: null,
          modelId: null,
          machineTypeId: null,
          itemCode: `212WG${String(++itemIndex).padStart(5, '0')}`,
          serialNumber: undefined,
          vatRate: VAT_RATE,
        };
      });

      // Totals derived from line items.
      finalSubtotal = round2(finalLineItems.reduce((sum: number, li: any) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0));
      const shouldApplyVat = taxCategoryFromCustomerType === 'VAT';
      finalVatAmount = shouldApplyVat ? round2(finalSubtotal * VAT_RATE) : 0;
      finalGrandTotal = round2(finalSubtotal + finalVatAmount);

      if (!Array.isArray(finalLineItems) || finalLineItems.length === 0) {
        return validationErrorResponse('Unable to derive line items from rentals', {
          rentalId: rentalId ? ['Selected rental has no machines assigned to invoice'] : [],
          rentalIds: rentalIdsArray ? ['Selected rentals have no machines assigned to invoice'] : [],
        });
      }
    }

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
        lineItems: finalLineItems,
        subtotal: finalSubtotal || 0,
        vatAmount: finalVatAmount || 0,
        grandTotal: finalGrandTotal || 0,
        balance: finalGrandTotal || 0,
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
