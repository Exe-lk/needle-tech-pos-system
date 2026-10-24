import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import { isDatabaseUnavailable } from '@/lib/db-errors';
import prisma from '@/lib/prisma';
import {
  round2,
  sumMonthFactors,
  type RentalBillingInput,
  type RentalBillingMode,
} from '@/lib/invoice-month-billing';

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

    // Backwards-compat normalization (response-only):
    // Older invoices may have been saved with NON_VAT taxCategory but VAT-inclusive totals.
    // Do not mutate DB here; only correct the payload to match taxCategory.
    const normalizedInvoices = invoices.map((inv: any) => {
      if (inv?.taxCategory === 'NON_VAT') {
        const sub = Number(inv.subtotal) || 0;
        return {
          ...inv,
          vatAmount: 0,
          grandTotal: sub,
          balance: typeof inv.balance === 'number' ? Math.min(Number(inv.balance) || 0, sub) : sub,
          lineItems: Array.isArray(inv.lineItems)
            ? inv.lineItems.map((li: any) => ({ ...li, vatRate: 0 }))
            : inv.lineItems,
        };
      }
      return inv;
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      normalizedInvoices,
      pagination,
      'Invoices retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(customerIdFilter && { customerId: customerIdFilter }),
      }
    );
  } catch (error: unknown) {
    console.error('Error fetching invoices:', error);
    if (isDatabaseUnavailable(error)) {
      return errorResponse('Database temporarily unavailable. Please try again.', 503);
    }
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
    const {
      customerId,
      rentalId,
      rentalIds,
      rentalBilling,
      type,
      taxCategory,
      lineItems,
      issueDate,
      dueDate,
      subtotal,
      vatAmount,
      grandTotal,
      periodFrom,
      periodTo,
      useProvidedMachineLines,
    } = body;

    const rentalIdsArray: string[] | undefined = Array.isArray(rentalIds) ? rentalIds.filter(Boolean) : undefined;

    const hasProvidedLineItems = Array.isArray(lineItems) && lineItems.length > 0;
    const hasRentalLink = Boolean(rentalId) || Boolean(rentalIdsArray && rentalIdsArray.length > 0);
    const isToolLine = (li: any): boolean => {
      const code = String(li?.itemCode ?? '');
      return li?.kind === 'TOOL' || code.startsWith('212TL');
    };
    const providedMachineLines = hasProvidedLineItems
      ? (lineItems as any[]).filter((li) => !isToolLine(li))
      : [];
    const useClientMachineLines =
      Boolean(useProvidedMachineLines) && hasRentalLink && providedMachineLines.length > 0;

    const parseRentalBilling = (raw: unknown): RentalBillingInput[] | null => {
      if (!Array.isArray(raw) || raw.length === 0) return null;
      const parsed: RentalBillingInput[] = [];
      for (const entry of raw) {
        if (!entry || typeof entry !== 'object') return null;
        const rentalIdEntry = String((entry as any).rentalId || '');
        const mode = String((entry as any).mode || '') as RentalBillingMode;
        if (!rentalIdEntry || (mode !== 'FULL_FEE_ALL_MONTHS' && mode !== 'SELECTED_MONTHS')) {
          return null;
        }
        const monthsRaw = Array.isArray((entry as any).months) ? (entry as any).months : undefined;
        const months = monthsRaw
          ?.map((m: any) => ({
            periodFrom: String(m?.periodFrom || '').slice(0, 10),
            periodTo: String(m?.periodTo || '').slice(0, 10),
          }))
          .filter((m: { periodFrom: string; periodTo: string }) => m.periodFrom && m.periodTo);
        if (mode === 'SELECTED_MONTHS' && (!months || months.length === 0)) {
          return null;
        }
        parsed.push({ rentalId: rentalIdEntry, mode, months });
      }
      return parsed;
    };

    const rentalBillingParsed = parseRentalBilling(rentalBilling);
    const hasRentalBilling = Boolean(rentalBillingParsed && rentalBillingParsed.length > 0);

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

    if (rentalBilling != null && !hasRentalBilling) {
      return validationErrorResponse('Invalid rentalBilling', {
        rentalBilling: [
          'Each entry needs rentalId, mode (FULL_FEE_ALL_MONTHS | SELECTED_MONTHS), and months when mode is SELECTED_MONTHS',
        ],
      });
    }

    if (Boolean(useProvidedMachineLines) && hasRentalLink && providedMachineLines.length === 0) {
      return validationErrorResponse('Machine line items are required', {
        lineItems: ['Provide at least one machine line when useProvidedMachineLines is true'],
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

    // Verify rental(s) if provided
    const periodFromDate = periodFrom ? new Date(periodFrom) : issueDate ? new Date(issueDate) : null;
    const periodToDate = periodTo ? new Date(periodTo) : dueDate ? new Date(dueDate) : null;

    if (rentalId && rentalIdsArray) {
      return validationErrorResponse('Invalid payload', {
        rentalId: ['Provide either rentalId or rentalIds, not both'],
        rentalIds: ['Provide either rentalId or rentalIds, not both'],
      });
    }

    const linkedRentalIdsForBilling =
      rentalIdsArray && rentalIdsArray.length > 0 ? rentalIdsArray : rentalId ? [rentalId] : [];

    if (hasRentalBilling) {
      const billingIds = rentalBillingParsed!.map((b) => b.rentalId);
      const billingSet = new Set(billingIds);
      const linkSet = new Set(linkedRentalIdsForBilling);
      if (billingIds.length !== linkSet.size || [...billingSet].some((id) => !linkSet.has(id))) {
        return validationErrorResponse('rentalBilling must match rentalIds', {
          rentalBilling: ['rentalBilling rental IDs must be the same set as rentalIds / rentalId'],
        });
      }
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
      // Period overlap is skipped when rentalBilling drives the billed windows.
      if (
        !hasRentalBilling &&
        periodFromDate &&
        periodToDate &&
        !validateOverlap(
          { startDate: rental.startDate, expectedEndDate: rental.expectedEndDate },
          periodFromDate,
          periodToDate
        )
      ) {
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
      const foundIds = new Set(rentalsForLinking.map((r) => r.id));
      const missing = rentalIdsArray.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return validationErrorResponse('Some rentals were not found', {
          rentalIds: [`Missing rentals: ${missing.join(', ')}`],
        });
      }
      const wrongCustomer = rentalsForLinking.filter((r) => r.customerId !== customerId);
      if (wrongCustomer.length > 0) {
        return validationErrorResponse('Some rentals do not belong to customer', {
          rentalIds: wrongCustomer.map((r) => `Rental ${r.agreementNumber} does not belong to provided customer`),
        });
      }
      const notActive = rentalsForLinking.filter((r) => r.status !== 'ACTIVE');
      if (notActive.length > 0) {
        return validationErrorResponse('Some rentals are not active', {
          rentalIds: notActive.map((r) => `Rental ${r.agreementNumber} is not ACTIVE`),
        });
      }
      if (!hasRentalBilling && periodFromDate && periodToDate) {
        const notOverlapping = rentalsForLinking.filter(
          (r) =>
            !validateOverlap(
              { startDate: r.startDate, expectedEndDate: r.expectedEndDate },
              periodFromDate,
              periodToDate
            )
        );
        if (notOverlapping.length > 0) {
          return validationErrorResponse('Some rentals are outside invoice period', {
            rentalIds: notOverlapping.map((r) => `Rental ${r.agreementNumber} does not overlap the invoice period`),
          });
        }
      }
    }

    const now = new Date();
    const invoiceNumber = `INV-${Date.now()}`;
    const userId = auth.id;

    // Line items:
    // - Default: rental-linked machine lines are derived from `rental_machines.dailyRate`.
    // - Opt-in: when useProvidedMachineLines is true, persist client machine lines (Review edits).
    // - When rentalBilling is provided, unitPrice = monthlyRate * sum of month factors (full fee or prorated).
    // - Clients may still send additional non-machine items (e.g. tools). Preserve those when not deriving tools from DB.
    let finalLineItems: any[] = hasProvidedLineItems ? lineItems : [];
    let finalSubtotal = typeof subtotal === 'number' ? subtotal : Number(subtotal) || 0;
    let finalVatAmount = typeof vatAmount === 'number' ? vatAmount : Number(vatAmount) || 0;
    let finalGrandTotal = typeof grandTotal === 'number' ? grandTotal : Number(grandTotal) || 0;

    if (hasRentalLink) {
      const idsToFetch = linkedRentalIdsForBilling;
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
                  serialNumber: true,
                  monthlyRentalFee: true,
                },
              },
            },
          },
          tools: {
            select: {
              quantity: true,
              unitPrice: true,
              tool: {
                select: {
                  toolName: true,
                  toolType: true,
                },
              },
            },
          },
        },
      });

      const billingByRentalId = new Map<string, RentalBillingInput>(
        (rentalBillingParsed ?? []).map((b) => [b.rentalId, b])
      );

      const getMonthFactorForRental = (r: {
        id: string;
        startDate: Date;
        expectedEndDate: Date | null;
      }): number => {
        const billing = billingByRentalId.get(r.id);
        if (!billing) {
          // Legacy one-month invoice (no rentalBilling)
          return 1;
        }
        const factor = sumMonthFactors(r.startDate, r.expectedEndDate, billing, now);
        return factor > 0 ? factor : 0;
      };

      if (hasRentalBilling) {
        const emptyMonths = rentals.filter((r) => getMonthFactorForRental(r) <= 0);
        if (emptyMonths.length > 0) {
          return validationErrorResponse('No billable months for some rentals', {
            rentalBilling: emptyMonths.map(
              (r) => `Rental ${r.agreementNumber} has no billable months for the selected mode`
            ),
          });
        }
      }

      // Preserve tool line items provided by the client only when we are not deriving tools from rentals.
      const preservedToolLines =
        !hasRentalBilling && Array.isArray(finalLineItems)
          ? finalLineItems.filter((li: any) => isToolLine(li))
          : [];

      let machineLines: any[] = [];

      if (useClientMachineLines) {
        const allowedSerials = new Set(
          rentals.flatMap((r) =>
            (Array.isArray(r.machines) ? r.machines : [])
              .map((rm) => String(rm.machine?.serialNumber || '').trim())
              .filter(Boolean)
          )
        );
        const allowedRentalIds = new Set(rentals.map((r) => r.id));
        const invalid: string[] = [];

        providedMachineLines.forEach((li: any, index: number) => {
          const qty = Number(li?.quantity) || 0;
          const unitPrice = Number(li?.unitPrice);
          if (qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
            invalid.push(`Line ${index + 1} needs quantity > 0 and a non-negative unitPrice`);
          }
          const serial = String(li?.serialNumber || '').trim();
          if (serial && !allowedSerials.has(serial)) {
            invalid.push(`Serial ${serial} is not on the selected agreements`);
          }
          const lineRentalId = String(li?.rentalId || '');
          if (lineRentalId && !allowedRentalIds.has(lineRentalId)) {
            invalid.push(`Line ${index + 1} rentalId is not linked to this invoice`);
          }
        });

        if (invalid.length > 0) {
          return validationErrorResponse('Invalid machine line items', {
            lineItems: invalid,
          });
        }

        machineLines = providedMachineLines.map((li: any, index: number) => {
          const monthlyRate =
            li?.monthlyRate != null && Number.isFinite(Number(li.monthlyRate))
              ? round2(Number(li.monthlyRate))
              : undefined;
          const rentalDays =
            li?.rentalDays != null && Number.isFinite(Number(li.rentalDays))
              ? Number(li.rentalDays)
              : undefined;
          return {
            description: String(li?.description || 'MACHINE'),
            quantity: Number(li?.quantity) || 1,
            unitPrice: round2(Number(li?.unitPrice) || 0),
            monthlyRate,
            rentalDays,
            machineId: li?.machineId ?? null,
            brand: li?.brand || '',
            model: li?.model || '',
            type: li?.type || '',
            brandId: null,
            modelId: null,
            machineTypeId: null,
            itemCode: li?.itemCode || `212WG${String(index + 1).padStart(5, '0')}`,
            serialNumber: String(li?.serialNumber || '').trim() || undefined,
            rentalId: li?.rentalId || undefined,
            vatRate: VAT_RATE,
            kind: 'MACHINE',
          };
        });
      } else {
        // Group machines by agreement + brand/model/type + base monthly rate.
        const categoryMap = new Map<
          string,
          {
            agreementNumber: string;
            brand: string;
            model: string;
            type: string;
            count: number;
            monthlyRatePerMachine: number;
            billedUnitPrice: number;
            serials: string[];
          }
        >();
        for (const r of rentals) {
          const agreementNo = r.agreementNumber ?? '';
          const monthFactor = getMonthFactorForRental(r);
          const rms = Array.isArray(r.machines) ? r.machines : [];
          for (const rm of rms) {
            const brand = rm.machine?.brand?.name ?? 'Unknown';
            const model = rm.machine?.model?.name ?? 'Unknown';
            const mtype = rm.machine?.type?.name ?? '';
            const qty = typeof rm.quantity === 'number' ? rm.quantity : Number(rm.quantity) || 1;
            let daily = Number(rm.dailyRate) || 0;
            // Prefer catalog monthly rental fee when stored dailyRate implies a much lower monthly
            // (common when PO lines were seeded from purchase unitPrice instead of monthlyRentalFee).
            const catalogMonthly =
              rm.machine?.monthlyRentalFee != null ? Number(rm.machine.monthlyRentalFee) : NaN;
            if (Number.isFinite(catalogMonthly) && catalogMonthly > 0 && daily * 30 < catalogMonthly * 0.5) {
              daily = catalogMonthly / 30;
            }
            const monthlyPerMachine = daily * 30;
            const billedUnitPrice = round2(monthlyPerMachine * monthFactor);
            const key = `${agreementNo}|${brand}|${model}|${mtype}|${monthlyPerMachine}|${billedUnitPrice}`;
            if (!categoryMap.has(key)) {
              categoryMap.set(key, {
                agreementNumber: agreementNo,
                brand,
                model,
                type: mtype,
                count: 0,
                monthlyRatePerMachine: monthlyPerMachine,
                billedUnitPrice,
                serials: [],
              });
            }
            const cat = categoryMap.get(key)!;
            cat.count += qty;
            if (rm.machine?.serialNumber) {
              cat.serials.push(rm.machine.serialNumber);
            }
          }
        }

        let itemIndex = 0;
        machineLines = Array.from(categoryMap.values()).map((cat) => {
          const baseDesc = [cat.brand, cat.model, cat.type].filter(Boolean).join(' ').toUpperCase() || 'MACHINE';
          const desc = cat.agreementNumber ? `${baseDesc} (AGREEMENT ${cat.agreementNumber})` : baseDesc;
          return {
            description: desc,
            quantity: cat.count,
            // With rentalBilling: unitPrice = monthlyRate * monthFactor; otherwise monthlyRate (1 month).
            unitPrice: round2(cat.billedUnitPrice),
            machineId: null,
            brand: cat.brand,
            model: cat.model,
            type: cat.type,
            brandId: null,
            modelId: null,
            machineTypeId: null,
            itemCode: `212WG${String(++itemIndex).padStart(5, '0')}`,
            serialNumber: cat.serials.length > 0 ? cat.serials.join(', ') : undefined,
            vatRate: VAT_RATE,
          };
        });
      }

      const derivedToolLines: any[] = [];
      if (hasRentalBilling) {
        let toolIndex = 0;
        for (const r of rentals) {
          const monthFactor = getMonthFactorForRental(r);
          const agreementNo = r.agreementNumber ?? '';
          const rts = Array.isArray(r.tools) ? r.tools : [];
          for (const rt of rts) {
            const qty = typeof rt.quantity === 'number' ? rt.quantity : Number(rt.quantity) || 0;
            const monthlyUnit = Number(rt.unitPrice) || 0;
            if (qty <= 0 || monthlyUnit < 0) continue;
            const toolName = (rt.tool?.toolName ?? 'Tool').trim() || 'Tool';
            const toolType = (rt.tool?.toolType ?? '').trim();
            const baseDesc = [toolName, toolType].filter(Boolean).join(' - ').toUpperCase();
            const desc = agreementNo ? `${baseDesc} (AGREEMENT ${agreementNo})` : baseDesc;
            derivedToolLines.push({
              description: desc,
              quantity: qty,
              unitPrice: round2(monthlyUnit * monthFactor),
              machineId: null,
              brand: '',
              model: '',
              type: '',
              brandId: null,
              modelId: null,
              machineTypeId: null,
              itemCode: `212TL${String(++toolIndex).padStart(5, '0')}`,
              serialNumber: undefined,
              vatRate: VAT_RATE,
              kind: 'TOOL',
            });
          }
        }
      }

      finalLineItems = [...machineLines, ...(hasRentalBilling ? derivedToolLines : preservedToolLines)];

      if (!Array.isArray(machineLines) || machineLines.length === 0) {
        return validationErrorResponse(
          useClientMachineLines
            ? 'No machine line items were provided'
            : 'Unable to derive machine line items from rentals',
          {
            rentalId: rentalId ? ['Selected rental has no machines assigned to invoice'] : [],
            rentalIds: rentalIdsArray ? ['Selected rentals have no machines assigned to invoice'] : [],
            lineItems: useClientMachineLines ? ['Provide at least one machine line'] : [],
          }
        );
      }
    }

    // Enforce VAT vs NON_VAT totals for rental invoices, even when client provides line items/totals.
    // This protects machine-assign and any other client from accidentally adding VAT for INDIVIDUAL customers.
    const isRentalInvoice = Boolean(type === 'RENTAL' || rentalId || (rentalIdsArray && rentalIdsArray.length > 0));
    if (isRentalInvoice) {
      const shouldApplyVat = taxCategoryFromCustomerType === 'VAT';
      // Normalize line items vatRate so downstream UIs/exports don't show VAT on NON_VAT invoices.
      if (Array.isArray(finalLineItems)) {
        finalLineItems = finalLineItems.map((li: any) => ({
          ...li,
          vatRate: shouldApplyVat ? VAT_RATE : 0,
        }));
      }
      finalSubtotal = round2(
        Array.isArray(finalLineItems)
          ? finalLineItems.reduce(
              (sum: number, li: any) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
              0
            )
          : finalSubtotal
      );
      finalVatAmount = shouldApplyVat ? round2(finalSubtotal * VAT_RATE) : 0;
      finalGrandTotal = round2(finalSubtotal + finalVatAmount);
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
